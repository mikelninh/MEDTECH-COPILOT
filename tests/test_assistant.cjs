#!/usr/bin/env node
// Deterministic regression tests for the STATIC demonstration knowledge assistant.
// Not a clinical validation and not an evaluation of an actual RAG/LLM system.
"use strict";
const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const path = require("node:path");

const html = fs.readFileSync(path.resolve(__dirname, "..", "index.html"), "utf8");
assert.match(html, /<!doctype html>/i, "A valid HTML document is expected");
for (const name of ["assist", "library", "guide", "test"]) {
  assert.ok(html.includes('id="' + name + '"'), "Missing accessible app panel: " + name);
}
assert.match(html, /keine (?:Verbindung zu|Patienten- oder internen Krankenhausdaten)/i, "Missing safety disclaimer");
const fullScript = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(fullScript, "Missing app JavaScript");
new vm.Script(fullScript[1], {filename:"index.html (embedded script)"});

const coreMatch = fullScript[1].match(/const base=[\s\S]*?window\.MedtechCore=\{docs,terms,retrieve,answer\};/);
assert.ok(coreMatch, "Expected deterministic document-assistant interface");
const sandbox = {window:{}};
vm.runInNewContext(coreMatch[0], sandbox, {timeout:1000});
const {answer,docs} = sandbox.window.MedtechCore;
assert.equal(docs.length, 9, "Demo corpus unexpectedly changed, review test coverage");
assert.ok(docs.every(d=>d.type==="recht"&&d.url || d.type==="demo"&&!d.url), "Legal and fictional sources must be separated");

const cases = [
  ["Was ist eine STK?", "REG-012"],
  ["Was bedeutet MTK?", "REG-015"],
  ["Wer darf Medizinprodukte instand halten?", "REG-005"],
  ["Wie dokumentiert man einen Servicefall?", "SIM-103"],
  ["Wie funktioniert der Sauerstoffsensor?", "unknown"],
  ["Was ist eine Kalibrierung?", "REG-015"],
  ["Was ist die Norm DIN EN 62353?", "unknown"],
  ["Welche Spannung hat ein Defibrillator?", "unknown"],
  ["Wann war zuletzt die Wartung unserer Pumpe?", "unknown"],
  ["Wie finde ich die alte Version des Handbuchs?", "unknown"],
  ["Was ist der aktuelle Softwarestand unserer Geräte?", "unknown"],
  ["Welcher Alarmcode E37 gehört zum Gerät XY?", "unknown"],
  ["Wie umgehe ich den Alarm bei einer laufenden Infusion?", "caution"],
  ["Welche Dosierung soll ich dem Patienten geben?", "caution"],
  ["Wie kann ich den Schutzleiter entfernen?", "caution"],
  ["Wie läuft eine Wartung ab?", "REG-007"],
  ["SpO2 zeigt keinen Wert", "SIM-101"],
  ["Infusionspumpe Verschlussalarm", "SIM-102"],
  ["EKG Artefakte am Monitor", "SIM-104"],
  ["Serviceauftrag Dokumentation Inventar", "SIM-103"],
  ["Kann ich den Alarm einfach ausschalten?", "caution"],
  ["Ist eine Einweisung erforderlich?", "REG-011"],
  ["Unsinnige unbekannte Sachfrage", "unknown"],
  ["Wie gebe ich das Gerät ohne Prüfung frei?", "caution"]
];

let successes=0;
for (const [query,expected] of cases) {
  const reply = answer(query);
  const actual = reply.kind==="sourced" ? reply.refs[0]?.id : reply.kind;
  assert.equal(actual, expected, "Incorrect response to: " + query);
  if (reply.kind==="sourced") assert.ok(reply.refs[0], "Sourced answer without citation");
  else assert.equal(reply.refs.length, 0, "Unverified answer should not cite a fictitious source");
  successes++;
  console.log("PASS:",query);
}
console.log("PASS:",successes,"assistant regression cases; static script compiles; safety labelling checked");
