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
  dokumentiert:["record","documentation","intake","fields"],
  servicefall:["service","intake","handover","documentation"],
  servicefalle:["service","intake","handover","documentation"],
  servicefaelle:["service","intake","handover","documentation"],
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
  for(const [sectionIndex,entry] of doc.sections.entries()){
   if(!Array.isArray(entry)||entry.length<3||!String(entry[2]).trim())throw new Error("Invalid section "+doc.id);
   const [page,heading,text,textDe,headingDe]=entry;
   result.push({
    id:doc.id+"#"+page+"-"+sectionIndex,
    documentId:doc.id,title:doc.title,titleDe:doc.titleDe||doc.title,kind:doc.kind,
    deviceId:doc.deviceId||null,owner:doc.owner||"",
    version:doc.version,status:doc.status,
    updated:doc.updated||"",url:doc.url||null,
    page:String(page),heading:String(heading),text:String(text),textDe:textDe?String(textDe):String(text),headingDe:headingDe?String(headingDe):String(heading),
    language:doc.language||"en"
   });
  }
 }
 return result;
}
const unsafe=/(?:umgeh|uberbruck|ueberbruck|ausschalt|deaktiv|entfern|abklemm|disable|override|bypass|defeat|suppress|remove).{0,110}(?:alarm|warnung|schutzleiter|sicherung|safety|interlock|earth|ground|prufung|pruefung|test|pumpe|pump)|(?:alarm|warnung|schutzleiter|sicherung|safety|interlock|earth|ground|pumpe|pump).{0,110}(?:umgeh|uberbruck|ueberbruck|ausschalt|deaktiv|entfern|abklemm|disable|override|bypass|defeat|suppress|remove)|(?:ohne|without).{0,60}(?:prufung|pruefung|inspection|safety check).{0,55}(?:frei|freigeb|release|operate)|(?:release|freigeb|inbetrieb).{0,75}(?:without|ohne).{0,45}(?:safety|check|inspection|prufung|pruefung)|(?:dosier|dosierung|dosis|dosage|medication dose|therapy setting|therapie einstellen)|(?:patientendaten|patient record|patient identity|passwort|password)/;
const inventory=/(?:\b(?:unser|unsere|unserem|unserer|our)\b.{0,90}(?:geraet|pumpe|monitor|device|equipment|inventar|bestand|service|wartung|software|last|serial|history)|\b(?:wann zuletzt|zuletzt gewartet|last serviced|actual inventory|current software|real device|seriennummer|serial number|asset history|current service record)\b)/;
const specificNumbers=/(?:welche|wieviel|wie viel|how much|how many|what is the).{0,40}(?:volt|voltage|spannung|joule|grenzwert|alarmcode|error code|serial number|ampere|milliampere|reparaturcode)|(?:\b(?:alarm|error|fehler)\s*(?:code|nummer|nr)\s*[a-z0-9-]+\b)|(?:\b(?:alarmcode|fehlercode|errorcode)\b)/;
const syntheticNote="Fictional training source. Not a manufacturer instruction or permission to work on equipment.";
function buildIndex(corpus){
 const all=flatten(corpus),active=all.filter(c=>c.status==="APPROVED_DEMO"||c.status==="PUBLIC_OFFICIAL_SUMMARY"||c.status==="PUBLIC_MANUFACTURER_SUMMARY");
 const scoredDocs=active.map(ch=>{
  const titleTokens=tokens(ch.title+" "+ch.titleDe+" "+ch.heading+" "+ch.headingDe+" "+ch.deviceId);
  const textTokens=tokens(ch.text+" "+ch.textDe);
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
 const isDrager=/(?:draeger|drager|vista\s*120)/.test(normalize(question));
 const candidates=index.active.filter(ch=>(!context||!ch.deviceId||ch.deviceId===context)&&(!isDrager||ch.documentId==="IFU-DRAGER-VISTA120-SW3N"));
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
  const title=normalize(ch.title+" "+ch.titleDe+" "+ch.heading+" "+ch.headingDe);
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
 const threshold=Math.max(1.25,best*.66);
 const relevant=results.filter(r=>r.score>=threshold);
 // Do not mix a precise official-law citation with a vaguely related SOP.
 if(results[0]?.chunk.kind==="Public legal summary")return relevant.filter(r=>r.chunk.documentId===results[0].chunk.documentId).slice(0,1);
 return relevant.slice(0,opts.limit||3);
}
function ask(index,question,opts={}){
 const query=normalize(question);
 if(unsafe.test(query)){
  return {status:"blocked",heading:opts.language==="de"?"Sicherheitsgrenze":"Safety boundary",explanation:opts.language==="de"?"Diese öffentliche Demo gibt keine Anleitung zur Umgehung von Schutzfunktionen, zur Gerätefreigabe ohne Prüfung, zu Medikamentendosierungen oder zu vertraulichen Daten. Zuständiges Klinikteam bzw. befugte Fachpersonen einbeziehen.":"This public demo cannot advise on bypassing safety systems, device release without checks, clinical dosing or confidential records. Contact the responsible clinical or qualified technical team.",evidence:[],answer:"",note:syntheticNote};
 }
 if(inventory.test(query)||specificNumbers.test(query)){
  return {status:"unknown",heading:opts.language==="de"?"Keine verifizierten Bestandsdaten":"No verified live asset data",explanation:opts.language==="de"?"Diese Demo hat keinen Zugriff auf echte Inventare, Servicehistorien, gerätespezifische Messwerte oder Softwarestände. Bitte das autorisierte System und die gültige Herstellerunterlage verwenden.":"This demo cannot access real hospital inventory, maintenance history, model specifications or software versions. Use your authorised source system and current manufacturer documentation.",evidence:[],answer:"",note:syntheticNote};
 }
 // Reject obviously out-of-domain prompts before accepting a loose "repair" / "record" match.
 const domain=/(medizin|medtech|device|equipment|geraet|monitor|pump|infusion|spo2|ecg|ekg|beatmung|ventil|alarm|sicher|safety|qualifik|wartung|pruf|pruef|inspection|service|source|dokument|document|manual|sop|sensor|patient|\bstk\b|\bmtk\b|battery|occlusion|clinical|version|revision|instand|bestandsverzeichnis|medizinproduktebuch|quelle|voltage|spann|shock|earth|electric|protokoll|handover)/.test(query);
 if(!domain)return {status:"unknown",heading:opts.language==="de"?"Außerhalb der Demo-Wissensbasis":"Outside the demo knowledge base",explanation:opts.language==="de"?"Dazu enthält der freigegebene Demo-Korpus keine hinreichende Information. Ein loses Stichwort reicht nicht als Beleg; es wird nicht geraten.":"This question is outside the supported medical engineering document corpus. The assistant won't guess based on a loosely matching word.",evidence:[],answer:"",note:syntheticNote};
 if(/(?:sw\s*2\s*n|softwareversion\s*2|sw\s*1\s*n)/.test(query)&&/(?:vista|draeger|drager)/.test(query)){
  return {status:"unknown",heading:"Andere Softwareversion",explanation:"Diese kuratierte Herstellerquelle gilt nur für Vista 120/Vista 120S SW 3.n. Für die angefragte Version fehlt hier die passende Unterlage.",evidence:[],answer:"",note:syntheticNote};
 }
 let hits=search(index,question,opts);
 if(/(?:draeger|drager|vista\s*120)/.test(query)){
  const exact=[
   [/kein\s+sensor/, "SpO2 Kein Sensor"],
   [/sensor\s+ab/, "SpO2-Sensor ab"],
   [/sensorfehler/, "SpO2-Sensorfehler"],
   [/niedrig\w*\s+perfusion/, "SpO2 niedrige Perfusion"],
   [/komm\w*\s*fehler|kommunikationsfehler/, "SpO2 Kommunikationsfehler"]
  ].find(x=>x[0].test(query));
  if(exact)hits=hits.filter(h=>h.chunk.heading===exact[1]);
 }
 if(!hits.length)return {status:"unknown",heading:opts.language==="de"?"Keine passende Quelle":"No supported evidence",explanation:opts.language==="de"?"Im aktiven Demo-Korpus wurde keine ausreichend relevante Fundstelle gefunden. Es werden keine Angaben ergänzt oder erfunden.":"No sufficiently relevant passage was found in the active demo corpus. Nothing is inferred or invented.",evidence:[],answer:"",note:syntheticNote};
 const top=hits[0];
 if(top.score<1.25)return {status:"unknown",heading:opts.language==="de"?"Quelle nicht belastbar":"No supported evidence",explanation:opts.language==="de"?"Die beste Fundstelle ist zu ungenau, um eine Antwort zu rechtfertigen.":"The best match is too weak to support an answer.",evidence:[],answer:"",note:syntheticNote};
 return {
  status:"evidence",heading:opts.language==="de"?top.chunk.headingDe:top.chunk.heading,
  answer:opts.language==="de"?top.chunk.textDe:top.chunk.text,explanation:top.chunk.kind==="Manufacturer manual reference"?"Curated paraphrase with printed manual page; original PDF linked.":"Exact extract from indexed source; no generated answer.",
  evidence:hits.map(hit=>({
   id:hit.chunk.id,documentId:hit.chunk.documentId,
   documentTitle:opts.language==="de"?hit.chunk.titleDe:hit.chunk.title,version:hit.chunk.version,page:hit.chunk.page,
   heading:opts.language==="de"?hit.chunk.headingDe:hit.chunk.heading,excerpt:opts.language==="de"?hit.chunk.textDe:hit.chunk.text,score:Number(hit.score.toFixed(3)),
   updated:hit.chunk.updated,deviceId:hit.chunk.deviceId,status:hit.chunk.status,
   kind:hit.chunk.kind,url:hit.chunk.url
  })),
  note:syntheticNote
 };
}
function documentSummary(index){
 const seen=new Map();
 for(const ch of index.all){
  if(!seen.has(ch.documentId))seen.set(ch.documentId,{id:ch.documentId,title:ch.titleDe,kind:ch.kind,deviceId:ch.deviceId,version:ch.version,status:ch.status,updated:ch.updated,pageCount:0,owner:ch.owner});
  seen.get(ch.documentId).pageCount++;
 }
 return [...seen.values()];
}
return {normalize,tokens,expand,flatten,buildIndex,search,ask,documentSummary,SYN};
});