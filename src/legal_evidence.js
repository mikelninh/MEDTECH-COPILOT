/* Source-locked legal quick answers. No model and no network.
 * Only returns a cited passage when the selected source's actual extracted
 * PDF contains both the statutory section heading AND the editorial proof.
 */
(function(root,factory){
 const api=factory();
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 else root.MedtechLegalEvidence=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 function norm(x){return String(x||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/ß/g,"ss").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ")}
 const words=x=>new Set(norm(x).split(" ").filter(t=>t.length>3&&!["welche","wann","wird","muss","sind","eine","einen","einer","welcher","diese","dieser","nach","eines"].includes(t)));
 function match(faqs,question,sourceId){
  if(!Array.isArray(faqs)||!sourceId)return null;
  const q=norm(question);if(q.length<7)return null;
  const only=faqs.filter(f=>f.sourceId===sourceId);
  for(const f of only)if([f.question,...(f.aliases||[])].some(t=>norm(t)===q))return f;
  const qwords=words(q);
  if(qwords.size<2)return null;
  const scores=only.map(f=>{
   const targets=[f.question,...(f.aliases||[])];
   const score=Math.max(...targets.map(t=>{
    const w=words(t);let hits=0;for(const key of qwords)if(w.has(key))hits++;
    return hits/Math.max(qwords.size,w.size);
   }));
   return {faq:f,score};
  }).sort((a,b)=>b.score-a.score);
  const top=scores[0],second=scores[1];
  return top&&top.score>=.78&&(!second||top.score-second.score>.1)?top.faq:null;
 }
 function locate(index,faq){
  if(!index?.pageTexts?.length||!index?.chunks?.length||!faq?.sectionMarker||!faq?.proofPhrase)return null;
  const heading=norm(faq.sectionMarker),proof=norm(faq.proofPhrase);
  if(heading.length<8||proof.length<6)return null;
  const pages=index.pageTexts;
  const sectionNumber=faq.sectionMarker.match(/^§\s*(\d+)/);
  const nextNumber=sectionNumber?Number(sectionNumber[1])+1:null;
  const nextHeading=faq.nextSectionMarker?norm(faq.nextSectionMarker):"";
  // Bound the passage by a *real heading*, not bare references like "§ 13 Absatz 1".
  function crossedNextSection(raw,startOffset){
   const fragment=String(raw||"").slice(startOffset);
   const exact=nextHeading&&norm(fragment).indexOf(nextHeading);
   if(exact>=0)return exact;
   if(nextNumber===null)return -1;
   const match=fragment.match(new RegExp("(?:^|\\n)\\s*§\\s*"+nextNumber+"\\s*\\n?\\s*[A-ZÄÖÜ][a-zäöüß]{4,}","m"));
   return match?norm(fragment.slice(0,match.index)).length:-1;
  }
  for(let i=0;i<pages.length;i++){
   const text=norm(pages[i].text);
   const start=text.indexOf(heading);
   if(start<0)continue;
   for(let j=i;j<Math.min(pages.length,i+3);j++){
    const candidate=pages[j],content=norm(candidate.text);
    const begin=j===i?start+heading.length:0;
    const hit=content.indexOf(proof,begin);
    if(hit<0)continue;
    const raw=String(candidate.text);
    const nextHeadingStart=crossedNextSection(raw,j===i?Math.max(0,raw.indexOf("§")):0);
    // On subsequent pages, the proof must appear before the next statute.
    if(j>i&&nextHeadingStart>=0&&hit>=nextHeadingStart)continue;
    if(j===i&&hit-start>8500)continue;
    const relevant=index.chunks.filter(c=>c.page===candidate.number);
    const exactChunk=relevant.find(c=>norm(c.text).includes(proof));
    const terms=proof.split(" ").filter(w=>w.length>3);
    const best=exactChunk||relevant.map(c=>{
     const txt=norm(c.text),hits=terms.filter(w=>txt.includes(w)).length;
     return {c,hits};
    }).sort((x,y)=>y.hits-x.hits)[0]?.c;
    if(!best||terms.filter(w=>norm(best.text).includes(w)).length<Math.min(2,terms.length))continue;
    return {page:candidate.number,excerpt:best.text,matchedTerms:terms.filter(w=>norm(best.text).includes(w)).slice(0,8),coverage:1,score:100,proof:"original-pdf-section",section:faq.sectionMarker};
   }
  }
  return null;
 }
 function answer(index,faq,sourceId){
  if(!faq||sourceId!==faq.sourceId)return {status:"unknown",reason:"Quelle und Rechtsfrage passen nicht zusammen.",evidence:[]};
  const citation=locate(index,faq);
  if(!citation)return {status:"unknown",reason:"Der Original-PDF-Text konnte die angegebene Norm und Belegpassage nicht gemeinsam bestätigen. Bitte die amtliche Quelle direkt prüfen.",evidence:[],faqId:faq.id};
  return {status:"evidence",reason:"Norm und Belegpassage im ausgewählten Original-PDF abgeglichen. Fachliche Auslegung und Aktualität weiterhin prüfen.",evidence:[citation],answer:citation.excerpt,faqId:faq.id};
 }
 return {norm,match,locate,answer};
});
