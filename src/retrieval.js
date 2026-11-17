/* MEDTECH COPILOT — evidence engine
 * Real passage indexing and lexical retrieval over versioned documents.
 * Extractive citations only; no generative LLM, embeddings, or hospital integrations.
 * Free of third-party calls; all document content is untrusted data.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  else root.MedtechRetrieval=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const STOP=new Set(("der die das dem den des ein eine einer eines einen einem und oder für fuer von durch über ueber bei mit ohne soll sollten was wie ist sind wird werden ich du wir er sie es zu zur zum im in am an auf aus nach vor wann wo welche welcher welches kann könnte koennte dürfen duerfen darf bitte zeigt zeige mir mache ich hier dort auch haben unser unsere meiner mein they what where when which how why with from into while and but for the this that those these you your are were has have been can could would should please tell about around our their does did need a their there device devices was ist it or as at by to do so a an of").split(" "));
const SYN={
  monitor:["spo2","ecg","patient","monitor"],
  sauerstoff:["spo2","oxygen","saturation"],
  saettigung:["spo2","oxygen","saturation"],
  spo2:["spo2","oxygen","saturation"],
  ekg:["ecg","trace","electrode","monitor"],
  artefakt:["noise","trace","interference"],
  signal:["signal","trace","spo2"],
  infusionspumpe:["pump","infusion","occlusion"],
  pumpe:["pump","infusion"],
  pumpenalarm:["pump","warning","alarm"],
  verschlussalarm:["occlusion","warning","pump"],
  okklusion:["occlusion","warning","pump"],
  beatmung:["ventilator","ventilation"],
  beatmungsgeraet:["ventilator","ventilation"],
  beatmungsgeraete:["ventilator","ventilation"],
  pruefung:["testing","inspection","safety"],
  inspektion:["inspection","maintenance"],
  wartung:["maintenance","service"],
  reparatur:["repair","maintenance"],
  service:["service","intake","handover"],
  fehlermeldung:["fault","alert","message"],
  stoerung:["malfunction","fault","alert"],
  dokumentieren:["record","documentation","fields"],
  dokumentation:["record","documentation","service"],
  protokoll:["record","documentation","service"],
  freigabe:["release","approval","authorised"],
  sicherheit:["safety","clinical","qualified"],
  alarm:["alarm","warning","alert"],
  handbuch:["manual","document","source"],
  quelle:["source","citation","evidence"],
  veraltet:["retired","obsolete","archived"],
  version:["version","revision","approved"],
  aktuell:["current","approved","version"],
  batterie:["battery","alert","pump"],
  akku:["battery","alert","pump"],
  druck:["pressure","occlusion"],
  sensor:["sensor","accessory"],
  uebergabe:["handover","service"],
  patient:["patient","clinical"],
  kollegen:["team","staff"],
  qualifikation:["qualified","authorised","personnel"],
  sprache:["voice","speech"],
  kopfhoerer:["voice","audio"],
  brille:["glasses","smart"],
  datenschutz:["privacy","data","speech"],
  patientensicherheit:["patient","clinical","safety"],
  medizinproduktebuch:["medizinproduktebuch","book","record"],
  bestandsverzeichnis:["bestandsverzeichnis","inventory"]
};
function normalize(input){
 return String(input||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/ä/g,"a").replace(/ö/g,"o").replace(/ü/g,"u").replace(/ß/g,"ss").replace(/[^a-z0-9]+/g," ").trim();
}
function rawTokens(x){return normalize(x).split(/\s+/).filter(Boolean);}
function tokens(x){return rawTokens(x).filter(w=>w.length>=3&&!STOP.has(w));}
function expand(x){
 const out=new Set(tokens(x));
 for(const t of [...out]){
   const words=SYN[t]||[];
   words.forEach(w=>out.add(w));
   if(t.endsWith("en")&&t.length>6)out.add(t.slice(0,-2));
   if(t.endsWith("ung")&&t.length>7)out.add(t.slice(0,-3));
 }
 return [...out];
}
function flatten(corpus){
 if(!corpus||!Array.isArray(corpus.documents))throw new Error("Corpus missing documents");
 const result=[];
 for(const doc of corpus.documents){
  if(!doc.id||!doc.title||!doc.version||!doc.status||!Array.isArray(doc.sections))throw new Error("Bad document metadata");
  for(const entry of doc.sections){
   if(!Array.isArray(entry)||entry.length<3||!String(entry[2]).trim())throw new Error("Invalid section "+doc.id);
   const [page,heading,text]=entry;
   result.push({
    id:doc.id+"#"+page,
    documentId:doc.id,title:doc.title,kind:doc.kind,
    deviceId:doc.deviceId||null,owner:doc.owner||"",
    version:doc.version,status:doc.status,
    updated:doc.updated||"",url:doc.url||null,
    page:String(page),heading:String(heading),text:String(text),
    language:doc.language||"en"
   });
  }
 }
 return result;
}
const unsafe=/(?:umgeh|uberbruck|ueberbruck|ausschalt|deaktiv|entfern|abklemm|disable|override|bypass|defeat|suppress|remove).{0,110}(?:alarm|warnung|schutzleiter|sicherung|safety|interlock|earth|ground|prufung|pruefung|test|pumpe|pump)|(?:alarm|warnung|schutzleiter|sicherung|safety|interlock|earth|ground|pumpe|pump).{0,110}(?:umgeh|uberbruck|ueberbruck|ausschalt|deaktiv|entfern|abklemm|disable|override|bypass|defeat|suppress|remove)|(?:ohne|without).{0,60}(?:prufung|pruefung|inspection|safety check).{0,55}(?:frei|freigeb|release|operate)|(?:dosier|dosierung|dosis|dosage|medication dose|therapy setting|therapie einstellen)|(?:patientendaten|patient record|patient identity|passwort|password)/;
const inventory=/(?:\b(?:unser|unsere|unserem|unserer|our)\b.{0,90}(?:geraet|pumpe|monitor|device|equipment|inventar|bestand|service|wartung|software|last|serial|history)|\b(?:wann zuletzt|zuletzt gewartet|last serviced|actual inventory|current software|real device|seriennummer|serial number|asset history|current service record)\b)/;
const specificNumbers=/(?:welche|wieviel|wie viel|how much|how many|what is the).{0,40}(?:volt|voltage|joule|grenzwert|alarmcode|error code|serial number|ampere|milliampere|reparaturcode)|(?:\b(?:alarm|error|fehler)\s*(?:code|nummer|nr)\s*[a-z0-9-]+\b)|(?:\b(?:alarmcode|fehlercode|errorcode)\b)/;
const syntheticNote="Fictional training source. Not a manufacturer instruction or permission to work on equipment.";
function buildIndex(corpus){
 const all=flatten(corpus),active=all.filter(c=>c.status==="APPROVED_DEMO"||c.status==="PUBLIC_OFFICIAL_SUMMARY");
 const scoredDocs=active.map(ch=>{
  const titleTokens=tokens(ch.title+" "+ch.heading+" "+ch.deviceId);
  const textTokens=tokens(ch.text);
  const freq=new Map();
  for(const tok of textTokens)freq.set(tok,(freq.get(tok)||0)+1);
  for(const tok of titleTokens)freq.set(tok,(freq.get(tok)||0)+3);
  return {...ch,freq,length:textTokens.length+titleTokens.length*3};
 });
 const N=scoredDocs.length;
 const df=new Map();
 scoredDocs.forEach(s=>{for(const term of s.freq.keys())df.set(term,(df.get(term)||0)+1)});
 const avg=scoredDocs.reduce((a,c)=>a+c.length,0)/(N||1);
 return {all,active:scoredDocs,N,df,avg};
}
function search(index,question,opts={}){
 const query=expand(question),context=opts.deviceId||null;
 if(!query.length)return [];
 const candidates=index.active.filter(ch=>!context||!ch.deviceId||ch.deviceId===context);
 const results=[];
 for(const ch of candidates){
  let score=0,matched=0;
  for(const t of query){
   const frequency=ch.freq.get(t)||0;if(!frequency)continue;
   matched++;
   const idf=Math.log(1+(index.N-(index.df.get(t)||0)+.5)/((index.df.get(t)||0)+.5));
   score+=idf*(frequency*2.2)/(frequency+1.2*(.25+.75*ch.length/index.avg));
  }
  if(!score)continue;
  const title=normalize(ch.title+" "+ch.heading);
  const phrase=normalize(question);
  if(phrase.length>9&&title.includes(phrase))score+=2;
  if(context&&ch.deviceId===context)score*=1.36;
  if(ch.deviceId&&query.includes(ch.deviceId.toLowerCase()))score*=1.5;
  results.push({chunk:ch,score,matched});
 }
 results.sort((a,b)=>b.score-a.score);
 const best=results[0]?.score||0;
 if(!best)return [];
 // Avoid low-relevance guessed citations. Require relevance, not just a single very common word.
 const threshold=Math.max(1.25,best*.34);
 return results.filter(r=>r.score>=threshold).slice(0,opts.limit||4);
}
function ask(index,question,opts={}){
 const query=normalize(question);
 if(unsafe.test(query)){
  return {status:"blocked",heading:"Safety boundary",explanation:"This public demo cannot advise on bypassing safety systems, device release without checks, clinical dosing or confidential records. Contact the responsible clinical or qualified technical team.",evidence:[],answer:"",note:syntheticNote};
 }
 if(inventory.test(query)||specificNumbers.test(query)){
  return {status:"unknown",heading:"No verified live asset data",explanation:"This demo cannot access real hospital inventory, maintenance history, model specifications or software versions. Use your authorised source system and current manufacturer documentation.",evidence:[],answer:"",note:syntheticNote};
 }
 const hits=search(index,question,opts);
 if(!hits.length)return {status:"unknown",heading:"No supported evidence",explanation:"No sufficiently relevant passage was found in the active demo corpus. Nothing is inferred or invented.",evidence:[],answer:"",note:syntheticNote};
 const top=hits[0];
 if(top.score<1.25)return {status:"unknown",heading:"No supported evidence",explanation:"The best match is too weak to support an answer.",evidence:[],answer:"",note:syntheticNote};
 return {
  status:"evidence",heading:top.chunk.heading,
  answer:top.chunk.text,explanation:"Exact extract from the cited active document; no AI-generated paraphrase.",
  evidence:hits.map(hit=>({
   id:hit.chunk.id,documentId:hit.chunk.documentId,
   documentTitle:hit.chunk.title,version:hit.chunk.version,page:hit.chunk.page,
   heading:hit.chunk.heading,excerpt:hit.chunk.text,score:Number(hit.score.toFixed(3)),
   updated:hit.chunk.updated,deviceId:hit.chunk.deviceId,status:hit.chunk.status,
   kind:hit.chunk.kind,url:hit.chunk.url
  })),
  note:syntheticNote
 };
}
function documentSummary(index){
 const seen=new Map();
 for(const ch of index.all){
  if(!seen.has(ch.documentId))seen.set(ch.documentId,{id:ch.documentId,title:ch.title,kind:ch.kind,deviceId:ch.deviceId,version:ch.version,status:ch.status,updated:ch.updated,pageCount:0,owner:ch.owner});
  seen.get(ch.documentId).pageCount++;
 }
 return [...seen.values()];
}
return {normalize,tokens,expand,flatten,buildIndex,search,ask,documentSummary,SYN};
});