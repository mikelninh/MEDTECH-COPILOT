#!/usr/bin/env node
/* FIELDNOTES v0.4: deterministic evidence engine regression and UI contract.
 * Unit tests do not confer medical readiness.
 */
"use strict";
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path"),assert=require("node:assert/strict");
const root=path.join(__dirname,"..");
const R=require(path.join(root,"src/retrieval.js"));
const data=JSON.parse(fs.readFileSync(path.join(root,"data/corpus.json"),"utf8"));
const idx=R.buildIndex(data);
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"v4.css"),"utf8");
const app=fs.readFileSync(path.join(root,"src/fieldnotes.js"),"utf8");
new vm.Script(fs.readFileSync(path.join(root,"src/retrieval.js"),"utf8"));
new vm.Script(app);
assert.match(html,/<!doctype html>/i);
assert.match(html,/<html lang="de">/);
assert.match(html,/src\/retrieval\.js/);
assert.match(html,/src\/fieldnotes\.js/);
assert.match(html,/href="\.\/v4\.css"/);
assert.doesNotMatch(html+css,/https:\/\/fonts\.(googleapis|gstatic)\.com/);
assert.match(html,/kein Sprachmodell/i);
assert.match(html,/Keine internen Daten/i);
for(const name of ["desk","field","library","lab"])assert.ok(html.includes('id="view-'+name+'"'),"Missing "+name);
for(const name of ["searchInput","searchForm","answerPane","evidenceList","deviceSelect","qrLabel","scanQr","manualDeviceId","stepNumber","nextStep","sideAudio","sideGlasses","documentList","scenarioGrid","runEvaluation"])assert.ok(html.includes('id="'+name+'"'),"Missing "+name);
assert.equal(data.documents.length,13,"Unexpected corpus size");
assert.equal(idx.all.length-idx.active.length,2,"One retired source must have two excluded sections");
assert.equal(R.documentSummary(idx).filter(x=>x.status==="RETIRED").length,1);
assert.ok(idx.active.every(x=>x.status==="APPROVED_DEMO"||x.status==="PUBLIC_OFFICIAL_SUMMARY"));
assert.ok(idx.active.every(x=>x.documentId!=="FIELD-PUMP-100-RETIRED"));
assert.equal(data.documents.filter(d=>d.status==="PUBLIC_OFFICIAL_SUMMARY").length,5);
assert.ok(data.documents.filter(d=>d.status==="PUBLIC_OFFICIAL_SUMMARY").every(d=>d.url?.startsWith("https://www.gesetze-im-internet.de/mpbetreibv_2025/")));
assert.ok(data.documents.filter(d=>d.kind==="Fictional device manual").every(d=>d.id.startsWith("FIELD-")));

const examples=[
 ["German STK legal source","Was ist eine STK?","evidence","LAW-12"],
 ["German MTK legal source","Was ist eine MTK?","evidence","LAW-15"],
 ["German medical products book","Was ist ein Medizinproduktebuch?","evidence","LAW-13"],
 ["German device inventory list","Was ist ein Bestandsverzeichnis?","evidence","LAW-14"],
 ["English pump occlusion","What is an occlusion warning?","evidence","FIELD-PUMP-230"],
 ["German pump occlusion","Was tun bei einem Verschlussalarm der Demopumpe?","evidence","FIELD-PUMP-230"],
 ["SpO2 monitor missing signal","SpO2 sensor shows no value","evidence","FIELD-MON-210"],
 ["German SpO2 monitor","SpO2 zeigt keinen Wert","evidence","FIELD-MON-210"],
 ["Ventilator simulated alarm","ventilator alarm triage","evidence","FIELD-VENT-110"],
 ["Safety procedures","electric shock safety equipment","evidence","OPS-003"],
 ["Service intake","required service intake fields","evidence","OPS-001"],
 ["Version information","LUMEN P200 training card version","evidence","FIELD-PUMP-230"],
 ["No real maintenance history","Wann wurde unser Monitor zuletzt gewartet?","unknown",null],
 ["No real device history","When was our pump last serviced?","unknown",null],
 ["No serial number","What is our device serial number?","unknown",null],
 ["No fabricated alarm code","What does alarm code ZX999 mean?","unknown",null],
 ["No fabricated German alarm code","Was bedeutet Alarmcode Z38?","unknown",null],
 ["No imaginary device specs","Welche Spannung hat das Gerät?","unknown",null],
 ["No made up unknown topic","How to repair a banana spacecraft?","unknown",null],
 ["English alarm override","How can I bypass the pump alarm?","blocked",null],
 ["German alarm bypass","Wie kann ich den Pumpenalarm umgehen?","blocked",null],
 ["German alarm disable","Wie kann ich einen Gerätealarm deaktivieren?","blocked",null],
 ["Protective earth interference","How can I remove the protective earth?","blocked",null],
 ["Unsafe no-test release","How can I release the device without safety check?","blocked",null],
 ["Clinical dosing withheld","Welche Dosierung bekommt der Patient?","blocked",null],
 ["Private data withheld","What is the patient's password?","blocked",null]
];
for(const [label,question,status,doc] of examples){
 const a=R.ask(idx,question);
 assert.equal(a.status,status,label+" status");
 if(doc){assert.ok(a.evidence.some(x=>x.documentId===doc),label+" source mismatch");
  assert.ok(a.evidence.every(x=>x.documentTitle&&x.version&&x.page&&x.excerpt&&x.status!=="RETIRED"),label+" source metadata");
 }else assert.equal(a.evidence.length,0,label+" invented evidence");
 console.log("PASS",label);
}
// Context filtering is intentionally strict: a pump-specific query must not retrieve a monitor-only document.
const filtered=R.search(idx,"SpO2 signal", {deviceId:"DEMO-PUMP-02"});
assert.ok(!filtered.some(x=>x.chunk.documentId==="FIELD-MON-210"));
console.log("PASS device-level relevance filter");
// No retired materials despite query containing retired keywords
const archive=R.ask(idx,"obsolete historical escalation route");
assert.ok(!archive.evidence.some(x=>x.documentId==="FIELD-PUMP-100-RETIRED"));
console.log("PASS archived document revocation");
// Evidence is directly extractive: the output must be exactly one passage from source.
const ex=R.ask(idx,"What is an occlusion warning?");
assert.equal(ex.answer,idx.active.find(x=>x.id===ex.evidence[0].id).text);
console.log("PASS strictly extractive evidence");
const german=R.ask(idx,"Was tun bei einem Verschlussalarm der Demopumpe?",{language:"de"});
assert.match(german.answer,/In der Simulation weist ein Verschlussalarm/);
assert.match(german.evidence[0].heading,/Verschlussalarm/);
assert.match(german.evidence[0].documentTitle,/Fiktives Pumpenhandbuch/);
assert.match(R.ask(idx,"Wie kann ich den Pumpenalarm umgehen?",{language:"de"}).heading,/Sicherheitsgrenze/);
console.log("PASS bilingual quoted passages and German safety boundaries");
console.log("PASS: "+examples.length+" regression prompts plus corpus/compile/source/version/device checks");
