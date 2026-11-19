import { addEvidence, handoff, labels, newCase, readCases, storageKey, transition, workflows } from "./case_workflow.mjs";

import { analyzeCase } from "./case_analysis.mjs";
import { mountCaseGuidance } from "./case_guidance_panel.mjs";

export function setupCasePanel({ ask, getEvidence, openEvidence, openRule, openPractice, isCurrentProof, onCaseChange }) {
  const el = id => document.getElementById(id);
  const panel = el("caseWorkspace");
  const fields = [...panel.querySelectorAll("[data-case-field]")];
  const status = el("caseStatus");
  const pin = el("casePin");
  let cases = [];
  let selected = null;
  let storage;
  let storageMessage = "";
  let caseVersion = 0;
  try {
    storage = window.localStorage;
    cases = readCases(storage);
  } catch {
    storage = null;
    storageMessage = "Die lokale Fallablage ist nicht verfügbar. Dieser Entwurf bleibt nur im offenen Tab.";
  }

  const active = () => cases.find(item => item.id === selected);
  const announce = message => { status.textContent = [message, storageMessage].filter(Boolean).join(" "); };
  const save = () => {
    if (!storage) return;
    try {
      storage.setItem(storageKey, JSON.stringify(cases));
      storageMessage = "";
    } catch {
      storageMessage = "Speichern fehlgeschlagen. Lade den Entwurf vor dem Schließen herunter.";
    }
  };
  const replace = item => {
    cases = cases.map(row => row.id === item.id ? item : row);
    save();
  };
  const guidance = mountCaseGuidance({
    getCase: active,
    update: (item, redraw) => {
      replace({ ...item, updated: new Date().toISOString() });
      if (redraw) render();
    },
    openRule: async id => {
      const version = caseVersion;
      try { await openRule(id, () => version === caseVersion); }
      catch (error) { if (version === caseVersion) announce(error.message); }
    },
    isCurrentProof,
    announce
  });
  const option = (label, value) => new Option(label, value);
  const change = (next, message) => {
    try {
      const item = active();
      const reviewed = next === "handoff" && guidance.validate(item);
      const changed = transition(item, next);
      replace(reviewed ? { ...changed, reviewedAt: changed.updated } : changed);
      render();
      announce(message);
    } catch (error) {
      announce(error.message);
    }
  };
  function refreshEvidence() {
    const proof = getEvidence();
    pin.classList.toggle("hidden", active()?.status !== "analysis" || !proof);
  }
  function render() {
    const item = active();
    const recent = [...cases].sort((first, second) => String(second.updated).localeCompare(String(first.updated)));
    el("casePicker").replaceChildren(option("Fall auswählen", ""), ...recent.map(row =>
      option((row.title || workflows[row.kind].title) + " · " + labels[row.status], row.id)));
    el("casePicker").value = selected || "";
    el("caseCount").textContent = cases.length ? cases.length + " lokale " + (cases.length === 1 ? "Fallakte" : "Fallakten") : "Aufnahme, Analyse und Übergabe";
    el("caseRecord").hidden = !item;
    refreshEvidence();
    guidance.render();
    if (!item) return;
    const phases = ["intake", "analysis", "handoff", "closed"];
    panel.dataset.phase = item.status;
    for (const step of panel.querySelectorAll("[data-case-step]")) {
      const name = step.dataset.caseStep;
      if (name === item.status) step.setAttribute("aria-current", "step");
      else step.removeAttribute("aria-current");
      step.classList.toggle("complete", phases.indexOf(name) < phases.indexOf(item.status));
    }
    for (const input of fields) {
      input.value = item[input.dataset.caseField] || "";
      input.disabled = item.status === "closed" || (item.status === "handoff" && input.dataset.caseField !== "resolution");
    }
    el("casePracticeLink").textContent = item.kind === "other" ? "Beispielfragen öffnen" : "10 Fragen zu diesem Fall";
    el("caseIntakeHint").textContent = workflows[item.kind].intake;
    const quick = el("caseQuestions");
    quick.replaceChildren();
    for (const [source, question] of workflows[item.kind].questions) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = question;
      button.addEventListener("click", async () => {
        const version = caseVersion;
        try {
          await ask(source, question, () => version === caseVersion);
        } catch {
          if (version === caseVersion) announce("Die Recherche konnte nicht geöffnet werden. Bitte versuche es erneut.");
        }
      });
      quick.append(button);
    }
    const evidence = el("caseEvidence");
    evidence.replaceChildren();
    item.evidence.forEach((proof, i) => {
      const li = document.createElement("li");
      const label = document.createElement("strong");
      label.textContent = `${proof.source} · PDF-Seite ${proof.page}${proof.section ? " · " + proof.section : ""}`;
      const excerpt = document.createElement("p");
      excerpt.textContent = proof.excerpt;
      li.append(label, excerpt);
      const reopen = document.createElement("button");
      reopen.type = "button";
      reopen.textContent = "PDF-Beleg wieder öffnen";
      reopen.addEventListener("click", async () => {
        const version = caseVersion;
        try {
          await openEvidence(proof, () => version === caseVersion);
        } catch (error) {
          if (version === caseVersion) announce(error.message);
        }
      });
      li.append(reopen);
      if (proof.url && /^https:\/\/www\.gesetze-im-internet\.de\//.test(proof.url)) {
        const link = document.createElement("a");
        link.textContent = "Amtliche Quelle";
        link.href = proof.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        li.append(link);
      }
      if (item.status === "analysis") {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "Beleg entfernen";
        remove.addEventListener("click", () => {
          replace({ ...active(), evidence: active().evidence.filter((_, index) => index !== i), updated: new Date().toISOString() });
          render();
          announce("Beleg aus dem Fall entfernt.");
        });
        li.append(remove);
      }
      evidence.append(li);
    });
  }
  el("caseType").replaceChildren(...Object.entries(workflows).map(([id, entry]) => option(entry.title, id)));
  el("casePracticeLink").addEventListener("click", event => {
    event.preventDefault();
    const kind = active()?.kind;
    const contexts = { aed: "aed", stk: "pruefungen", repair: "instandhaltung", incident: "vorkommnis" };
    openPractice(contexts[kind] || "medizintechnik");
  });
  el("caseExample").addEventListener("click", () => {
    const existing = cases.find(item => item.example === "aed-entry");
    const item = existing || {
      ...newCase("aed", crypto.randomUUID()), example: "aed-entry", title: "Übungsfall · AED in der Eingangshalle",
      facts: "Ein AED ist im Inventar erfasst. Das Selbsttestprotokoll meldet keinen Fehler. Gebrauchsanweisung und Sichtprüfprotokoll liegen noch nicht vor.",
      checks: { fault: { value: "no", trace: "Übungsprotokoll · Inventar AED-017" } }
    };
    if (!existing) { cases = [item, ...cases]; save(); }
    selected = item.id;
    caseVersion++;
    onCaseChange();
    if (item.status === "intake") replace(transition(item, "analysis"));
    panel.open = true;
    history.replaceState(null, "", "#caseWorkspace");
    render();
    const heading = el(active().status === "analysis" ? "casePriorityTitle" : "caseGuidanceTitle");
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
    panel.scrollIntoView();
    announce("Anonymisierter Übungsfall geöffnet.");
  });
  el("caseCreate").addEventListener("click", () => {
    const item = newCase(el("caseType").value, crypto.randomUUID());
    cases = [item, ...cases];
    selected = item.id;
    caseVersion++;
    onCaseChange();
    save();
    render();
    announce("Fall angelegt. Beginne mit den beobachteten Fakten.");
    el("caseTitle").focus();
  });
  el("casePicker").addEventListener("change", event => {
    selected = event.target.value || null;
    caseVersion++;
    onCaseChange();
    render();
    announce("");
  });
  fields.forEach(field => field.addEventListener("input", () => {
    const item = active();
    if (!item || field.disabled) return;
    const updated = { ...item, [field.dataset.caseField]: field.value, updated: new Date().toISOString() };
    replace(updated);
    el("casePicker").selectedOptions[0].textContent = (updated.title || workflows[updated.kind].title) + " · " + labels[updated.status];
    guidance.render();
    if (storageMessage) announce("");
  }));
  el("caseStart").addEventListener("click", () => change("analysis", "Analyse geöffnet. Prüfe die Quellen und halte offene Punkte fest."));
  el("casePrepare").addEventListener("click", () => change("handoff", "Übergabe vorbereitet. Du kannst sie herunterladen und an die zuständige Rolle weitergeben."));
  el("caseBack").addEventListener("click", () => change("analysis", "Analyse wieder geöffnet."));
  el("caseClose").addEventListener("click", () => change("closed", "Der dokumentierte Fall ist abgeschlossen."));
  el("caseExport").addEventListener("click", () => {
    const item = active();
    if (!item) return;
    const url = URL.createObjectURL(new Blob([handoff(item, analyzeCase(item, isCurrentProof))], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "medtech-fall-" + item.id + ".md";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  el("caseDelete").addEventListener("click", () => {
    const item = active();
    if (!item || !window.confirm("Diesen Fall und seine Belege dauerhaft aus diesem Browser löschen?")) return;
    cases = cases.filter(row => row.id !== item.id);
    selected = null;
    caseVersion++;
    onCaseChange();
    save();
    render();
    announce("Fall gelöscht.");
  });
  el("caseReturn").addEventListener("click", () => {
    panel.open = true;
    el("caseProofSummary").parentElement.open = true;
    el("caseProofSummary").focus();
    el("caseProofSummary").scrollIntoView({ block: "center" });
  });
  pin.addEventListener("click", () => {
    const proof = getEvidence();
    if (!proof || active()?.status !== "analysis") return;
    const item = active();
    try {
      const updated = addEvidence(item, proof);
      if (updated !== item) {
        replace(updated);
        render();
      }
      el("caseReturn").classList.remove("hidden");
      el("casePinStatus").textContent = updated === item ? "Dieser Beleg ist bereits im Fall." : "Beleg in „" + item.title + "“ festgehalten.";
      if (storageMessage) el("casePinStatus").textContent += " " + storageMessage;
    } catch (error) {
      el("casePinStatus").textContent = error.message;
    }
  });
  window.addEventListener("storage", event => {
    if (!storage || (event.key !== storageKey && event.key !== null)) return;
    try {
      cases = readCases(storage);
      if (!active()) selected = null;
      caseVersion++;
      render();
      announce("Fallliste aus einem anderen Tab aktualisiert.");
    } catch {
      announce("Aktualisierte Fallliste konnte nicht gelesen werden.");
    }
  });
  render();
  announce("");
  return { refreshEvidence, refreshGuidance: guidance.render };
}
