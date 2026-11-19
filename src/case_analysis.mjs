const recorded = { yes: "Dokumentiert", conflict: "Widersprüchlich" };
const answer = { yes: "Ja", no: "Nein", conflict: "Widersprüchlich" };
const step = (title, why, action, options = recorded) => ({ title, why, action, options });
const commissioning = step("Datum der Inbetriebnahme", "Davon hängt ab, welcher Nachweis zur Fernüberwachung relevant ist.", "Inbetriebnahmeprotokoll oder Geräteakte prüfen.");
const visual = step("Sichtprüfung durch den Betreiber", "Die Art und der Nachweis der Sichtprüfung gehören zur Prüfung der AED-Ausnahme.", "Sichtprüfprotokoll mit dem Betreiber abgleichen.");
const checksByKind = {
  aed: {
    fault: step("Fehlgeschlagener Selbsttest", "Ein gemeldeter Fehler hat Vorrang vor der Prüfung einer STK-Ausnahme.", "Selbsttestprotokoll prüfen und Status dokumentieren.", {
      no: "Kein Fehler im geprüften Protokoll", failed: "Selbsttest fehlgeschlagen", conflict: "Widersprüchlich"
    }),
    purpose: step("Für die Benutzung durch Laien vorgesehen", "Die Zweckbestimmung entscheidet, ob die AED-Ausnahme überhaupt geprüft werden kann.", "Zweckbestimmung in der Gebrauchsanweisung für das konkrete Modell nachsehen.", answer),
    selftest: step("Selbsttestfunktion vorhanden", "Die Fähigkeit zum Selbsttest gehört zur Prüfung der AED-Ausnahme.", "Selbsttestfunktion in der Herstellerdokumentation für das Modell nachsehen.", answer),
    commissioned: { ...commissioning, date: true },
    remote: step("Fernüberwachung dokumentiert", "Bei der Prüfung zählen Dokumentation und regelmäßige automatische Übermittlung der Selbsttestergebnisse an den Betreiber.", "Fernüberwachungsprotokoll und Übermittlung an den Betreiber prüfen.", answer),
    visual: { ...visual, options: { yes: "Regelmäßige Sichtprüfung dokumentiert", event: "Anlassbezogene Sichtprüfung dokumentiert", no: "Sichtprüfung fehlt", conflict: "Widersprüchlich" } },
    stkRecord: step("Nachweis zur regulären STK", "Wenn die Ausnahme nicht greift oder nicht belegt ist, braucht die Fachkraft die Unterlagen für die reguläre STK-Prüfung.", "Letztes STK-Protokoll oder Inbetriebnahmebeleg für die fachliche Prüfung zusammentragen.")
  },
  stk: {
    device: step("Produkt und Anwendungsbereich", "Modell und Einordnung bestimmen, welche STK-Regel für diesen Fall zu prüfen ist.", "Gerätemodell und Anwendungsbereich anhand der Geräteakte nachvollziehen."),
    last: step("Letzte STK oder Inbetriebnahme", "Die Fachkraft braucht das dokumentierte Ausgangsdatum für die Fristprüfung.", "Letztes STK- oder Inbetriebnahmeprotokoll heranziehen."),
    conditions: step("Benutzungs- und Umgebungsbedingungen", "Die konkreten Bedingungen können eine frühere Kontrolle erforderlich machen.", "Einsatzbedingungen und Hinweise auf frühere Mängel mit der Fachkraft abgleichen.")
  },
  incident: {
    severity: step("Verdacht auf schwerwiegendes Vorkommnis", "Die Einordnung beeinflusst die Dringlichkeit der fachlichen Meldeprüfung.", "Die zuständige Stelle zur Einordnung des Verdachts einbinden.", {
      suspected: "Verdacht erfasst", no: "Fachlich geprüft, derzeit kein Verdacht", conflict: "Widersprüchlich"
    }),
    event: step("Zeitpunkt und beobachteter Ablauf", "Eine nachvollziehbare Chronologie trennt Beobachtungen von Vermutungen.", "Ablauf und Zeitpunkt aus der Ereignisdokumentation zusammentragen."),
    product: step("Betroffenes Produkt", "Die Gerätezuordnung hilft der zuständigen Stelle, den Sachverhalt zu prüfen.", "Modell und Zuordnung anonymisiert in der Akte erfassen.")
  },
  repair: {
    scope: step("Arbeitsumfang aus dem Servicebericht", "Der Eingriff bestimmt, welche Merkmale betroffen sein können.", "Servicebericht und betroffene Komponenten abgleichen."),
    check: step("Sicherheits- und Funktionsprüfung", "Die Fachkraft braucht die Ergebnisse zu den möglicherweise beeinträchtigten Merkmalen.", "Prüfprotokoll zu den betroffenen Merkmalen heranziehen."),
    measuring: step("Möglicher Einfluss auf Messfunktionen", "Eine mögliche Auswirkung auf die Messfunktion gehört zur fachlichen MTK-Prüfung.", "Den Einfluss auf Messfunktionen mit dem Prüfteam anhand des Eingriffs klären.", answer)
  }
};

export const caseRules = {
  aed: { sourceId: "mpbetreibv", reference: "§ 12 Abs. 2 S. 1", sectionMarker: "§ 12 Sicherheitstechnische Kontrollen",
    proofPhrase: "Abweichend von Absatz 1 können für Automatische Externe Defibrillatoren", endPhrase: "eine regelmäßige Sichtprüfung durch den Betreiber erfolgt" },
  remote: { sourceId: "mpbetreibv", reference: "§ 12 Abs. 2 S. 2–3", sectionMarker: "§ 12 Sicherheitstechnische Kontrollen",
    proofPhrase: "Ab dem 1. Januar 2027 gilt", endPhrase: "anlassbezogen erfolgen" },
  failed: { sourceId: "mpbetreibv", reference: "§ 12 Abs. 2 letzter Satz", sectionMarker: "§ 12 Sicherheitstechnische Kontrollen",
    proofPhrase: "muss sicherstellen, dass nach einem fehlgeschlagenen Selbsttest", endPhrase: "unverzüglich wiederhergestellt wird" },
  stk: { sourceId: "mpbetreibv", reference: "§ 12 Abs. 1", sectionMarker: "§ 12 Sicherheitstechnische Kontrollen",
    proofPhrase: "Der Betreiber hat für Produkte nach Anlage 1", endPhrase: "gelten die Sätze 1 bis 3 entsprechend" },
  incident: { sourceId: "mpamiv", reference: "§ 3", sectionMarker: "§ 3 Meldepflicht",
    proofPhrase: "Wer Produkte beruflich oder gewerblich betreibt", endPhrase: "unverzüglich der zuständigen Bundesoberbehörde zu melden" },
  repair: { sourceId: "mpbetreibv", reference: "§ 7 Abs. 4", sectionMarker: "§ 7 Instandhaltung von Produkten",
    proofPhrase: "Nach der Instandhaltung müssen", endPhrase: "durch die Maßnahmen beeinträchtigt werden können" }
};

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function analyzeCase(item, isCurrentProof = () => false) {
  const definitions = checksByKind[item.kind];
  if (!definitions) return null;
  const checks = item.checks || {};
  const value = key => checks[key]?.value || "";
  const supported = key => !!checks[key]?.trace?.trim();
  const known = key => supported(key) && value(key) !== "conflict";
  let keys = Object.keys(definitions);
  let ruleIds = [item.kind];
  let urgent;
  let note = "Die erfassten Angaben werden für die fachliche Beurteilung zusammengestellt.";
  if (item.kind === "aed") {
    const outside = ["purpose", "selftest"].some(key => known(key) && value(key) === "no");
    const remote = known("commissioned") && validDate(value("commissioned")) && value("commissioned") >= "2027-01-01";
    keys = ["fault", "purpose", "selftest", "commissioned"];
    if (outside) {
      keys = ["fault", "purpose", "selftest", "stkRecord"];
      ruleIds = ["aed", "stk"];
      note = "Mindestens eine dokumentierte Voraussetzung der AED-Ausnahme ist nicht erfüllt. Die reguläre STK ist fachlich zu prüfen.";
    } else {
      if (remote) keys.push("remote");
      keys.push("visual");
      if (known("visual") && (value("visual") === "no" || (value("visual") === "event" && !remote))
        || remote && known("remote") && value("remote") === "no") {
        keys.push("stkRecord");
        ruleIds.push("stk");
        note = "Die erfassten Nachweise reichen für eine fachliche Bestätigung der Ausnahme noch nicht aus.";
      }
      if (remote) ruleIds.splice(1, 0, "remote");
    }
    if (value("fault") === "failed") {
      urgent = { title: "Gemeldeten Selbsttestfehler sofort weitergeben", why: "Der gemeldete Fehler hat Vorrang vor der Frage zur Prüffrist.",
        action: "Zuständige Medizintechnik unverzüglich über den gemeldeten Selbsttestfehler informieren.", ruleId: "failed" };
      ruleIds.unshift("failed");
    }
  }
  if (item.kind === "incident" && value("severity") === "suspected") urgent = {
    title: "Verdacht unverzüglich an die zuständige Stelle geben", why: "Die zuständige Stelle muss den gemeldeten Verdacht fachlich einordnen und die Meldepflicht prüfen.",
    action: "Zuständige Stelle unverzüglich mit dem dokumentierten Verdacht befassen.", ruleId: "incident"
  };

  const rows = keys.map(key => {
    const definition = definitions[key];
    const answer = value(key);
    const valid = definition.date ? validDate(answer) : Object.hasOwn(definition.options, answer);
    const state = answer === "conflict" ? "conflict" : !valid ? "missing" : supported(key) ? "documented" : "reported";
    return { key, ...definition, state, value: answer, trace: checks[key]?.trace || "", label: definition.date ? answer : definition.options[answer] };
  });
  const rules = ruleIds.map(id => {
    const proof = item.evidence.find(pin => pin.ruleId === id && isCurrentProof(pin, caseRules[id]));
    return { id, ...caseRules[id], proof };
  });
  const missing = rows.filter(row => row.state !== "documented");
  const first = missing.find(row => row.state === "conflict") || missing[0];
  const unpinned = rules.filter(rule => !rule.proof);
  const next = urgent || first || (unpinned.length ? {
    title: "Rechtsgrundlage im Original prüfen", why: "Die Fallangaben und die amtliche Quelle werden getrennt festgehalten.",
    action: "Fundstelle " + unpinned[0].reference + " im Original prüfen.", ruleId: unpinned[0].id
  } : {
    title: "Fachliche Entscheidung dokumentieren", why: "Die Unterlagen stehen für die Beurteilung durch die zuständige Fachkraft bereit.",
    action: "Fallunterlagen fachlich beurteilen und Entscheidung dokumentieren."
  });
  const status = urgent ? "Dringend weitergeben" : (missing.length || unpinned.length) ? "Prüfung offen" : "Bereit zur fachlichen Prüfung";
  const open = [
    ...(urgent ? [urgent.title + " · Bearbeitung durch die zuständige Stelle offen"] : []),
    ...missing.map(row => row.title + " · " + checkLabels[row.state]),
    ...unpinned.map(rule => rule.reference + " · Rechtsquelle noch nicht festgehalten")
  ];
  return {
    rows, rules, next, status, urgent: !!urgent,
    draft: {
      assessment: (urgent ? urgent.why : note) + " Die fachliche Entscheidung steht aus.",
      next: next.action,
      open: open.join("\n")
    }
  };
}

export const checkLabels = { missing: "Fehlt", reported: "Angabe ohne Nachweis", documented: "Nachweis angegeben", conflict: "Widerspruch" };
