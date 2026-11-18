#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const d=JSON.parse(fs.readFileSync("data/legal_faq.json","utf8"));
assert.equal(d.schemaVersion,1);
assert.ok(/NOT measured popularity/i.test(d.classification));
assert.ok(d.faqs.length>=12);
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
}
assert.ok(d.faqs.filter(f=>f.sourceId==="mpbetreibv").length>=8);
assert.deepEqual([...covered].sort(),[...laws].sort(),"All laws have a curated FAQ");
console.log("PASS: 12 curated, government-linked legal FAQs (MPBetreibV priority); no invented usage popularity");
