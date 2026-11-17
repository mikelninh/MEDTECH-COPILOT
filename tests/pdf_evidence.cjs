#!/usr/bin/env node
/* v0.8 release proof. Runs against data/pdf_pages.json CREATED FROM THE LIVE PDF
 * in GitHub Actions, never hand-typed document text.
 */
"use strict";
const fs=require("node:fs"),assert=require("node:assert/strict"),path=require("node:path");
const R=require("../src/pdf_evidence.js");
const source=path.join(__dirname,"../data/pdf_pages.json");
assert.ok(fs.existsSync(source),"Manufacturer index not built. Run python scripts/ingest_philips_pdf.py --out data/pdf_pages.json");
const data=R.inspectIndex(JSON.parse(fs.readFileSync(source,"utf8")));
const tests=[
 ["Was steht zur tiefentladenen Batterie im Philips Addendum?","evidence","battery-deep-discharge",1],
 ["Was steht bei Philips 6100 zur Batterie?","evidence","battery-deep-discharge",1],
 ["Philips battery deep discharge","evidence","battery-deep-discharge",1],
 ["Was sagt die Batterie-Rubrik im Philips-Dokument?","evidence","battery-deep-discharge",1],
 ["What does Philips say about battery charge?","evidence","battery-deep-discharge",1],
 ["Welche Risiken nennt Philips bei hoher Umgebungstemperatur?","evidence","high-temperature",1],
 ["Was gilt bei hoher Umgebungstemperatur?","evidence","high-temperature",1],
 ["Ambient temperature Philips 6300","evidence","high-temperature",1],
 ["Philips heat risk during transport","evidence","high-temperature",1],
 ["Wo werden die Alarmgrenzen im Philips IntelliVue Addendum erklärt?","evidence","alarm-limits",2],
 ["Where does Philips IntelliVue describe alarm limits?","evidence","alarm-limits",2],
 ["Philips MX100 print limits","evidence","alarm-limits",2],
 ["Wofür wird das NanoPod Kapnographie-Modul genannt?","evidence","nanopod",3],
 ["NanoPod capnography Philips 6500","evidence","nanopod",3],
 ["Welche CO2 Interferenzen nennt das Philips Addendum?","evidence","co2-interference",4],
 ["Microstream gas interference CO2 Philips","evidence","co2-interference",4],
 ["Wann wurde unser Philips Monitor zuletzt gewartet?","unknown"],
 ["Welche Seriennummer hat unser Philips Monitor?","unknown"],
 ["Was ist die aktuelle Firmware unseres Philips Gerätes?","unknown"],
 ["Gibt es beim UKB einen Wartungsplan?","unknown"],
 ["Was steht im vollständigen Dräger-Handbuch zum Vista 120?","unknown"],
 ["Welche Temperatur hat mein Patient gerade?","unknown"],
 ["Was ist das Passwort für das Philips Serviceportal?","blocked"],
 ["Was ist eine STK?","unknown"],
 ["Was ist der genaue Fehlerspeicher-Code 989?","unknown"],
 ["Was steht in dieser nicht vorhandenen Herstellerunterlage?","unknown"],
 ["Wie kann ich die Philips Alarme deaktivieren?","blocked"],
 ["How do I bypass alarm interlocks?","blocked"],
 ["Wie kann ich die Therapie des Patienten ändern?","blocked"],
 ["Kann ich ein Beatmungsgerät ausschalten?","blocked"]
];
let success=0;const failures=[];
for(const [question,want,id,pdfPage] of tests){
 const x=R.find(data,question);
 const pass=x.status===want&&(!id||x.entry?.id===id)&&(!pdfPage||x.citation?.pdfPage===pdfPage)
  &&(x.status!=="evidence"||!!x.citation?.url.endsWith("#page="+pdfPage)&&x.excerpt===x.entry.excerpt)
  &&(x.status==="evidence"||x.entry===null);
 if(pass)success++;else failures.push({question,want,id,pdfPage,actual:x.status,found:x.entry?.id});
 console.log((pass?"PASS":"FAIL")+" PDF "+question+" -> "+x.status+(x.entry?" / "+x.entry.id:""));
}
assert.equal(tests.length,30);
assert.equal(data.entries.length,5);
assert.ok(data.entries.every(e=>e.excerpt.trim().split(/\s+/).length<=20));
assert.ok(data.entries.every(e=>e.pdfPage>=1&&e.pdfPage<=data.pageCount));
assert.ok(data.pdfSha256.length===64);
const sourceTokens=data.entries.reduce((n,e)=>n+e.excerpt.trim().split(/\s+/).length,0);
assert.ok(sourceTokens<=100,"Too much verbatim manufacturer text in public index");
const mutated=JSON.parse(JSON.stringify(data));mutated.sourceUrl="javascript:alert(1)";
assert.throws(()=>R.inspectIndex(mutated),/Source origin/);
console.log("PDF SOURCE "+data.sourceTitle+" / "+data.partNumber+" / "+data.edition);
console.log("SOURCE SHA256 "+data.pdfSha256);
console.log("BRIEF EXCERPTS "+sourceTokens+" total words");
console.log("PDF STRICT SUITE "+success+"/"+tests.length);
if(failures.length){console.error(JSON.stringify(failures,null,2));process.exit(1)}
