export const storageKey = "medtech-cases-v1";

export const workflows = {
  stk: {
    title: "STK und Prüffrist",
    questions: [
      ["mpbetreibv", "Wie oft ist eine sicherheitstechnische Kontrolle (STK) fällig?"],
      ["mpbetreibv", "Wann können STK für selbsttestende AED entfallen?"],
      ["mpbetreibv", "Was muss im Protokoll einer STK stehen?"]
    ],
    intake: "Gerätetyp, letzte Prüfung oder Inbetriebnahme, Einsatzort und vorliegendes Protokoll."
  },
  incident: {
    title: "Vorkommnis beurteilen",
    questions: [
      ["mpamiv", "Wann muss ein mutmaßlich schwerwiegendes Vorkommnis gemeldet werden?"],
      ["mpbetreibv", "Welche Aufgaben hat der Beauftragte für Medizinproduktesicherheit?"]
    ],
    intake: "Was wurde wann beobachtet? Welche Angaben oder Nachweise fehlen? Bitte anonymisieren."
  },
  repair: {
    title: "Rückkehr aus der Instandhaltung",
    questions: [
      ["mpbetreibv", "Was muss nach einer Reparatur geprüft werden?"],
      ["mpbetreibv", "Wann sind messtechnische Kontrollen (MTK) erforderlich?"],
      ["mpbetreibv", "Was gehört nach der Instandhaltung ins Medizinproduktebuch?"]
    ],
    intake: "Betroffenes Produkt, Umfang der Arbeiten, Servicebericht und verfügbare Prüfnachweise."
  },
  other: { title: "Eigener Recherchefall", questions: [], intake: "Gerät oder Thema, beobachteter Sachverhalt und deine konkrete Frage." }
};

export function readCases(storage) {
  const saved = JSON.parse(storage.getItem(storageKey) ?? "[]");
  if (!Array.isArray(saved) || saved.some(item => !item || typeof item.id !== "string" ||
    !Object.hasOwn(workflows, item.kind) || !Array.isArray(item.evidence) || !Array.isArray(item.activity))) {
    throw new Error("Die lokale Fallliste ist beschädigt.");
  }
  return saved;
}

export function newCase(kind, id, date = new Date().toISOString()) {
  return {
    id, kind, status: "intake", title: "", facts: "", open: "", assessment: "",
    next: "", owner: "", due: "", resolution: "", evidence: [],
    activity: [{ status: "intake", date }], updated: date
  };
}

export function transition(item, status, date = new Date().toISOString()) {
  const requireFields = (fields, message) => {
    if (fields.some(key => !item[key]?.trim())) throw new Error(message);
  };
  const allowed = { intake: ["analysis"], analysis: ["handoff"], handoff: ["analysis", "closed"], closed: ["analysis"] };
  if (!allowed[item.status]?.includes(status)) throw new Error("Dieser Statuswechsel ist in der aktuellen Phase nicht möglich.");
  if (status === "analysis") requireFields(["title", "facts"], "Ergänze zuerst einen Falltitel und die beobachteten Fakten.");
  if (status === "handoff") {
    requireFields(["assessment", "next", "owner"], "Halte deine Einschätzung, die nächste Handlung und die zuständige Rolle fest.");
    if (!item.evidence.length && !item.open.trim()) throw new Error("Füge einen geprüften Beleg hinzu oder dokumentiere die offene Beleglücke.");
  }
  if (status === "closed") requireFields(["resolution"], "Dokumentiere, wer den Fall übernommen hat und wie die offenen Punkte bearbeitet wurden.");
  return {
    ...item, status, updated: date,
    resolution: status === "analysis" ? "" : item.resolution,
    activity: [...item.activity, { status, date, note: status === "closed" ? item.resolution : "" }]
  };
}

export function addEvidence(item, evidence, date = new Date().toISOString()) {
  if (item.status !== "analysis") throw new Error("Öffne die Analyse, um einen Beleg hinzuzufügen.");
  if (item.evidence.some(pin => pin.hash === evidence.hash && pin.page === evidence.page && pin.excerpt === evidence.excerpt)) return item;
  if (item.evidence.length >= 30) throw new Error("Dieser Fall enthält bereits 30 Belege.");
  return { ...item, evidence: [...item.evidence, { ...evidence, date }], updated: date };
}

export const labels = { intake: "Aufnahme", analysis: "Analyse", handoff: "Übergabe vorbereitet", closed: "Abgeschlossen" };

export function handoff(item) {
  const notes = item.evidence.map((pin, i) => [
    `[${i + 1}] ${pin.source} · PDF-Seite ${pin.page}${pin.section ? " · " + pin.section : ""}`,
    pin.url, pin.edition && `Stand: ${pin.edition}`, `SHA-256: ${pin.hash}`,
    pin.excerpt, `Im Fall festgehalten: ${pin.date}`
  ].filter(Boolean).join("\n")).join("\n\n");
  const log = item.activity.map(entry => `- ${entry.date} · ${labels[entry.status]}${entry.note ? " · " + entry.note : ""}`).join("\n");
  return [
    `# ${item.title || workflows[item.kind].title}`,
    `${workflows[item.kind].title} · ${labels[item.status]}`,
    `## Beobachtete Fakten\n${item.facts || "Offen"}`,
    `## Fachliche Einschätzung\n${item.assessment || "Offen"}`,
    `## Offene Punkte\n${item.open || "Keine erfasst"}`,
    `## Nächste Handlung\n${item.next || "Offen"}\nZuständig: ${item.owner || "Offen"}\nTermin: ${item.due || "Offen"}`,
    `## Geprüfte Belege\n${notes || "Keine festgehalten"}`,
    item.resolution && `## Dokumentierter Abschluss\n${item.resolution}`,
    `## Fallverlauf\n${log}`
  ].filter(Boolean).join("\n\n") + "\n";
}
