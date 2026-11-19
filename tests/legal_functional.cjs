#!/usr/bin/env node
"use strict";
const fs=require("fs");
const Core=require("../src/upload_core.js");
const Legal=require("../src/legal_evidence.js");
const faqs=require("../data/legal_faq.json").faqs;
const pages=JSON.parse(fs.readFileSync(process.argv[2]||"/tmp/medtech-gold-pdf-pages.json","utf8"));
let found=0,anchored=0;
for(const f of faqs){
 const index=Core.chunkPages(pages[f.sourceId]);
 const basic=Core.search(index,f.question);
 const matched=Legal.match(faqs,f.question,f.sourceId);
 const result=Legal.answer(index,f,f.sourceId);
 const passage=result.evidence?.[0];
 if(basic.status==="evidence")found++;
 if(result.status==="evidence")anchored++;
 console.log("LEGAL_GOLD",JSON.stringify({id:f.id,source:f.sourceId,ref:f.answerReference,
  baseline:basic.status,anchored:result.status,page:passage?.page||null,section:f.sectionMarker,
  phrase:f.proofPhrase,snippet:passage?.excerpt?.slice(0,140)||"",matchedId:matched?.id||null}));
}
console.log("LEGAL COVERAGE",JSON.stringify({originalBaseline:found,total:faqs.length,sectionVerified:anchored}));
