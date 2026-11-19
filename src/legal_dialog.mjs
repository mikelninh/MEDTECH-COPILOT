const section = {
  stk: "§ 12 Sicherheitstechnische Kontrollen",
  repair: "§ 7 Instandhaltung von Produkten",
  book: "§ 13 Medizinproduktebuch",
  inventory: "§ 14 Bestandsverzeichnis",
  mtk: "§ 15 Messtechnische Kontrollen",
  training: "§ 11 Betreiben und Benutzen von ausgewählten aktiven Produkten"
};
const definition = (topic, paragraph, proofPhrase, text, endPhrase) => ({
  sectionMarker: section[topic], proofPhrase, endPhrase, reference: section[topic].split(" ").slice(0, 2).join(" ") + " " + paragraph, text
});

const stkRule = definition("stk", "Abs. 1 S. 1–2", "Der Betreiber hat für Produkte nach Anlage 1",
  "Die reguläre STK-Frist endet spätestens mit Ablauf des Monats, in dem sich Inbetriebnahme oder letzte STK zum zweiten Mal jährt. Der Betreiber führt die Kontrolle durch oder lässt sie durchführen.", "letzte sicherheitstechnische Kontrolle durchgeführt wurde");
const early = definition("stk", "Abs. 1 S. 3", "zu einem früheren Zeitpunkt mit Mängeln zu rechnen",
  "Lassen die konkreten Benutzungs- oder Umgebungsbedingungen frühere Mängel erwarten, muss der Betreiber die Kontrolle rechtzeitig vorziehen.", "sicherheitstechnische Kontrollen durchzuführen oder durchführen zu lassen");
const aed = definition("stk", "Abs. 2 S. 1", "Abweichend von Absatz 1 können für Automatische Externe Defibrillatoren",
  "Bei einem für Laien vorgesehenen AED kann die STK entfallen, wenn er selbsttestend ist und der Betreiber regelmäßig eine Sichtprüfung durchführt.", "regelmäßige Sichtprüfung durch den Betreiber erfolgt");
const remote = definition("stk", "Abs. 2 S. 2–3", "Ab dem 1. Januar 2027 gilt",
  "Für ab 1. Januar 2027 neu in Betrieb genommene Laien-AEDs kommt hinzu, dass sie Selbsttests dokumentieren und die Ergebnisse automatisch regelmäßig per Fernüberwachung an den Betreiber übermitteln. Unter diesen Voraussetzungen kann die Sichtprüfung je nach Ergebnis anlassbezogen erfolgen.", "anlassbezogen erfolgen");
const repairCheck = definition("repair", "Abs. 4", "Nach der Instandhaltung müssen",
  "Nach der Instandhaltung sind die für Sicherheit und Funktionsfähigkeit wesentlichen Merkmale zu prüfen, soweit die Arbeiten sie beeinträchtigt haben können.", "durch die Maßnahmen beeinträchtigt werden können");
const mtkTrigger = definition("mtk", "Abs. 5 S. 4", "Messtechnische Kontrollen sind unverzüglich durchzuführen",
  "Für Produkte im Anwendungsbereich der MTK ist eine unverzügliche Kontrolle erforderlich, wenn Anzeichen für eine Überschreitung der Fehlergrenzen vorliegen oder ein Eingriff die messtechnischen Eigenschaften beeinflusst haben könnte.", "beeinflusst worden sein könnten");
const bookEntries = definition("book", "Abs. 2 Nr. 4–6", "Datum von Instandhaltungen",
  "Für buchpflichtige Produkte sind unter anderem das Datum der Instandhaltung und die Person oder Firma festzuhalten, die sie durchgeführt hat. Die Norm nennt auch vorgeschriebene Kontrollen, bestimmte Funktionsstörungen und Vorkommnismeldungen.");

const answers = {
  stk: [stkRule, early],
  stkExceptions: [early, aed],
  aed: [aed, remote],
  aedRemote: [remote, aed],
  stkResponsible: [definition("stk", "Abs. 1 S. 1", "Der Betreiber hat für Produkte nach Anlage 1",
    "Der Betreiber ist für die Durchführung der STK verantwortlich. Er kann eine geeignete Stelle damit beauftragen.")],
  stkOwner: [definition("stk", "Abs. 4", "nur Personen, Betriebe oder Einrichtungen beauftragen",
    "Der Betreiber darf nur Personen, Betriebe oder Einrichtungen beauftragen, die selbst oder durch die ausführenden Beschäftigten die Voraussetzungen nach § 5 für das jeweilige Produkt erfüllen.")],
  stkRecord: [definition("stk", "Abs. 3 S. 1 Nr. 1", "über die sicherheitstechnische Kontrolle ein Protokoll anzufertigen",
    "Das STK-Protokoll enthält Datum, Ergebnisse, Messwerte, Messverfahren und sonstige Beurteilungsergebnisse.", "sonstiger Beurteilungsergebnisse enthält"),
    definition("stk", "Abs. 3 S. 2", "Das Protokoll nach Satz 1 Nummer 1 hat der Betreiber",
    "Der Betreiber bewahrt das Protokoll bis zur nächsten STK auf.", "bis zu den nächsten sicherheitstechnischen Kontrollen aufzubewahren")],
  repair: [repairCheck, mtkTrigger],
  mtk: [definition("mtk", "Abs. 1", "in der Anlage 2 aufgeführten Produkte",
    "Für Produkte nach Anlage 2 sind messtechnische Kontrollen vorgesehen. Die konkrete Frist hängt vom Eintrag in Anlage 2 ab."), mtkTrigger],
  mtkIntervention: [mtkTrigger],
  mtkSchedule: [definition("mtk", "Abs. 5 S. 1–3", "innerhalb der in Anlage 2 festgelegten Fristen",
    "Die in Anlage 2 genannte Frist beginnt mit Ablauf des Jahres der Inbetriebnahme oder der letzten MTK. Dieselbe Frist gilt für die Wiederholung."), mtkTrigger],
  book: [definition("book", "Abs. 1", "Anlagen 1 und 2 aufgeführten Produkte",
    "Die Buchpflicht betrifft Produkte nach Anlage 1 oder 2. Ausnahmen bestehen für elektronische Kompakt-Fieberthermometer, bestimmte nichtinvasive Blutdruckmessgeräte und die Fälle des § 3 Abs. 4."), bookEntries],
  bookEntries: [bookEntries],
  bookRetention: [definition("book", "Abs. 3", "während der Arbeitszeit zugänglich",
    "Das Medizinproduktebuch muss der benutzenden Person während der Arbeitszeit zugänglich sein. Nach der Außerbetriebnahme ist es fünf Jahre aufzubewahren.")],
  inventory: [definition("inventory", "Abs. 1", "alle aktiven nichtimplantierbaren Produkte",
    "Das Verzeichnis erfasst die aktiven nichtimplantierbaren Produkte der jeweiligen Betriebsstätte. Die Norm lässt die Aufnahme in einem anderweitig vorgeschriebenen Verzeichnis zu und nimmt die Fälle des § 3 Abs. 4 aus."),
    definition("inventory", "Abs. 2", "Bezeichnung, Art und Typ",
    "Erfasst werden unter anderem Bezeichnung, Art und Typ, Loscode oder Seriennummer, Anschaffungsjahr, Standort und betriebliche Zuordnung.")],
  training: [definition("training", "Abs. 1", "Funktionsprüfung unterzogen hat",
    "Für Produkte nach Anlage 1 nennt § 11 vor dem Betrieb eine Funktionsprüfung am Betriebsort und die Einweisung einer beauftragten Person. Die Vorschrift verweist auf eine Ausnahme in § 4 Abs. 3 Satz 3 Nr. 2."),
    definition("training", "Abs. 2–4", "sind zu belegen",
    "Die Funktionsprüfung und die Einweisung der beauftragten Person sind zu belegen. Für zur Benutzung durch Laien bestimmte Produkte gilt § 11 Abs. 2 nicht. Andere Einweisungspflichten bleiben unberührt.")]
};

const suggestions = {
  stk: ["Welche Ausnahmen gibt es?", "Wer darf sie durchführen?", "Was steht im Protokoll?"],
  aed: ["Was ändert sich ab 2027?", "Was gilt nach einer Reparatur?"],
  repair: ["Wann ist danach eine MTK nötig?", "Was gehört danach ins Medizinproduktebuch?"],
  mtk: ["Ab wann läuft die Frist?", "Was gilt nach einem Eingriff?"],
  book: ["Wie lange aufbewahren?", "Was steht nach einer Instandhaltung darin?"]
};
const faqTopics = { b04: "stk", b15: "aed", b11: "stk", b12: "stk", b03: "book", b09: "book", b05: "repair", b10: "mtk", b02: "training", b06: "inventory", b13: "inventory" };

function selectAnswer(q, topic, faqId) {
  const namesStk = /\bstk\b|sicherheitstechnische[nr]? kontroll/.test(q);
  const namesMtk = /\bmtk\b|messtechnische[nr]? kontroll/.test(q);
  const namesAed = /\baeds?\b|defibrillator/.test(q);
  const namesBook = /medizinproduktebuch/.test(q);
  const namesRepair = /reparatur|instandhaltung|eingriff/.test(q);
  const timing = /frist|wann|wie oft|intervall|fallig|turnus|ab wann|rythmus|rhythmus/.test(q);
  const carry = /^(?:und |gilt das|wie sieht es|was (?:gilt |steht |andert |gehort )?(?:danach|darin|dabei)|wie lange |ab wann |welche ausnahme|gibt es ausnahme|wer darf |wer ist verantwortlich|was steht im protokoll)/.test(q) || /^was gilt nach (?:einer reparatur|einem eingriff)$/.test(q);
  if (namesAed && (namesStk || topic === "stk" || topic === "aed" || /selbsttest|fernuberwachung|2027/.test(q))) return [/2027|fernuberwachung/.test(q) ? "aedRemote" : "aed", "aed"];
  if (namesMtk && (namesRepair || timing || faqId === "b10")) return [namesRepair ? "mtk" : /frist|jahres/.test(q) ? "mtkSchedule" : "mtk", "mtk"];
  if (namesBook && (namesRepair || /eintrag|angaben|dokumentier|gehort/.test(q))) return ["bookEntries", "book"];
  if (topic === "book" && namesRepair && /darin|eintrag|dokumentier/.test(q)) return ["bookEntries", "book"];
  if (topic === "mtk" && /eingriff/.test(q) && !namesStk) return ["mtkIntervention", "mtk"];
  if (namesRepair && /nach|pruf|kontroll/.test(q)) return ["repair", "repair"];
  if (namesStk || (topic === "stk" && carry)) {
    if (/ausnahme|abweich|entfall|kurzer|fruher/.test(q)) return ["stkExceptions", "stk"];
    if (/verantwortlich|zustandig/.test(q)) return ["stkResponsible", "stk"];
    if (/wer darf|berechtig|beauftragen|qualifikation/.test(q)) return ["stkOwner", "stk"];
    if (/protokoll|aufbewahren|nachweis/.test(q)) return ["stkRecord", "stk"];
    if (timing) return ["stk", "stk"];
  }
  if (topic === "aed" && /2027|fernuberwachung/.test(q) && (carry || /^was andert sich ab /.test(q))) return ["aedRemote", "aed"];
  if (topic === "mtk" && carry && timing) return ["mtkSchedule", "mtk"];
  if ((namesBook || (topic === "book" && carry)) && /aufbewahr|archivier|wie lange/.test(q)) return ["bookRetention", "book"];
  if (namesBook && /welche|wer muss|buchpflicht/.test(q) && !faqId) return ["book", "book"];
  return [null, faqTopics[faqId] || null, carry];
}

export function exactCitation(index, claim, legal){
  const citation = legal.locate(index, claim);
  if (!citation || !claim.endPhrase) return citation;
  const page = index.pageTexts.find(item => item.number === citation.page);
  const original = page.text.replace(/\s+/g, " ");
  const lower = original.toLowerCase();
  const start = lower.indexOf(claim.proofPhrase.toLowerCase());
  const end = lower.indexOf(claim.endPhrase.toLowerCase(), start + claim.proofPhrase.length);
  if (start < 0 || end < 0 || end - start > 900) return null;
  const endOffset = end + claim.endPhrase.length;
  const excerpt = original.slice(start, /[.?!]/.test(original[endOffset] || "") ? endOffset + 1 : endOffset);
  return { ...citation, excerpt };
}

export function resolveDialog(index, sourceId, question, prior, faqId, legal) {
  if (sourceId !== "mpbetreibv") return null;
  const query = legal.norm(question);
  const [id, topic, carry] = selectAnswer(query, prior?.topic, faqId);
  const context = topic ? { topic, suggestions: suggestions[topic] || [] } : null;
  if (!id) {
    if (prior?.topic && carry && !faqId) return { context: prior, result: {
      status: "unknown", reason: "Diese Rückfrage konnte ich dem bisherigen Thema nicht eindeutig zuordnen. Nenne bitte den Gerätetyp, die Norm oder den konkreten Punkt.", evidence: []
    }};
    return context ? { context } : null;
  }
  const claims = answers[id].map(claim => {
    const evidence = exactCitation(index, claim, legal);
    return evidence && { text: claim.text, evidence: { ...evidence, reference: claim.reference } };
  });
  if (claims.some(claim => !claim)) return { context, result: {
    status: "unknown", reason: "Für diese Einordnung fehlt mindestens eine Belegstelle in der gewählten PDF-Fassung. Prüfe die amtliche Quelle.", evidence: []
  }};
  return { context, result: {
    status: "evidence", reason: "Die Einordnung bezieht sich auf die ausgewählte PDF-Fassung.",
    evidence: claims.map(claim => claim.evidence), dialog: claims
  }};
}
