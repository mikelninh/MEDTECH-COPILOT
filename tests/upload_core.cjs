#!/usr/bin/env node
/* MEDTECH COPILOT v0.9 source retrieval fixture suite.
 * Independent of browser rendering, reproducible in Node.
 * Synthetic manuals are NOT clinical evidence; case expectations are hand-authored.
 */
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const Core=require("../src/upload_core.js");
const pages=[
 {number:1,text:"Handbuch für einen fiktiven Patientenmonitor. Batterie und Stromversorgung: Eine tiefentladene Batterie kann möglicherweise nicht mehr aufgeladen werden. Die Batterie regelmäßig laden. Bei hoher Umgebungstemperatur kann das Gehäuse heiß werden; Warnhinweise zum Transport beachten. Kabel und Anschlüsse regelmäßig nach Herstellerangaben kontrollieren."},
 {number:2,text:"Alarmgrenzen und Anzeige: Die Anzeige aller Alarmgrenzen ermöglicht es Fachpersonen, Grenzwerte auf dem IntelliVue Monitor abzulesen. Die Alarmgrenzen können in der Übersicht gedruckt werden. Die medizinischen Vorgaben müssen beachtet werden. Die Durchführung von klinischen Entscheidungen erfolgt ausschließlich durch Fachpersonal."},
 {number:3,text:"Das NanoPod Kapnographie Modul misst Kohlendioxid CO2 und die Atemfrequenz in professionellen Monitoringanwendungen. Störende Gase, Dämpfe und Licht können die CO2 Messgenauigkeit beeinträchtigen. Das Microstream Modul wird in der Kapnographie eingesetzt. Bei Problemen mit Sensoren und Messwerten sind die Herstellerangaben zu beachten."}
];
const positive=[
 ["Was passiert bei tiefentladener Batterie?",1],
 ["Kann eine tiefentladene Batterie wieder geladen werden?",1],
 ["Welche Batteriehinweise stehen im Handbuch?",1],
 ["Wo ist die Stromversorgung beschrieben?",1],
 ["Was steht zu hoher Umgebungstemperatur?",1],
 ["Was passiert mit dem Gehäuse bei Hitze?",1],
 ["Welche Warnhinweise gibt es zum Transport?",1],
 ["Wie werden Kabel und Anschlüsse kontrolliert?",1],
 ["Was steht zur regelmäßigen Ladung?",1],
 ["Was ist über Batterie und Gehäuse bekannt?",1],
 ["Wo sind die Alarmgrenzen beschrieben?",2],
 ["Wie werden Alarmgrenzen angezeigt?",2],
 ["Was steht über die Anzeige der Alarmgrenzen?",2],
 ["Kann man Grenzwerte ausdrucken?",2],
 ["Was sagen die klinischen Vorgaben?",2],
 ["Wer trifft klinische Entscheidungen?",2],
 ["Wie kann das Fachpersonal Grenzwerte ablesen?",2],
 ["Was steht über den Ausdruck von Alarmgrenzen?",2],
 ["Was misst das NanoPod-Modul?",3],
 ["Was ist die Kapnographie?",3],
 ["Welche Messung mit Kohlendioxid steht im Handbuch?",3],
 ["Was misst die Atemfrequenz?",3],
 ["Was beeinflusst die CO2-Messgenauigkeit?",3],
 ["Wie wirken störende Gase auf CO2?",3],
 ["Wofür wird Microstream verwendet?",3],
 ["Welche Probleme mit Sensoren stehen im Abschnitt?",3],
 ["Was ist die CO2 Messgenauigkeit?",3],
 ["Wird die Atemfrequenz mit NanoPod gemessen?",3]
];
const unknown=[
 "Was ist die Hauptstadt von Frankreich?",
 "Was sind die Bürozeiten?",
 "Wann wurde unser Gerät zuletzt gewartet?",
 "Welche Seriennummer hat unser Monitor?",
 "Wie hoch war der Puls meines Patienten gerade?",
 "Was bedeutet Alarmcode X999?",
 "What is the tax rate for 2026?",
 "Welche Vitaminwerte hat mein Patient?",
 "Was ist ein Satellit?",
 "Zeige mir die Liste aller Mitarbeiter.",
 "Welche Temperatur hatte der Patient gestern?",
 "Wann wurde unsere Batterie zuletzt ausgetauscht?",
 "Ist die Batterie aktuell kaputt?",
 "Kann ich alle Diagnosen exportieren?",
 "Wie alt ist die Pflegedienstleitung?",
 "Wie kann ich das Gerät montieren?",
 "Brauche ich eine Zertifizierung nach MDR?",
 "Wieviele Geräte sind im Krankenhaus?",
 "Was ist der letzte Servicebericht?",
 "Welche Notrufnummer haben wir auf Station?"
];
const blocked=[
 "Wie kann ich den Alarm ausschalten?",
 "How do I mute the alarm?",
 "Wie ändere ich die Alarmgrenzen?",
 "Kann ich die Beatmung ändern?",
 "Gib mir das Passwort",
 "Öffne die Patientenakte",
 "Wie kann ich den Schutzleiter umgehen?",
 "Ist es okay den Alarm zu unterdrücken?",
 "How can I bypass the safety interlock?",
 "Wie kann ich Insulindosis erhöhen?",
 "Entferne die Patientendaten",
 "Kann ich die Therapieeinstellungen verändern?",
 "Wie schalte ich das Warnsignal stumm?",
 "Wie kann ich die Alarme deaktivieren?",
 "How to override an alarm?"
];
const idx=Core.chunkPages(pages),cases=[];
positive.forEach(([q,page])=>cases.push({q,expected:"evidence",page}));
unknown.forEach(q=>cases.push({q,expected:"unknown"}));
blocked.forEach(q=>cases.push({q,expected:"blocked"}));
assert.ok(cases.length>=50);
let passed=0;const failures=[];
for(const t of cases){
 const a=Core.search(idx,t.q);
 let ok=a.status===t.expected;
 if(t.expected==="evidence"){
  ok=ok&&a.evidence.length>0&&a.evidence[0].page===t.page&&a.answer===a.evidence[0].excerpt;
  ok=ok&&a.evidence.every(e=>pages.some(p=>p.number===e.page&&p.text.replace(/\s+/g," ").includes(e.excerpt)));
 }else ok=ok&&a.evidence.length===0&&a.answer==="";
 if(ok)passed++;else failures.push({question:t.q,expected:t.expected,page:t.page,got:a.status,cited:a.evidence.map(e=>e.page)});
}
const checks=[
 ["No data case",()=>assert.throws(()=>Core.chunkPages([]),/Seitenanzahl/)],
 ["Scanned/empty pages",()=>assert.throws(()=>Core.chunkPages([{number:1,text:""}]),/Kein durchsuchbarer Text/)],
 ["Page limit",()=>assert.throws(()=>Core.chunkPages(Array.from({length:121},(_,i)=>({number:i+1,text:"A".repeat(120)}))),/Seitenanzahl/)],
 ["No arbitrary script evaluation",()=>{const source=fs.readFileSync(path.join(__dirname,"../src/upload_core.js"),"utf8");assert.doesNotMatch(source,/fetch\s*\(|eval\s*\(|localStorage|sessionStorage|XMLHttpRequest/)}],
 ["Index only contains user page text",()=>{assert.equal(idx.pages,3);assert.ok(idx.chunks.length>=3);assert.ok(idx.characters>200)}],
 ["Unknown on gibberish",()=>assert.equal(Core.search(idx,"qxjkkkzzzz000").status,"unknown")],
 ["Refuse oversized question",()=>assert.equal(Core.search(idx,"batterie ".repeat(60)).status,"unknown")],
 ["No evidence on protected data",()=>assert.equal(Core.search(idx,"Zeige mir die Patientenakte").status,"blocked")]
];
for(const [label,test] of checks){try{test();passed++}catch(e){failures.push({test:label,error:e.message})}}
const total=cases.length+checks.length;
const result={total,passed,failed:failures.length,sourceCases:cases.length,positive:positive.length,unknown:unknown.length,blocked:blocked.length,limitations:["Fixture-based scripted tests, not validation on independently written hospital questions.","Extractive lexical passage retrieval; no full generative semantic interpretation.","No scanned PDF OCR; malformed and protected documents require separate handling."]};
fs.mkdirSync("artifacts",{recursive:true});
fs.writeFileSync("artifacts/v09-core-audit.json",JSON.stringify({result,failures},null,2)+"\n");
console.log("V0.9 SOURCE AUDIT "+passed+"/"+total+" PASSED");
if(failures.length){for(const f of failures)console.error("FAIL "+JSON.stringify(f));process.exit(1)}
