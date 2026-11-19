import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Legal from "../src/legal_evidence.js";
import Core from "../src/upload_core.js";
import { exactCitation } from "../src/legal_dialog.mjs";
import { analyzeCase, caseRules } from "../src/case_analysis.mjs";
import { addEvidence, handoff, newCase } from "../src/case_workflow.mjs";

const pages = JSON.parse(readFileSync(process.argv[2] || "/tmp/medtech-gold-pdf-pages.json", "utf8"));
for (const [id, rule] of Object.entries(caseRules)) {
  const index = Core.chunkPages(pages[rule.sourceId]);
  const proof = exactCitation(index, rule, Legal);
  assert.ok(proof, id + " requires a passage from its official source");
  assert.ok(Legal.norm(pages[rule.sourceId].find(page => page.number === proof.page).text).includes(Legal.norm(proof.excerpt)));
  const altered = Core.chunkPages(pages[rule.sourceId].map(page => ({
    ...page, text: page.text.replace(new RegExp(rule.endPhrase.replaceAll(" ", "\\s+"), "g"), "Textänderung")
  })));
  assert.equal(exactCitation(altered, rule, Legal), null, id + " must refuse changed text");
}
const empty = { ...newCase("aed", "demo"), status: "analysis" };
const analysis = (checks, item = empty, isCurrent) => analyzeCase({ ...item, checks }, isCurrent);
const traced = value => ({ value, trace: "Übungsnachweis · Seite 2" });
assert.equal(analysis({}).next.key, "fault");
assert.equal(analysis({ fault: traced("no"), purpose: { value: "yes", trace: "" } }).rows.find(row => row.key === "purpose").state, "reported");
assert.equal(analysis({ purpose: traced("conflict") }).next.key, "purpose");

const base = { fault: traced("no"), purpose: traced("yes"), selftest: traced("yes"), visual: traced("yes") };
for (const [date, needsRemote] of [["2026-12-31", false], ["2027-01-01", true], ["2027-02-30", false], ["", false]]) {
  const result = analysis({ ...base, commissioned: traced(date) });
  assert.equal(result.rows.some(row => row.key === "remote"), needsRemote, date);
  if (!date || date.endsWith("02-30")) assert.equal(result.next.key, "commissioned");
}
assert.ok(analysis({ ...base, purpose: traced("no") }).rows.some(row => row.key === "stkRecord"));
assert.ok(analysis({ ...base, commissioned: traced("2026-04-19"), visual: traced("event") }).rows.some(row => row.key === "stkRecord"));
assert.ok(analysis({ ...base, commissioned: traced("2027-03-01"), remote: traced("no") }).rows.some(row => row.key === "stkRecord"));
const current = { ...base, commissioned: traced("2027-01-01"), remote: traced("yes") };
assert.equal(analysis(current).next.ruleId, "aed");
const proof = { ruleId: "aed", source: "MPBetreibV", hash: "current", section: caseRules.aed.reference, page: 6, excerpt: "Beleg" };
const oldPin = { ...proof, ruleId: undefined };
const item = addEvidence(addEvidence(empty, oldPin), proof);
assert.equal(item.evidence.length, 1);
assert.equal(analysis(current, item, pin => pin.hash === "current").next.ruleId, "remote");
assert.equal(analysis(current, item, pin => pin.hash === "superseded").next.ruleId, "aed");
const urgent = analysis({ ...current, fault: { value: "failed" } }, item);
assert.equal(urgent.urgent, true);
assert.equal(urgent.rules[0].id, "failed");
assert.match(urgent.draft.open, /dringend|sofort/i);
assert.match(handoff(item, urgent), /Angaben der Fachkraft/);
assert.match(handoff(item, urgent), /Selbsttest fehlgeschlagen/);
assert.ok(analyzeCase({ ...newCase("incident", "incident"), checks: { severity: traced("suspected") } }).urgent);
assert.equal(analyzeCase(newCase("repair", "repair")).next.key, "scope");
assert.equal(analyzeCase(newCase("stk", "stk")).next.key, "device");
assert.equal(analyzeCase(newCase("other", "other")), null);
assert.equal(analyzeCase({ kind: "aed", evidence: [] }).next.key, "fault");
console.log("PASS exact official PDF spans, date boundary, adverse events, evidence strength, stale snapshots and legacy cases");
