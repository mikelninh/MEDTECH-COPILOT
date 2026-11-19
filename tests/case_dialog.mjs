import assert from "node:assert/strict";
import fs from "node:fs";
import Core from "../src/upload_core.js";
import Legal from "../src/legal_evidence.js";
import { resolveDialog } from "../src/legal_dialog.mjs";
import { addEvidence, handoff, newCase, transition } from "../src/case_workflow.mjs";
import { synthesize } from "../src/local_synthesis.mjs";

const pages = JSON.parse(fs.readFileSync(process.argv[2] || "/tmp/medtech-gold-pdf-pages.json", "utf8")).mpbetreibv;
const index = Core.chunkPages(pages);
const stk = ["Wann ist eine STK fällig?", "§ 12 Abs. 1 S. 1–2"];
const aed = ["Gilt das auch für AEDs?", "§ 12 Abs. 2 S. 1"];
const repair = ["Was gilt nach einer Reparatur?", "§ 7 Abs. 4"];
const mtk = ["Wann ist eine MTK erforderlich?", "§ 15 Abs. 1"];
const book = ["Was gehört nach der Instandhaltung ins Medizinproduktebuch?", "§ 13 Abs. 2 Nr. 4–6"];
const sequences = [
  [stk, ["Welche Ausnahmen gibt es?", "§ 12 Abs. 1 S. 3"], aed, ["Was ändert sich ab 2027?", "§ 12 Abs. 2 S. 2–3"]],
  [stk, ["Wer ist verantwortlich?", "§ 12 Abs. 1 S. 1"]],
  [stk, ["Wer darf sie durchführen?", "§ 12 Abs. 4"]],
  [stk, ["Was steht im Protokoll?", "§ 12 Abs. 3 S. 1 Nr. 1"]],
  [stk, ["Gilt das für unseren Standort?", null], ["Welche Ausnahmen gibt es?", "§ 12 Abs. 1 S. 3"]],
  [repair, ["Wann ist danach eine MTK nötig?", "§ 15 Abs. 1"], ["Ab wann läuft die Frist?", "§ 15 Abs. 5 S. 1–3"]],
  [repair, ["Was gehört danach ins Medizinproduktebuch?", "§ 13 Abs. 2 Nr. 4–6"]],
  [book, ["Wie lange aufbewahren?", "§ 13 Abs. 3"]],
  [book, ["Was steht nach einer Instandhaltung darin?", "§ 13 Abs. 2 Nr. 4–6"]],
  [mtk, ["Was gilt nach einem Eingriff?", "§ 15 Abs. 5 S. 4"]],
  [stk, aed, ["Was gilt nach einer Reparatur?", "§ 7 Abs. 4"]],
  [mtk, ["Ab wann läuft die Frist?", "§ 15 Abs. 5 S. 1–3"]],
  [["Wann ist die STK dran?", "§ 12 Abs. 1 S. 1–2"], ["Gibt es Ausnahmen?", "§ 12 Abs. 1 S. 3"]],
  [["Wann können STK für selbsttestende AED entfallen?", "§ 12 Abs. 2 S. 1"], ["Und ab 2027?", "§ 12 Abs. 2 S. 2–3"]],
  [stk, mtk, ["Ab wann läuft die Frist?", "§ 15 Abs. 5 S. 1–3"]]
];
let total = 0;
for (const turns of sequences) {
  let context;
  for (const [question, expected] of turns) {
    const { result, context: next } = resolveDialog(index, "mpbetreibv", question, context, null, Legal);
    context = next;
    if (!expected) assert.equal(result.status, "unknown", question);
    else {
      assert.equal(result.status, "evidence", question);
      assert.equal(result.evidence[0].reference, expected, question);
      assert.equal(result.evidence.length, result.dialog.length);
      for (const ev of result.evidence) {
        assert.ok(Legal.norm(pages.find(page => page.number === ev.page).text).includes(Legal.norm(ev.excerpt)));
      }
    }
    total++;
  }
}
assert.equal(resolveDialog(index, "mpamiv", stk[0], null, null, Legal), null);
assert.equal(resolveDialog(index, "mpbetreibv", "Welche Ausnahmen gibt es?", null, null, Legal), null);
const incomplete = Core.chunkPages(pages.map(page => ({ ...page, text: page.text.replace("anlassbezogen erfolgen", "im Einzelfall") })));
assert.equal(resolveDialog(incomplete, "mpbetreibv", "Gilt das auch für AEDs?", { topic: "stk" }, null, Legal).result.status, "unknown");

const original = newCase("stk", "test-case");
assert.throws(() => transition(original, "analysis"), /Fakten/);
let item = transition({ ...original, title: "AED Eingangsbereich", facts: "Prüfnachweis derzeit nicht gefunden" }, "analysis");
assert.throws(() => transition(item, "closed"), /Statuswechsel/);
assert.throws(() => transition(item, "handoff"), /Einschätzung/);
item = { ...item, assessment: "Ausnahme hängt vom Gerätemodell ab", next: "Zweckbestimmung prüfen", owner: "Prüfteam" };
assert.throws(() => transition(item, "handoff"), /Beleg/);
const proof = { source: "MPBetreibV", page: 6, section: "§ 12", excerpt: "Selbsttest", hash: "a".repeat(64) };
item = addEvidence(item, proof);
assert.equal(addEvidence(item, proof), item);
item = transition(item, "handoff");
assert.throws(() => addEvidence(item, proof), /Analyse/);
assert.throws(() => transition(item, "closed"), /übernommen/);
item = transition({ ...item, resolution: "Das Prüfteam hat übernommen." }, "closed");
assert.match(handoff(item), /Das Prüfteam hat übernommen/);
assert.match(handoff(item), /SHA-256: a{64}/);
assert.equal(transition(item, "analysis").resolution, "");

const candidate = { page: 6, excerpt: "Die Kontrolle ist spätestens alle zwei Jahre erforderlich." };
const claim = { text: "Die Regel nennt höchstens zwei Jahre.", id: "1", quote: candidate.excerpt };
async function modelCheck(draft, verdict) {
  let calls = 0;
  let closed = 0;
  const model = { create: async () => ({ prompt: async () => JSON.stringify(calls++ ? verdict : { claims: [draft] }), destroy: () => closed++ }) };
  const result = await synthesize(model, { question: "Wann ist die Kontrolle fällig?", candidates: [candidate] });
  assert.equal(calls, closed);
  return { result, calls };
}
assert.equal((await modelCheck(claim, { supported: true })).result.length, 1);
assert.equal((await modelCheck(claim, { supported: false })).result, null);
assert.equal((await modelCheck({ ...claim, quote: "Die Kontrolle ist spätestens alle drei Jahre erforderlich." }, { supported: true })).calls, 1);
assert.equal((await modelCheck({ ...claim, id: "999" }, { supported: true })).result, null);
console.log(`PASS 15 Dialogverläufe, ${total} Fragen, Beleg- und Fassungsgrenzen, Fallübergänge und Modell-Gegenlesen.`);
