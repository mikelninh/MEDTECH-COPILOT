#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const manifest=JSON.parse(fs.readFileSync("data/source_catalog.json","utf8"));
assert.equal(manifest.schemaVersion,1);
assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(manifest.retrievedAt));
assert.equal(manifest.sources.length,7);
const expected=new Set(["lumen","orion","mpbetreibv","mpdg","arbschg","mpamiv","mpav"]);
for(const src of manifest.sources){
 assert.ok(expected.delete(src.id),"Unexpected or duplicate source ID: "+src.id);
 assert.ok(["laws","medtech"].includes(src.group));
 assert.ok(/^\.\/examples\/[A-Za-z0-9_.-]+\.pdf$/.test(src.path));
 assert.ok(src.pages>=1&&src.pages<=120);
 assert.match(src.sha256,/^[a-f0-9]{64}$/);
 const f=path.join(".",src.path);
 const bytes=fs.readFileSync(f);
 assert.ok(bytes.subarray(0,5).toString()==="%PDF-");
 assert.ok(bytes.byteLength<=15*1024*1024);
 assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"),src.sha256);
 if(src.group==="laws"){
  assert.equal(src.sourceKind,"gitlaw-reader-not-official");
  assert.match(src.originalUrl,/^https:\/\/www\.gesetze-im-internet\.de\/[a-z0-9_]+\/[A-Za-z0-9_.-]+\.pdf$/);
  assert.match(src.gitlawUrl,/^https:\/\/raw\.githubusercontent\.com\/mikelninh\/gitlaw\/main\/laws\//);
  assert.match(src.gitlawTextSha256,/^[a-f0-9]{64}$/);
 }else{
  assert.equal(src.sourceKind,"fictional-training");
  assert.equal(src.originalUrl,null);
 }
 assert.equal(src.cover,"./covers/"+src.id+".svg");
 assert.ok(Array.isArray(src.questions)&&src.questions.length>=2);
 console.log("PASS SOURCE "+src.id+" / "+src.pages+" pages / "+src.sha256.slice(0,12));
}
assert.equal(expected.size,0,"Missing expected examples");
console.log("PASS SOURCE CATALOG 7/7 published PDF fingerprints");
