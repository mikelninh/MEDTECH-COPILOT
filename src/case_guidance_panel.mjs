import { analyzeCase, checkLabels } from "./case_analysis.mjs";

const el = id => document.getElementById(id);
const node = (tag, text = "") => {
  const element = document.createElement(tag);
  element.textContent = text;
  return element;
};

export function mountCaseGuidance({ getCase, update, openRule, isCurrentProof, announce }) {
  const list = el("caseCheckList");
  const rows = new Map();
  let reviewed = "";
  let caseId;
  const snapshot = item => JSON.stringify([
    item.id, item.facts, item.checks, item.evidence, item.assessment, item.open, item.next, item.owner, item.due,
    analyzeCase(item, isCurrentProof)?.rules.map(rule => rule.proof?.hash || "")
  ]);
  const editable = item => item?.status === "analysis";
  const needsReview = item => item?.kind === "aed" || !!item?.draftFields;
  function updateCheck(key, field, value) {
    const item = getCase();
    if (!editable(item)) return;
    update({ ...item, checks: { ...item.checks, [key]: { ...item.checks?.[key], [field]: value } } });
    render();
  }
  function makeRow(row) {
    const entry = node("details");
    entry.className = "case-check";
    entry.dataset.check = row.key;
    const summary = node("summary");
    const label = node("span");
    label.className = "case-check-label";
    const value = node("small");
    label.append(node("strong", row.title), value);
    const badge = node("span");
    badge.className = "check-badge";
    summary.append(label, badge);
    const why = node("p", row.why);
    const control = node(row.date ? "input" : "select");
    if (row.date) control.type = "date";
    else control.append(new Option("Noch offen", ""), ...Object.entries(row.options).map(([value, label]) => new Option(label, value)));
    const stateLabel = node("label", row.date ? "Dokumentiertes Datum" : "Was ergibt der Abgleich?");
    stateLabel.append(control);
    const trace = node("input");
    trace.maxLength = 180;
    trace.placeholder = "z. B. Geräteakte · Protokoll vom 12.11.2026";
    const traceLabel = node("label", "Wo steht das?");
    traceLabel.append(trace);
    control.addEventListener("change", () => updateCheck(row.key, "value", control.value));
    trace.addEventListener("input", () => updateCheck(row.key, "trace", trace.value));
    const body = node("div");
    body.className = "case-check-body";
    body.append(why, stateLabel, traceLabel);
    entry.append(summary, body);
    return { entry, badge, control, trace, value };
  }
  function render() {
    const item = getCase();
    const analysis = item && analyzeCase(item, isCurrentProof);
    el("caseGuidance").hidden = !analysis;
    if (!analysis) return;
    if (caseId !== item.id) {
      caseId = item.id;
      rows.clear();
      list.replaceChildren();
    }
    const next = el("casePriority");
    next.hidden = !editable(item);
    next.dataset.urgent = String(analysis.urgent);
    el("caseAnalysisStatus").textContent = editable(item) ? analysis.status : "";
    el("casePriorityTitle").textContent = analysis.next.title;
    el("casePriorityWhy").textContent = analysis.next.why;
    el("casePriorityAction").textContent = analysis.next.action;
    const go = el("casePriorityGo");
    go.hidden = !editable(item) || !(analysis.next.key || analysis.next.ruleId);
    go.textContent = analysis.next.key ? "Nachweis erfassen" : "Original-PDF öffnen";
    const visibleKeys = new Set(analysis.rows.map(row => row.key));
    for (const [key, parts] of rows) {
      if (!visibleKeys.has(key)) { parts.entry.remove(); rows.delete(key); }
    }
    analysis.rows.forEach((row, i) => {
      if (!rows.has(row.key)) rows.set(row.key, makeRow(row));
      const { entry, badge, control, trace, value } = rows.get(row.key);
      if (list.children[i] !== entry) list.insertBefore(entry, list.children[i] || null);
      badge.dataset.state = row.state;
      badge.textContent = checkLabels[row.state];
      value.textContent = row.state === "missing" ? "" : row.label || "";
      value.hidden = !value.textContent;
      if (control.value !== row.value) control.value = row.value;
      if (trace.value !== row.trace) trace.value = row.trace;
      control.disabled = trace.disabled = !editable(item);
    });
    const sources = el("caseRuleList");
    sources.replaceChildren(...analysis.rules.map(rule => {
      const row = node("li", (rule.sourceId === "mpamiv" ? "MPAMIV " : "MPBetreibV ") + rule.reference);
      const button = node("button", rule.proof ? "Festgehaltenen Beleg öffnen" : "Im Original prüfen");
      button.type = "button";
      button.addEventListener("click", () => openRule(rule.id));
      row.append(button);
      return row;
    }));
    el("caseDraftText").textContent = [
      "Vorläufige Einschätzung\n" + analysis.draft.assessment,
      "Nächste Handlung\n" + analysis.draft.next,
      analysis.draft.open && "Offene Punkte\n" + analysis.draft.open
    ].filter(Boolean).join("\n\n");
    el("caseAdoptDraft").hidden = !editable(item);
    el("caseReviewLabel").hidden = !editable(item) || !needsReview(item);
    el("caseReviewed").checked = reviewed === snapshot(item);
  }
  el("casePriorityGo").addEventListener("click", () => {
    const item = getCase();
    if (!editable(item)) return;
    const { next } = analyzeCase(item, isCurrentProof);
    if (next.ruleId) void openRule(next.ruleId);
    else if (next.key) {
      const row = rows.get(next.key);
      row.entry.open = true;
      row.control.focus();
    }
  });
  el("caseAdoptDraft").addEventListener("click", () => {
    const item = getCase();
    if (!editable(item)) return;
    const { draft } = analyzeCase(item, isCurrentProof);
    const draftFields = { ...item.draftFields };
    const updates = {};
    for (const field of Object.keys(draft)) {
      if (!item[field]?.trim() || item[field] === draftFields[field]) {
        updates[field] = draft[field];
        draftFields[field] = draft[field];
      }
    }
    if (!Object.keys(updates).length) {
      announce("Deine vorhandenen Einträge bleiben erhalten.");
      return;
    }
    update({ ...item, ...updates, draftFields }, true);
    announce("Entwurf in die Übergabe übernommen. Eigene Einträge bleiben erhalten.");
  });
  el("caseReviewed").addEventListener("change", event => {
    const item = getCase();
    if (editable(item)) reviewed = event.target.checked ? snapshot(item) : "";
  });
  return {
    render,
    validate(item) {
      const analysis = analyzeCase(item, isCurrentProof);
      if (analysis && Object.entries(item.draftFields || {}).some(([key, text]) => item[key] === text && analysis.draft[key] !== text))
        throw new Error("Der Entwurf beruht auf einem älteren Fallstand. Übernimm den aktuellen Entwurf oder aktualisiere die Übergabefelder.");
      if (needsReview(item) && reviewed !== snapshot(item)) throw new Error("Bestätige die fachliche Prüfung der aktuellen Übergabe.");
      if (needsReview(item) && analysis?.urgent && !item.open.trim())
        throw new Error("Halte den offenen dringenden Sachverhalt in der Übergabe fest.");
      return needsReview(item);
    }
  };
}
