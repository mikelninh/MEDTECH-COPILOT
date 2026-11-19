#!/usr/bin/env node
"use strict";
const fs=require("fs"),Core=require("../src/upload_core.js");
const faqs=require("../data/legal_faq.json").faqs;
const pages=JSON.parse(fs.readFileSync(process.argv[2]||"/tmp/medtech-gold-pdf-pages.json","utf8"));
let passes=0;
for(const f of faqs){
 const index=Core.chunkPages(pages[f.sourceId]);
 const result=Core.search(index,f.question);
 const top=result.evidence?.[0];
 if(result.status==="evidence")passes++;
 console.log("FAQ_DIAG",JSON.stringify({id:f.id,source:f.sourceId,ref:f.answerReference,status:result.status,page:top?.page||null,
  q:f.question,terms:Core.getConcepts(f.question),matched:top?.matchedTerms||[],snippet:top?.excerpt?.slice(0,160)||"",reason:result.reason}));
}
console.log("FAQ BASELINE",passes+"/"+faqs.length,"— diagnostic only (not release gate yet)");
