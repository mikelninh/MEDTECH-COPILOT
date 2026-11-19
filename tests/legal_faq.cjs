#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const d=JSON.parse(fs.readFileSync("data/legal_faq.json","utf8"));
assert.equal(d.schemaVersion,1);
assert.ok(/NOT measured popularity/i.test(d.classification));
assert.ok(d.faqs.length>=19);
const laws=new Set(["mpbetreibv","mpdg","mpamiv","mpav","arbschg"]);
const ids=new Set(),covered=new Set();
for(const f of d.faqs){
 assert.ok(!ids.has(f.id),"Duplicated FAQ id");
 ids.add(f.id);covered.add(f.sourceId);
 assert.ok(laws.has(f.sourceId),"FAQ must use existing government law source");
 assert.ok(f.question.length>=18);
 assert.ok(f.answer.length>=45);
 assert.match(f.answerReference,/§|Anlage/);
 assert.match(f.sourceUrl,/^https:\/\/www\.gesetze-im-internet\.de\/[a-z0-9_]+\/(?:__\d+|anlage_\d+)\.html$/);
 assert.ok(!/diagnose|garantiert zutreffend/i.test(f.answer),"No unsupported confidence");
 assert.ok(f.sectionMarker?.length>6&&f.proofPhrase?.length>6);
 assert.ok(Array.isArray(f.aliases));
 assert.ok(Number.isInteger(f.priority)&&f.priority>=1);
 if(f.quickLabel!==undefined)assert.ok(f.quickLabel.length>3);
}
assert.ok(d.faqs.filter(f=>f.sourceId==="mpbetreibv").length>=15);
assert.deepEqual([...covered].sort(),[...laws].sort(),"All laws have a curated FAQ");
const contextIds=new Set();
const assigned=new Set();
for(const context of d.contexts){
 assert.ok(!contextIds.has(context.id));
 contextIds.add(context.id);
 assert.ok(["role","situation"].includes(context.type));
 assert.ok(context.label.length>4);
 assert.equal(context.questionIds.length,10,context.id);
 assert.equal(new Set(context.questionIds).size,10,context.id);
 for(const id of context.questionIds){
  assert.ok(ids.has(id),context.id+" references "+id);
  assigned.add(id);
 }
}
assert.equal(d.contexts.filter(context=>context.type==="role").length,4);
assert.equal(d.contexts.filter(context=>context.type==="situation").length,6);
assert.equal(assigned.size,51);
console.log(`PASS: ${d.faqs.length} curated FAQs; ${assigned.size} across ${d.contexts.length} sets of 10`);
