/* Privacy-first pilot metrics. Counts live in THIS browser only.
 * No raw questions, personal data, persistent identifiers or network calls.
 * This is an instrumentation adapter, not a cross-visitor analytics backend.
 */
(function(root,factory){
 const api=factory();
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 else root.MedtechLearningLoop=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const STORAGE_KEY="medtech_source_quality_aggregate_v1";
 const CONSENT_KEY="medtech_source_quality_consent_v1";
 const legalSources=new Set(["mpbetreibv","mpdg","arbschg","mpamiv","mpav","lumen","orion","own"]);
 const schema=()=>({version:1,asked:0,reasked:0,evidence:0,unknown:0,blocked:0,helpful:0,unhelpful:0,faqOpens:{},sourceAsks:{}});
 const safeSource=x=>legalSources.has(x)?x:"other";
 const norm=s=>String(s||"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
 function overlap(a,b){
  if(a===b&&a.length>=9)return 1;
  const x=new Set(a.split(" ").filter(v=>v.length>2)),y=new Set(b.split(" ").filter(v=>v.length>2));
  if(x.size<3||y.size<3)return 0;
  let count=0;for(const w of x)if(y.has(w))count++;
  return count/Math.max(x.size,y.size);
 }
 function create(storage,now=()=>Date.now()){
  let allowed=false,counts=schema(),last=null;
  try{
   allowed=storage?.getItem(CONSENT_KEY)==="yes";
   if(allowed){
    const parsed=JSON.parse(storage?.getItem(STORAGE_KEY)||"null");
    if(parsed&&parsed.version===1){
     for(const key of ["asked","reasked","evidence","unknown","blocked","helpful","unhelpful"])
      if(Number.isInteger(parsed[key])&&parsed[key]>=0)counts[key]=Math.min(parsed[key],999999999);
     for(const key of ["faqOpens","sourceAsks"])
      for(const [name,num] of Object.entries(parsed[key]||{}))
       if(/^[a-z0-9_-]{1,32}$/.test(name)&&Number.isInteger(num)&&num>=0)
        counts[key][name]=Math.min(num,999999999);
    }
   }
  }catch(_){}
  const save=()=>{if(allowed)try{storage?.setItem(STORAGE_KEY,JSON.stringify(counts))}catch(_){}};
  function consent(value){
   allowed=!!value;
   if(!allowed){counts=schema();last=null;try{storage?.removeItem(STORAGE_KEY);storage?.removeItem(CONSENT_KEY)}catch(_){}}
   else try{storage?.setItem(CONSENT_KEY,"yes");save()}catch(_){}
   return allowed;
  }
  function faqOpen(sourceId,faqId){
   if(!allowed||!/^[-a-z0-9]{1,32}$/.test(faqId))return;
   counts.faqOpens[faqId]=(counts.faqOpens[faqId]||0)+1;save();
  }
  function ask(sourceId,question,resultStatus){
   if(!allowed)return {recorded:false,reask:false};
   const source=safeSource(sourceId),q=norm(question),at=now();
   const reask=!!(last&&last.source===source&&at-last.time<=300000&&overlap(last.question,q)>=.6);
   last={source,question:q,time:at}; // volatile memory: NEVER persisted
   counts.asked++;counts.sourceAsks[source]=(counts.sourceAsks[source]||0)+1;
   if(reask)counts.reasked++;
   if(["evidence","unknown","blocked"].includes(resultStatus))counts[resultStatus]++;
   save();
   return {recorded:true,reask};
  }
  function feedback(helpful){if(!allowed||typeof helpful!=="boolean")return;counts[helpful?"helpful":"unhelpful"]++;save()}
  function stats(){return JSON.parse(JSON.stringify(counts))}
  function exportData(){return JSON.stringify({scope:"This browser only; no questions, identities or cross-user data",exportedAt:new Date(now()).toISOString(),counts:stats()},null,2)}
  return {consent,enabled:()=>allowed,faqOpen,ask,feedback,stats,exportData,reset:()=>consent(false)}
 }
 return {create,overlap,schema,STORAGE_KEY,CONSENT_KEY};
});
