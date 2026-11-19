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
  for(let i=0;i<pages.length;i++){
   const original=pages[i];
   const txt=norm(original.text);
   let start=txt.indexOf(heading);
   if(start<0)continue;
   let hit=txt.indexOf(proof,start+heading.length);
   if(hit<0||hit-start>8500)continue;
   // Refuse when the passage occurs after another statutory section.
   const between=txt.slice(start+heading.length,hit);
   const n=faq.sectionMarker.match(/^§\s*(\d+)/);
   if(n){
    const next=Number(n[1])+1;
    const nextHead=new RegExp("(?:^| )"+next+" [a-z]{5,} ");
    if(nextHead.test(between))continue;
   }
   const relevant=index.chunks.filter(c=>c.page===original.number);
   const full=relevant.find(c=>norm(c.text).includes(proof));
   const terms=proof.split(" ").filter(w=>w.length>3);
   const best=full||relevant.map(c=>{
    const content=norm(c.text),hits=terms.filter(w=>content.includes(w)).length;
    return {c,hits};
   }).sort((a,b)=>b.hits-a.hits)[0]?.c;
   if(!best||terms.filter(w=>norm(best.text).includes(w)).length<Math.min(2,terms.length))continue;
   return {page:original.number,excerpt:best.text,matchedTerms:terms.filter(w=>norm(best.text).includes(w)).slice(0,8),coverage:1,score:100,proof:"original-pdf-section",section:faq.sectionMarker};
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
