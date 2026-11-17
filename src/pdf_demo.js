/* MEDTECH COPILOT V0.8 – real PDF proof module.
 * Source snippets are generated from the original PDF during CI, not invented.
 * No patient data. No speech recognition. Read-only educational prototype.
 */
(function(){
"use strict";
const $=id=>document.getElementById(id),R=window.MedtechPDFEvidence;
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
let index=null;
const questions={
 battery:"Was steht zur tiefentladenen Batterie im Philips Addendum?",
 unknown:"Wann wurde unser Philips Monitor zuletzt gewartet?",
 unsafe:"Wie kann ich die Philips Alarme deaktivieren?",
 heat:"Welche Risiken nennt Philips bei hoher Umgebungstemperatur?",
 limits:"Wo werden die Alarmgrenzen im Philips IntelliVue Addendum erklärt?",
 nanopod:"Wofür wird das NanoPod Kapnographie-Modul genannt?",
 co2:"Welche CO2 Interferenzen nennt das Philips Addendum?"
};
function display(answer){
 const body=$("pdfAnswer"),source=$("pdfEvidence");
 body.replaceChildren();source.replaceChildren();
 const style=answer.status==="evidence"?"ok":answer.status==="blocked"?"blocked":"unknown";
 $("pdfAnswerStatus").className="pdf-answer-status "+style;
 $("pdfAnswerStatus").textContent=answer.status==="evidence"?"ORIGINALSEITE GEFUNDEN":answer.status==="blocked"?"SICHERHEITSGRENZE":"NICHT BELEGTE ANTWORT";
 body.append(el("h3","",answer.status==="evidence"?"Das steht in der Quelle":answer.heading));
 body.append(el("p","",answer.status==="evidence"?answer.answer:answer.explanation));
 if(answer.status==="evidence"){
  body.append(el("span","pdf-mini-label","KURZER TEXTAUSZUG AUS DEM PDF"));
  body.append(el("blockquote","pdf-extract",answer.excerpt));
  const c=answer.citation;
  source.append(el("span","pdf-mini-label","PRÜFBARE HERKUNFT"));
  source.append(el("strong","",c.document));
  source.append(el("p","",c.scope));
  source.append(el("p","pdf-citation-version","Dokument "+c.partNumber+" · "+c.edition+" · PDF-Seite "+c.pdfPage));
  const link=el("a","pdf-document-link","Original auf Seite "+c.pdfPage+" öffnen ↗");
  link.href=c.url;link.target="_blank";link.rel="noopener noreferrer";
  source.append(link);
  const short=el("small","","SHA-256 der heruntergeladenen PDF: "+c.sha256.slice(0,12)+"…");
  source.append(short);
 }else{
  source.append(el("span","pdf-mini-label","WARUM KEINE QUELLE ANGEZEIGT WIRD"));
  source.append(el("p","",answer.status==="blocked"?"Diese Anfrage darf keine technische oder klinische Handlungsanweisung auslösen.":"In diesem veröffentlichten PDF-Index liegt keine belegte Antwort auf diese konkrete Frage vor."));
 }
 $("pdfResults").classList.remove("hidden");
 $("pdfResults").scrollIntoView({block:"start",behavior:"smooth"});
 return answer;
}
function ask(question){
 if(!index)return;
 const q=String(question||"").trim();
 if(!q)return;
 $("pdfQuestion").value=q;
 return display(R.find(index,q));
}
async function boot(){
 if(!R||!$("pdfSearchForm"))return;
 $("pdfSearchForm").addEventListener("submit",e=>{e.preventDefault();ask($("pdfQuestion").value)});
 document.querySelectorAll("[data-pdf-case]").forEach(b=>b.addEventListener("click",()=>ask(questions[b.dataset.pdfCase])));
 try{
  const res=await fetch("./data/pdf_pages.json",{cache:"no-store"});
  if(!res.ok)throw new Error("Verifiziertes PDF-Paket fehlt");
  const data=await res.json();index=R.inspectIndex(data);
  $("pdfLoadStatus").textContent="ORIGINALDATEI GEPRÜFT · "+index.pageCount+" SEITEN";
  $("pdfSourceLabel").textContent="Philips · Dokument "+index.partNumber+" · Ausgabe "+index.edition;
  $("pdfSearchButton").disabled=false;
  document.querySelectorAll("[data-pdf-case]").forEach(b=>b.disabled=false);
 }catch(e){
  $("pdfLoadStatus").textContent="QUELLE NICHT VERIFIZIERT";
  $("pdfSourceLabel").textContent="Der Live-PDF-Nachweis fehlt. Diese Demo ist sicher deaktiviert.";
  $("pdfSearchButton").disabled=true;
 }
 window.MedtechPDFDemo={ask,getIndex:()=>index};
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
else boot();
})();