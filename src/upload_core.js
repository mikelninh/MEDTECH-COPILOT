/* V0.9 | MEDTECH COPILOT – inspectable, extractive PDF retrieval.
 * All file contents remain in browser memory. This module makes NO network calls,
 * has no persistence, generates no clinical answers and never operates equipment.
 * Public API intentionally works in Node and the browser for identical tests.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  else root.MedtechManualCore=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const MAX_PAGES=120,MAX_BYTES=15*1024*1024;
const stop=new Set(("der die das dem den des ein eine einen einem einer ist sind im in auf an am aus bei mit und oder fuer für fur von zu zum zur was wie warum welche welcher welches welchen wozu wer wann wo wodurch kann soll muss darf ich mir wir uns unser unsere ihr ihre bitte zeigt zeige zeigen dokument handbuch manual document pdf gerat geraet geräte geraete modell version werden wird sein stehen steht hinweise hinweis passiert passieren gibt angeleitung anleitung uber man beschrieben beschreibung beschreibt trifft the a an of to on or for at is are be has have with by how what where when why which can should does do explain show please give me about this that from could would according available there these if then this").split(/\s+/));
const SYN=[
 ["akku","batterie","battery","batteries","batteriehinweise","ladung","laden","charge","charging","entladung","discharge"],
 ["alarm","warnung","warning","alarmmeldung","warnsignal","alert","alarme"],
 ["wartung","service","maintenance","instandhaltung","inspection"],
 ["sensor","sonde","probe","messfuehler"],
 ["kapnographie","capnography","co2","kohlendioxid"],
 ["temperatur","umgebungstemperatur","temperature","heat","hitze","ambient"],
 ["stromversorgung","power","versorgung","netzteil","supply"],
 ["fehler","error","fault","malfunction","stoerung","störung"],
 ["sicherheit","safety","security","schutz"],
 ["reinigen","cleaning","clean","pflege","desinfektion","disinfection"],
 ["monitor","anzeige","angezeigt","anzeigen","display","bildschirm"],
 ["messung","messen","misst","messwerte","measuring","measure","measures","measurement"],
 ["druck","ausdruck","drucken","ausdrucken","gedruckt","print","printing"]
];
function normalize(v){
 return String(v==null?"":v).normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/ß/g,"ss").replace(/ä/g,"a").replace(/ö/g,"o").replace(/ü/g,"u").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
}
function stem(t){
 if(t.length>7&&/ischen$/.test(t))return t.replace(/ischen$/,"isch");
 if(t.length>7)return t.replace(/(?:ungen|lichkeit|heiten|keiten|ischen|endes|ender|ation|ations|ments|mente|ernen|erei|heit|keit|lich|ungen|innen|ern|ers|ing|ung|en|es|er|em|e|s)$/,"");
 if(t.length>4)return t.replace(/(?:en|er|es|em|e|s)$/,"");
 return t;
}
const cleanTerms=str=>normalize(str).split(" ").filter(t=>t.length>=3&&!stop.has(t)&&!/(?:^(?:date|time|month|year)$)/.test(t));
const tokenize=str=>cleanTerms(str).map(stem).filter(Boolean);
const synMap=new Map();
SYN.forEach((group,i)=>group.forEach(w=>synMap.set(stem(normalize(w)),"s"+i)));
function concept(token){return synMap.get(token)||token;}
function getConcepts(str){return [...new Set(tokenize(str).map(concept))];}
function classify(question){
 const q=normalize(question);
 const blocked=[
  /(?:alarm|alarme|warnsignal|schutzleiter|interlock|safety|sicherung).{0,105}(?:deaktiv|umgeh|ausschalt|abschalt|stumm|mute|bypass|override|unterdruck|unterdrueck|uberbruck|ueberbruck|suppress|silence|aender|einstell|verschieb|ander|aender|verander|modifizier|adjust|change)/,
  /(?:deaktiv|umgeh|ausschalt|abschalt|stumm|mute|bypass|override|unterdruck|unterdrueck|uberbruck|ueberbruck|suppress|silence|aender|einstell|verschieb|ander|verander|modifizier|adjust|change).{0,105}(?:alarm|alarme|warnsignal|schutzleiter|interlock)/,
  /(?:beatmung|ventilation|therapie|dosierung|medikation|insulin|infusion).{0,95}(?:einstell|aender|verander|anpass|stop|dosier|increase|decrease)/,
  /(?:patient|patienten).{0,80}(?:diagnostiz|diagnose stellen|therapier|beurteil|dosier)/,
  /(?:passwort|password|patientenakte|patient record|patientenname|private patient|patientendaten)/
 ];
 if(blocked.some(rx=>rx.test(q)))return "blocked";
 const unknown=[
  /(?:wann|when).{0,65}(?:unser|our|dieses|last|zuletzt).{0,80}(?:wart|kalibrier|gepruf|gepruef|repar)/,
  /(?:unser|our|dieses|meine|my).{0,85}(?:wartungshistorie|servicehistorie|seriennummer|serial number|kalibrierung|softwarestand|fehlerlog|inventar|patientendaten|wartung)/,
  /(?:wie|how).{0,25}(?:viel|many|much|hoch).{0,70}(?:unser|our|patient|patients)/,
  /(?:patient|patienten|mein patient|meine patientin).{0,65}(?:aktuell|gerade|heute|now|momentan).{0,60}(?:wert|mess|temperatur|puls|sattigung|saettigung|blutdruck)/,
  /(?:aktuell|gerade|heute|now).{0,55}(?:patient|patienten).{0,55}(?:wert|mess|temperatur|puls|sattigung|saettigung|blutdruck)/
 ];
 if(unknown.some(rx=>rx.test(q)))return "unknown";
 return "search";
}
function chunkPages(pages){
 if(!Array.isArray(pages)||!pages.length||pages.length>MAX_PAGES)throw new Error("Ungültige Seitenanzahl (maximal 120).");
 let chars=0;const all=[];
 for(let i=0;i<pages.length;i++){
  const page=pages[i],number=page.number||i+1;
  if(!Number.isInteger(number)||number<1||number>MAX_PAGES)throw new Error("Ungültige PDF-Seitennummer.");
  if(typeof page.text!=="string")throw new Error("Seite ohne lesbaren Text.");
  const content=page.text.replace(/\s+/g," ").trim();
  chars+=content.length;if(chars>1200000)throw new Error("PDF-Text übersteigt das Limit.");
  const words=content.match(/\S+/g)||[];
  for(let start=0;start<words.length;start+=65){
   const end=Math.min(words.length,start+90);
   const text=words.slice(start,end).join(" ");
   if(text.length>=24){
    const concepts=getConcepts(text);
    all.push({page:number,start,end,text,concepts});
   }
   if(end===words.length)break;
  }
 }
 if(chars<50||all.length===0)throw new Error("Kein durchsuchbarer Text erkannt. Gescanntes PDF? OCR ist noch nicht enthalten.");
 const df=new Map();
 for(const item of all)for(const term of item.concepts)df.set(term,(df.get(term)||0)+1);
 return {chunks:all,pages:pages.length,characters:chars,df:Object.fromEntries(df),N:all.length};
}
function search(index,question,options={}){
 if(!index?.chunks||!Number.isInteger(index.N))throw new Error("Dokumentindex fehlt.");
 const q=String(question||"").trim();
 const status=classify(q);
 const base={status:"unknown",reason:"Keine ausreichend passende Textstelle gefunden.",evidence:[],answer:""};
 if(!q||q.length>400)return {...base,reason:"Bitte eine kurze konkrete Frage stellen (maximal 400 Zeichen)."};
 if(status==="blocked")return {...base,status:"blocked",reason:"Keine Anleitung zur Umgehung von Schutzfunktionen, zu Therapieänderungen oder zur Offenlegung geschützter Daten."};
 if(status==="unknown")return {...base,reason:"Die angefragten Betriebs- oder Patientendaten sind nicht im PDF nachgewiesen."};
 const query=getConcepts(q);
 if(!query.length)return {...base,reason:"Die Frage enthält keinen ausreichend konkreten Suchbegriff."};
 const N=index.N;
 const scored=index.chunks.map(c=>{
  const present=new Set(c.concepts);
  const matched=query.filter(t=>present.has(t));
  if(!matched.length)return {chunk:c,score:0,coverage:0,matched};
  const coverage=matched.length/query.length;
  let score=matched.reduce((sum,t)=>sum+Math.log(1+(N-(index.df[t]||0)+.5)/((index.df[t]||0)+.5)),0);
  score=score*(0.65+coverage*1.55)+Math.max(0,matched.length-1)*0.7;
  // Very short or generic questions must earn evidence; no model-specific data can be fabricated.
  const nq=normalize(q);
  if(nq.length>=10&&normalize(c.text).includes(nq))score+=4;
  return {chunk:c,score,coverage,matched};
 }).filter(c=>c.score>0).sort((a,b)=>b.score-a.score);
 const top=scored[0];
 if(!top)return base;
 const minimum=Math.min(query.length,2);
 if(top.matched.length<minimum||(query.length>=3&&top.coverage<0.44)||(query.length===1&&top.score<0.75)){
  return {...base,reason:"Suchbegriffe kommen im PDF vor, aber keine Passage deckt die Frage ausreichend ab."};
 }
 const evidence=[];const used=new Set();
 for(const x of scored){
  if(evidence.length>=3)break;
  if(x.score<top.score*0.46)break;
  if(used.has(x.chunk.page))continue;
  if(x.matched.length<minimum)continue;
  used.add(x.chunk.page);
  evidence.push({page:x.chunk.page,excerpt:x.chunk.text,matchedTerms:x.matched,coverage:x.coverage,score:Math.round(x.score*100)/100});
 }
 if(!evidence.length)return base;
 return {status:"evidence",reason:"Textpassage gefunden. Bitte die Originalseite vor einer Verwendung prüfen.",answer:evidence[0].excerpt,evidence};
}
return {MAX_BYTES,MAX_PAGES,normalize,tokenize,getConcepts,chunkPages,search,classify};
});