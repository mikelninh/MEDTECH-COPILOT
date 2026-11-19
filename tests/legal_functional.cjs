#!/usr/bin/env node
"use strict";
const fs=require("fs"),path=require("path"),assert=require("node:assert/strict");
const Core=require("../src/upload_core.js"),Legal=require("../src/legal_evidence.js");
const faqs=require("../data/legal_faq.json").faqs;
const pages=JSON.parse(fs.readFileSync(process.argv[2]||"/tmp/medtech-gold-pdf-pages.json","utf8"));
const results=[],indices={};let baseline=0,passed=0,aliases=0,guards=0;
for(const [id,documentPages] of Object.entries(pages))indices[id]=Core.chunkPages(documentPages);
for(const f of faqs){
 const index=indices[f.sourceId];
 assert.ok(index?.pageTexts?.length,"Missing original PDF for "+f.sourceId);
 const old=Core.search(index,f.question);
 if(old.status==="evidence")baseline++;
 const match=Legal.match(faqs,f.question,f.sourceId);
 assert.equal(match?.id,f.id,"FAQ must match itself: "+f.id);
 const result=Legal.answer(index,match,f.sourceId);
 const evidence=result.evidence?.[0];
 const sourceText=evidence?.page?index.pageTexts.find(p=>p.number===evidence.page)?.text||"":"";
 const correct=result.status==="evidence"&&evidence?.proof==="original-pdf-section"&&
  Legal.norm(sourceText).includes(Legal.norm(f.proofPhrase))&&
  Legal.norm(evidence.excerpt).includes(Legal.norm(f.proofPhrase));
 if(correct)passed++;
 results.push({id:f.id,source:f.sourceId,question:f.question,status:result.status,correct,page:evidence?.page||null,
  section:f.sectionMarker,proof:f.proofPhrase,baseline:old.status});
 for(const alias of f.aliases||[]){
  assert.equal(Legal.match(faqs,alias,f.sourceId)?.id,f.id,"Alias misrouted: "+alias);aliases++;
 }
 assert.equal(Legal.answer(index,f,"wrong-source").status,"unknown","Wrong source cannot use another law");guards++;
 const fake={...f,sectionMarker:"§ 9999 Abschnitt existiert nicht"};
 assert.equal(Legal.answer(index,fake,f.sourceId).status,"unknown","Fake section must not generate citation");guards++;
 const fakeProof={...f,proofPhrase:"Eine vollkommen erfundene Gesetzesformulierung xyz"};
 assert.equal(Legal.answer(index,fakeProof,f.sourceId).status,"unknown","Fabricated quote must not be accepted");guards++;
 console.log("LEGAL_GOLD",JSON.stringify({id:f.id,status:result.status,page:evidence?.page||null,correct,section:f.sectionMarker,proof:f.proofPhrase,baseline:old.status}));
}
assert.equal(Legal.match(faqs,"Was hatte ich gestern zu Mittag?","mpbetreibv"),null);
assert.equal(Core.classify("Wie kann ich einen Alarm deaktivieren?"),"blocked");
assert.equal(Core.classify("Was ist die Wartungshistorie unseres Geräts?"),"unknown");
const report={date:"2026-11-19",source:"real version-pinned federal portal PDF snapshots",editorialPopularityOnly:true,
 questions:faqs.length,baseline,strict:passed,aliases,negativeGuards:guards+3,
 coverage:Math.round(100*passed/faqs.length),results};
fs.mkdirSync("artifacts",{recursive:true});
fs.writeFileSync("artifacts/legal_eval.json",JSON.stringify(report,null,2)+"\n");
console.log("LEGAL QUALITY GATE",JSON.stringify({originalBaseline:baseline,strict:passed,total:faqs.length,aliases,guards:guards+3}));
assert.equal(passed,faqs.length,"Every promoted quick choice must cite its correct original law section and literal proof. See artifacts/legal_eval.json");
