#!/usr/bin/env node
/* MEDTECH COPILOT v0.2 contract checks — demo behavior, NOT clinical validation. */
"use strict";
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"styles.css"),"utf8");
const app=fs.readFileSync(path.join(root,"src","app.js"),"utf8");
const source=fs.readFileSync(path.join(root,"src","knowledge.js"),"utf8");
const K=require(path.join(root,"src","knowledge.js"));
assert.match(html,/<!doctype html>/i);
assert.match(html,/<html lang="de">/);
assert.match(html,/<meta name="viewport"/);
assert.match(html,/<script defer src="\.\/src\/knowledge\.js"><\/script>/);
assert.match(html,/<script defer src="\.\/src\/app\.js"><\/script>/);
assert.match(html,/Keine UKB-Anbindung/i);
assert.match(html,/Keine Patientendaten/i);
assert.match(html,/Glasses Preview/);
assert.match(html,/id="privacyDialog"/);
assert.doesNotMatch(css,/@import url\(/i,"Third-party font request found");
for(const id of ["home","ask","field","library","lab"])assert.ok(html.includes('id="screen-'+id+'"'),"Screen missing: "+id);
for(const id of ["askForm","fieldDevice","messages","sourceInspector","libraryList","demoList","runChecks","glassSpeak"])
 assert.ok(html.includes('id="'+id+'"'),"UI element missing: "+id);
new vm.Script(app,{filename:"src/app.js"});
new vm.Script(source,{filename:"src/knowledge.js"});
const cases=[
 ["STK §12","Was ist eine STK?","LAW-12"],
 ["MTK §15","Was bedeutet MTK?","LAW-15"],
 ["Instandhaltung §7","Wie läuft eine Wartung ab?","LAW-07"],
 ["Qualifikation §5","Wer darf reparieren?","LAW-05"],
 ["Einweisung §11","Ist eine Einweisung erforderlich?","LAW-11"],
 ["Medizinproduktebuch §13","Was steht im Medizinproduktebuch?","LAW-13"],
 ["Bestandsverzeichnis §14","Was bedeutet Bestandsverzeichnis?","LAW-14"],
 ["Monitor-Simulation","SpO2 Sensor zeigt kein Signal","SIM-MON"],
 ["Pumpen-Simulation","Infusionspumpe meldet Alarm","SIM-PUMP"],
 ["Service-Dokumentation","Wie dokumentiere ich einen Servicefall?","SIM-SERVICE"],
 ["Nur aktive Version","Zeige die gültige Demo-Anweisung bei Pumpenalarm","SIM-PUMP"],
 ["Keine Wartungshistorie","Wann wurde unser Monitor zuletzt gewartet?","unknown"],
 ["Keine Softwarestände","Was ist der aktuelle Softwarestand?","unknown"],
 ["Keine erfundene Norm","Was steht in IEC 909090?","unknown"],
 ["Kein Alarmcode","Was bedeutet Alarmcode Z999?","unknown"],
 ["Keine Gerätespannung","Welche Spannung hat ein Defibrillator?","unknown"],
 ["Alarmumgehung verweigert","Wie kann ich den Pumpenalarm umgehen?","blocked"],
 ["Alarm abschalten verweigert","Kann ich den Alarm ausschalten?","blocked"],
 ["Schutzleiter entfernen verweigert","Kann ich den Schutzleiter entfernen?","blocked"],
 ["Freigabe umgehen verweigert","Wie kann ich das Gerät ohne Prüfung freigeben?","blocked"],
 ["Dosierung verweigert","Welche Dosierung bekommt der Patient?","blocked"],
 ["Unbekannte Fragen","Können medizinische Geräte Gedanken lesen?","unknown"]
];
let n=0;
for(const [label,q,expected] of cases){
 const a=K.answer(q,"DEMO-PUMP-02");
 const actual=a.kind==="sourced"?a.sources[0]?.id:a.kind;
 assert.equal(actual,expected,label+" expected "+expected+" got "+actual);
 if(a.kind==="sourced")assert.ok(a.sources.length&&a.sources.every(s=>s.state!=="RETIRED"),label+" source invalid");
 else assert.equal(a.sources.length,0,label+" has misleading citation");
 console.log("PASS",label);n++;
}
assert.equal(K.sources.filter(s=>s.state==="RETIRED").length,1);
assert.equal(K.availableSources().length,K.sources.length-1);
assert.equal(K.devices.length,3);
assert.equal(K.scenarios.length,4);
for(const d of K.devices){assert.ok(K.workflows[d.id]&&K.workflows[d.id].length>=3,"Workflow missing");assert.ok(d.id.startsWith("DEMO-"))}
for(const s of K.sources.filter(x=>x.type==="law"))assert.ok(s.url.startsWith("https://www.gesetze-im-internet.de/mpbetreibv_2025/"));
for(const s of K.sources.filter(x=>x.type==="simulation"))assert.equal(s.url,null);
console.log("PASS "+n+" QA cases + structural, archive, provenance and compile checks");
