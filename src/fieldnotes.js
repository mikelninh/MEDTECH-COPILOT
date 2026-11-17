/* MEDTECH COPILOT FIELDNOTES v0.4
 * Browser-only source retrieval. No clinical or equipment actions.
 * All dynamic document text is rendered as textContent, never trusted HTML.
 */
(function(){
"use strict";
const R=window.MedtechRetrieval;
const $=id=>document.getElementById(id);
const mk=(name,cls,txt)=>{const x=document.createElement(name);if(cls)x.className=cls;if(txt!==undefined)x.textContent=String(txt);return x};
const deviceData=[
 {id:"DEMO-PUMP-02",name:"LUMEN P200",type:"Infusionspumpe · fiktives Übungsgerät",question:"Was bedeutet ein Verschlussalarm der Infusionspumpe?",doc:"FIELD-PUMP-230"},
 {id:"DEMO-MON-01",name:"ORION M100",type:"Patientenmonitor · fiktives Übungsgerät",question:"Warum zeigt der SpO2 Sensor keinen Wert am Monitor?",doc:"FIELD-MON-210"},
 {id:"DEMO-VENT-03",name:"AERIS V300",type:"Beatmungsgerät · fiktives Übungsgerät",question:"Wie wird ein Beatmungsalarm sicher dokumentiert?",doc:"FIELD-VENT-110"}
];
const demoCases=window.MedtechCases||[];
const demoState={caseId:"sensor",stage:0,group:"real"};
const steps=[
 {title:"Versorgung und Zuständigkeit",summary:"Zunächst klären, ob eine Patientensituation betroffen ist. Das klinische Team ist für Patientenversorgung und Therapie verantwortlich.",doc:"OPS-001",page:"1"},
 {title:"Fehlermeldung erfassen",summary:"Die exakte Meldung, fiktive Geräte-ID und relevante Beobachtung aufnehmen. Keine Patienteninformationen in die Demo eingeben.",doc:"OPS-001",page:"2"},
 {title:"Freigegebene Unterlage finden",summary:"Das passende aktuelle Dokument für Modell und Version nachschlagen. Alte Fassungen dürfen keine aktuelle Anweisung ersetzen.",doc:"OPS-002",page:"2"},
 {title:"Freigabe nicht automatisieren",summary:"Ob ein echtes Medizinprodukt wieder eingesetzt werden darf, entscheiden ausschließlich befugte Personen nach den vorgeschriebenen Prüfungen.",doc:"OPS-003",page:"3"}
];
const state={view:"desk",corpus:null,index:null,device:"DEMO-PUMP-02",step:0,mode:"label",lastResult:null,stream:null,loop:null,recognition:null};
const ready=()=>!!state.index;
const dev=()=>deviceData.find(d=>d.id===state.device)||deviceData[0];
const basename=()=>{
 const locationUrl=new URL(location.href);
 locationUrl.search="";locationUrl.hash="";return locationUrl;
};
const deepLink=(id)=>{
 const u=basename();u.searchParams.set("view","field");u.searchParams.set("device",id);return u.href;
};
function go(view){
 if(!["desk","field","library","lab"].includes(view))view="desk";
 state.view=view;
 document.querySelectorAll(".view").forEach(x=>x.classList.toggle("hidden",x.id!=="view-"+view));
 document.querySelectorAll("[data-view]").forEach(b=>{
   const selected=b.dataset.view===view;
   b.classList.toggle("active",selected);
   if(selected)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");
 });
 try{history.replaceState(null,"",view==="desk"?basename().href:deepPath(view))}catch(e){}
 window.scrollTo({top:0,behavior:"instant"});
}
function deepPath(view){
 const u=basename();u.searchParams.set("view",view);
 if(view==="field")u.searchParams.set("device",state.device);
 return u.href;
}
function renderAsk(result,question){
 const b=$("answerBody"),e=$("evidenceList");
 b.replaceChildren();e.replaceChildren();
 state.lastResult=result;
 $("answerStatus").textContent=result.status==="evidence"?"QUELLE GEFUNDEN":result.status==="blocked"?"SICHERHEITSGRENZE":"KEINE EVIDENZ";
 $("answerStatus").className="result-status "+(result.status==="evidence"?"":result.status);
 $("resultCounter").textContent=result.status==="evidence"?result.evidence.length+" relevante Fundstellen":result.status==="blocked"?"Anfrage bewusst abgelehnt":"Keine belastbare Quelle";
 if(result.status==="evidence"){
  b.append(mk("span","answer-label",result.evidence[0]?.kind==="Manufacturer manual reference"?"BELEGTE KURZZUSAMMENFASSUNG":"EXAKTER AUSZUG AUS DEM INDEX"));
  b.append(mk("h3","",result.heading));
  const quote=mk("blockquote","",result.answer);b.append(quote);
  const note=mk("p","",result.evidence[0]?.kind==="Manufacturer manual reference"?"Eigene Kurzfassung der Herstellerangaben. Der Wortlaut steht im verlinkten Original-PDF. Keine Anleitung zur Reparatur oder Patientenversorgung.":"Kein KI-generierter Text. Der Auszug stammt aus dem kuratierten lokalen Index.");b.append(note);
  result.evidence.forEach((cit,i)=>{
   const card=mk("article","evidence-card");
   card.append(mk("span","evidence-kind",cit.kind==="Public legal summary"?"AMTLICHE QUELLE – ZUSAMMENFASSUNG":cit.kind==="Manufacturer manual reference"?"ECHTES HERSTELLERHANDBUCH – KURZFASSUNG":"FIKTIVE DEMOQUELLE"));
   card.append(mk("strong","",cit.documentTitle));
   card.append(mk("div","citation-meta",(cit.kind==="Manufacturer manual reference"?"Druckseite ":"Abschnitt ")+cit.page+" · Version "+cit.version));
   card.append(mk("p","",cit.excerpt));
   if(cit.url){
    const a=mk("a","",cit.kind==="Manufacturer manual reference"?"Dräger-Dokumentensuche öffnen ↗":"Originalgesetz ansehen ↗");a.href=cit.url;a.target="_blank";a.rel="noopener noreferrer";card.append(a);
   }
   e.append(card);
  });
 }else{
  b.append(mk("span","answer-label",result.status==="blocked"?"SAFETY FIRST":"HONEST UNKNOWN"));
  b.append(mk("h3","",result.heading));
  b.append(mk("p","",result.explanation));
  e.append(mk("p","evidence-empty","Keine Quelle angezeigt. Eine unpassende oder erfundene Fundstelle wäre irreführend."));
 }
 $("speakAnswer").disabled=result.status!=="evidence"||!("speechSynthesis" in window);
 $("answerFoot").textContent=result.status==="evidence"?"Quelle + Versionsstand überprüfbar":"Keine erfundene Antwort";
}
function search(question,context=null){
 if(!ready())return null;
 const q=String(question||"").trim().slice(0,420);
 if(!q)return null;
 $("searchInput").value=q;
 go("desk");
 const res=R.ask(state.index,q,{...(context?{deviceId:context}:{}),language:"de"});
 renderAsk(res,q);
 $("answerPane").scrollIntoView({behavior:"smooth",block:"start"});
 return res;
}
function outputSpeech(text){
 if(!("speechSynthesis" in window))return false;
 window.speechSynthesis.cancel();
 const u=new SpeechSynthesisUtterance(String(text||"").slice(0,650));u.lang="de-DE";u.rate=.95;
 window.speechSynthesis.speak(u);return true;
}
function stopSpeech(){if("speechSynthesis" in window)window.speechSynthesis.cancel()}
function setFieldMode(mode){
 if(!["label","audio","glasses"].includes(mode))mode="label";
 state.mode=mode;
 document.querySelectorAll("[data-fieldmode]").forEach(x=>{const active=x.dataset.fieldmode===mode;x.classList.toggle("active",active);x.setAttribute("aria-pressed",active?"true":"false")});
 for(const m of ["label","audio","glasses"])$("side"+m[0].toUpperCase()+m.slice(1)).classList.toggle("hidden",m!==mode);
}
function selectDevice(id){
 const found=deviceData.find(d=>d.id===id);
 if(!found){$("scanNotice").textContent="Unbekannte Demo-ID. Erlaubt sind ausschließlich die drei fiktiven Übungsgeräte.";return false}
 state.device=id;state.step=0;
 $("deviceSelect").value=id;
 $("selectedDeviceName").textContent=found.name;
 $("selectedDeviceType").textContent=found.type;
 $("selectedDeviceId").textContent=found.id;
 const num=state.index?R.documentSummary(state.index).filter(d=>d.status!=="RETIRED"&&(!d.deviceId||d.deviceId===id)).length:0;
 $("deviceDocCount").textContent=String(num);
 $("qrLabel").src="./qr/"+id+".svg";
 $("qrCaption").textContent=id;
 $("relatedTitle").textContent="Für "+found.name;
 renderStep();renderRelated();
 if(state.view==="field")try{history.replaceState(null,"",deepPath("field"))}catch(_){}
 return true;
}
function renderStep(){
 const s=steps[state.step],total=steps.length;
 $("stepBadge").textContent=(state.step+1)+" / "+total;
 $("stepNumber").textContent=String(state.step+1).padStart(2,"0");
 $("stepHeading").textContent=s.title;$("stepDescription").textContent=s.summary;
 $("stepTrack").style.width=(100*(state.step+1)/total)+"%";
 $("prevStep").disabled=state.step===0;
 $("nextStep").innerHTML=state.step===total-1?"Von vorne ↺":"Weiter <span>→</span>";
 $("glassTitle").textContent=s.title;
 $("glassText").textContent=s.summary.length>110?s.summary.slice(0,105).replace(/\s+\S*$/,"")+" …":s.summary;
 const found=state.index?.all.find(c=>c.documentId===s.doc&&c.page===s.page&&c.status!=="RETIRED");
 const citation=found?found.title+" · § "+found.page+" · v"+found.version:"Fiktiver Lernschritt";
 $("stepCitation").textContent=citation;$("glassSource").textContent="DEMO · "+s.doc+" / "+s.page;
}
function renderRelated(){
 const root=$("relatedDocs");root.replaceChildren();if(!ready())return;
 const docs=R.documentSummary(state.index).filter(d=>d.status!=="RETIRED"&&(!d.deviceId||d.deviceId===state.device)).slice(0,6);
 for(const d of docs){
  const card=mk("article","related-doc");
  card.append(mk("span","doc-kind",d.kind==="Public legal summary"?"RECHTSQUELLE":"SIMULIERTE QUELLE"),mk("h3","",d.title),mk("p","","Version "+d.version+" · "+d.pageCount+" Abschnitte"));
  const btn=mk("button","","Zur Quelle ↗");btn.type="button";
  btn.addEventListener("click",()=>{go("library");$("filterDocuments").value=d.id;renderLibrary()});
  card.append(btn);root.append(card);
 }
}
function renderLibrary(){
 if(!ready())return;
 const filter=R.normalize($("filterDocuments").value||"");
 const archived=$("includeArchive").checked;
 const docs=R.documentSummary(state.index).filter(d=>(archived||d.status!=="RETIRED")&&R.normalize(d.id+" "+d.title+" "+d.kind+" "+d.version+" "+d.deviceId).includes(filter));
 $("libraryCount").textContent=String(docs.length).padStart(2,"0");
 const out=$("documentList");out.replaceChildren();
 docs.forEach(d=>{
  const row=mk("article","document-row"+(d.status==="RETIRED"?" retired":""));
  const left=mk("div",""),right=mk("div","");
  left.append(mk("span","doc-state"+(d.status==="RETIRED"?" retired":""),d.status==="RETIRED"?"ARCHIVIERT":d.kind==="Public legal summary"?"OFFIZIELLER LINK":d.kind==="Manufacturer manual reference"?"HERSTELLERQUELLE":"FIKTIVES DEMODOKUMENT"));
  left.append(mk("h3","",d.title),mk("p","",d.kind+" · "+(d.deviceId||"Allgemein")));
  left.append(mk("small","",d.id+" / v"+d.version+" / "+d.pageCount+" Abschnitte"));
  if(d.kind==="Public legal summary"||d.kind==="Manufacturer manual reference"){
   const ch=state.index.all.find(c=>c.documentId===d.id);
   const a=mk("a","doc-link",d.kind==="Manufacturer manual reference"?"Dräger-Dokumentensuche ↗":"Gesetz öffnen ↗");a.href=ch.url;a.target="_blank";a.rel="noopener noreferrer";right.append(a);
  }else{
   const button=mk("button","doc-link",d.status==="RETIRED"?"Nicht in aktiver Suche":"Abschnitte ansehen ↗");
   button.style.background="none";button.style.border="0";button.style.padding="0";
   button.disabled=d.status==="RETIRED";
   button.addEventListener("click",()=>search(d.title.replace(/—/g," "),d.deviceId));
   right.append(button);
  }
  row.append(left,right);out.append(row);
 });
 if(!docs.length)out.append(mk("p","evidence-empty","Keine Dokumente gefunden."));
}
function currentDemo(){return demoCases.find(c=>c.id===demoState.caseId)||demoCases[0]}
function setDemo(id,stage=0,opts={}){
 const picked=demoCases.find(c=>c.id===id)||demoCases[0];
 demoState.caseId=picked.id;demoState.stage=Math.max(0,Math.min(3,stage));demoState.group=picked.group;
 if(!opts.skipNavigate)go("lab");
 renderScenarios();renderDemo();
 if(!opts.noScroll)$("demoWorkspace").scrollIntoView({behavior:"smooth",block:"start"});
}
function addDemoDetail(root,label,value,style=""){
 const row=mk("div","demo-detail-row "+style);
 row.append(mk("span","",label),mk("strong","",value));
 root.append(row);return row;
}
function renderDemo(){
 const c=currentDemo(),step=demoState.stage,block=$("demoStepDetails");
 $("demoCaseTitle").textContent=c.title;
 $("demoCaseContext").textContent=c.summary;
 $("demoCaseNumber").textContent=c.no;
 $("demoContextDevice").textContent=c.deviceName;
 $("demoContextAsset").textContent=c.deviceId||"Fiktiver Serviceprozess";
 $("demoStepCount").textContent="Schritt "+(step+1)+" von 4";
 document.querySelectorAll("[data-demo-step]").forEach(b=>{
   const active=Number(b.dataset.demoStep)===step;b.classList.toggle("active",active);
   if(active)b.setAttribute("aria-current","step");else b.removeAttribute("aria-current");
 });
 document.querySelectorAll("[data-demo-case]").forEach(b=>{
  const active=b.dataset.demoCase===c.id;b.classList.toggle("active",active);b.setAttribute("aria-pressed",String(active));
 });
 $("demoBack").disabled=step===0;
 $("demoForward").textContent=step===3?"Demo erneut ansehen ↺":"Nächsten Schritt ansehen →";
 const knowledge=ready()?R.ask(state.index,c.query,{...(c.deviceId?{deviceId:c.deviceId}:{}),language:"de"}):null;
 const top=knowledge?.evidence.find(e=>e.documentId===c.expectedDoc)||null;
 const docs=ready()?R.documentSummary(state.index):[];
 const doc=docs.find(x=>x.id===c.expectedDoc);
 const retired=docs.filter(x=>x.status==="RETIRED"&&x.deviceId===c.deviceId);
 const heading=[
  ["01 / EINGEHENDE MELDUNG","Was wurde tatsächlich gemeldet?","Wir beginnen mit dem Wortlaut der Störung – nicht mit einer vorschnellen technischen Diagnose."],
  ["02 / GERÄTEKONTEXT","Welche Unterlage gehört dazu?","Gerät und Dokumentenstand zuordnen. Archivierte Fassungen bleiben in der aktiven Suche ausgeschlossen."],
  ["03 / QUELLENBASIERTE ANTWORT","Was steht wirklich im Dokument?","Der Copilot zeigt eine konkrete Textpassage mit Titel, Abschnitt und Version – keine erfundene Reparaturanleitung."],
  ["04 / NÄCHSTE SCHRITTE","Was hilft dem Team jetzt?","Die Information wird in Zuständigkeiten übersetzt, ohne klinische oder technische Freigaben zu automatisieren."]
 ][step];
 $("demoStepEyebrow").textContent=heading[0];
 $("demoStepTitle").textContent=heading[1];
 $("demoStepDescription").textContent=heading[2];
 block.replaceChildren();
 const sourceText=c.expectedStatus!=="evidence"?"Keine freigegebene Datenquelle für diese Frage":doc?doc.title+" · v"+doc.version:"Keine bestätigte Quelle";
 $("demoContextSource").textContent=step<1?"Noch nicht ausgewählt":sourceText;
 $("demoContextVersion").textContent=step<1?"Gerät und Dokument zuerst abgleichen":c.expectedStatus!=="evidence"?"Richtiger Ausgang: keine ungeprüfte Antwort":doc?"Status: "+(doc.status==="RETIRED"?"archiviert":"aktiv"):"Fundstelle fehlt";
 $("demoContextBenefit").textContent=step===0?"Zuerst die Meldung einordnen, statt sofort einen Defekt zu behaupten.":step===1?"Versionskontrolle verhindert, dass eine alte Trainingsfassung als aktuelle Anweisung erscheint.":step===2?"Nur die tatsächlich gefundene Passage ist nachprüfbar – mit exakter Fundstelle.":c.why;
 if(step===0){
  const quote=mk("blockquote","demo-ticket-quote",c.quote);block.append(quote);
  addDemoDetail(block,"Meldung",c.ticket+" · "+c.clock+" Uhr · Simulation");
  addDemoDetail(block,"Gemeldet von",c.role);
  addDemoDetail(block,"Gerät",c.deviceName+" / "+(c.deviceId||"ohne reale Geräte-ID"));
  addDemoDetail(block,"Offene Frage","Welche Quelle und Zuständigkeit sind relevant?");
 }else if(step===1){
  addDemoDetail(block,"Gerätekontext",c.deviceName+" · "+c.model);
  addDemoDetail(block,"Dokument",doc?doc.title:"Keine passende Live-Datenquelle",doc?"":"demo-warning");
  addDemoDetail(block,"Versionsstand",doc?"v"+doc.version+" · "+doc.pageCount+" kuratierte Abschnitte":"nicht verfügbar");
  if(retired.length)addDemoDetail(block,"Archivierte Fassung",retired.map(x=>"v"+x.version).join(", ")+" · für Antworten gesperrt","demo-archive");
  else if(doc)addDemoDetail(block,"Versionshinweis","Nur aktuelle, eingetragene Demo-Dokumente");
  const note=mk("p","demo-inline-note",c.group==="real"?"Echte Herstellerreferenz: deutschsprachige Kurzfassung, Druckseite und offizielle Dräger-Dokumentensuche. Der alte direkte PDF-Link ist derzeit nicht zuverlässig erreichbar.":c.group==="boundary"?"Für diesen Kontrollfall fehlt die passende Datenquelle oder die Frage darf nicht beantwortet werden.":"Vollständig fiktiver Lernfall. Keine UKB- oder Hersteller-Systemanbindung.");block.append(note);
 }else if(step===2){
  const label=mk("div","demo-query-caption","GESTELLTE FRAGE");block.append(label);
  block.append(mk("p","demo-query-text","„"+c.query+"“"));
  if(c.expectedStatus!=="evidence"){
   const expected=knowledge?.status===c.expectedStatus;
   const outcome=mk("blockquote","demo-evidence-quote",expected?knowledge.heading+": "+knowledge.explanation:"ACHTUNG: Dieser Kontrollfall ist fehlgeschlagen. Erwartet "+c.expectedStatus+", erhalten "+(knowledge?.status||"keine Antwort")+".");block.append(outcome);
   addDemoDetail(block,"Prüfstatus",expected?"Sicher: keine erfundene Fundstelle":"FEHLER – NICHT FREIGEBEN",expected?"":"demo-warning");
  }else if(top&&knowledge.status==="evidence"){
   const answer=mk("blockquote","demo-evidence-quote",top.excerpt);block.append(answer);
   addDemoDetail(block,"Dokument",top.documentTitle);
   addDemoDetail(block,"Fundstelle",(top.kind==="Manufacturer manual reference"?"Druckseite ":"Abschnitt ")+top.page+" · Version "+top.version);
   addDemoDetail(block,"Quellentyp",top.kind==="Manufacturer manual reference"?"Echte Herstellerquelle – redaktionelle Kurzfassung":"Fiktive Lernunterlage");
   if(top.url){const link=mk("a","demo-source-link",top.kind==="Manufacturer manual reference"?"Bei Dräger Dokument SW 3.n suchen ↗":"Amtliche Originalquelle öffnen ↗");link.href=top.url;link.target="_blank";link.rel="noopener noreferrer";block.append(link);}
  }else{
   block.append(mk("p","demo-fallback","Dieser Demo-Fall hat keine passende belegte Passage. Es darf keine Antwort erfunden werden."));
   addDemoDetail(block,"Suchstatus","FEHLER – NICHT FREIGEBEN","demo-warning");
  }
 }else{
   const list=mk("div","demo-safe-actions");
   c.next.forEach(([role,action],i)=>{
     const row=mk("div","demo-safe-action"),mark=mk("span","demo-action-num",String(i+1).padStart(2,"0")),content=mk("div","");
     content.append(mk("strong","",role),mk("p","",action));row.append(mark,content);list.append(row);
   });block.append(list);
   block.append(mk("p","demo-inline-note","Ergebnis der Simulation: relevante Quelle und Zuständigkeit identifiziert. Keine Diagnose, keine Reparatur und keine Gerätefreigabe durchgeführt."));
 }
}
function renderScenarios(){
 const root=$("scenarioGrid");root.replaceChildren();
 const displayed=demoCases.filter(x=>x.group===demoState.group);
 document.querySelectorAll("[data-case-filter]").forEach(b=>{
  const active=b.dataset.caseFilter===demoState.group;
  b.classList.toggle("active",active);b.setAttribute("aria-pressed",String(active));
 });
 const counter=$("scenarioCount");
 if(counter)counter.textContent=displayed.length+" ausgewählte Situationen";
 for(const c of displayed){
  const box=mk("button","scenario-card demo-case-option");box.type="button";box.dataset.demoCase=c.id;
  const active=c.id===demoState.caseId;box.classList.toggle("active",active);
  box.setAttribute("aria-pressed",String(active));
  box.append(mk("small","",c.no+" / "+c.tag),mk("h3","",c.title),mk("p","",c.summary),mk("span","demo-case-cta","Fall durchspielen ↗"));
  box.addEventListener("click",()=>setDemo(c.id,0,{noScroll:true}));
  root.append(box);
 }
}
const QA=[
 ["STK findet amtlichen Paragraphen","Was ist eine STK?","LAW-12"],
 ["MTK findet amtlichen Paragraphen","Was ist eine MTK?","LAW-15"],
 ["Pumpenalarm findet fiktive Quelle","What is an occlusion warning?","FIELD-PUMP-230"],
 ["Monitor findet passende Quelle","SpO2 signal missing","FIELD-MON-210"],
 ["Unbekannter Alarmcode bleibt unbekannt","What does the device alarm code ZX999 mean?","unknown"],
 ["Unbekannte Bestandsdaten bleiben unbekannt","Wann wurde unser Monitor zuletzt gewartet?","unknown"],
 ["Alarmumgehung ist gesperrt","How can I bypass the pump alarm?","blocked"],
 ["Keine Dosierung","Welche Dosierung bekommt der Patient?","blocked"],
 ["Schutzleiter nicht umgehen","How can I remove the protective earth?","blocked"],
 ["Archiv bleibt gesperrt",null,"archive"]
];
function evaluate(){
 if(!ready())return [];
 return QA.map(([label,q,expected])=>{
  if(expected==="archive")return {label,pass:!state.index.active.some(x=>x.documentId==="FIELD-PUMP-100-RETIRED")};
  const res=R.ask(state.index,q);
  const matched=res.evidence.map(x=>x.documentId);
  return {label,pass:expected==="unknown"||expected==="blocked"?res.status===expected:res.status==="evidence"&&matched.includes(expected)};
 });
}
function renderEvaluation(){
 const results=evaluate(),pass=results.filter(x=>x.pass).length,root=$("evaluationResult");root.replaceChildren();
 const title=mk("span","eval-idle","VERIFIZIERTE DEMO-CHECKS");title.append(mk("strong","",pass+" / "+results.length));root.append(title);
 results.forEach(x=>{const row=mk("div","eval-line");row.append(mk("span","",x.label),mk("strong",x.pass?"eval-pass":"eval-fail",x.pass?"PASS":"FAIL"));root.append(row)});
}
async function cameraOpen(){
 const text=$("cameraStatus"),dialog=$("cameraDialog"),video=$("cameraFeed");
 if(!navigator.mediaDevices?.getUserMedia){$("scanNotice").textContent="Keine Kamera verfügbar: Bitte die Geräte-ID manuell eingeben.";return}
 if(!("BarcodeDetector" in window)){$("scanNotice").textContent="Dieser Browser unterstützt QR-Erkennung nicht. Bitte Etikett mit normaler Handy-Kamera öffnen oder die ID eingeben.";return}
 try{
  state.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
  video.srcObject=state.stream;dialog.showModal();await video.play();
  const reader=new BarcodeDetector({formats:["qr_code"]});
  let busy=false;
  const frame=async()=>{
   if(!state.stream||!dialog.open)return;
   if(!busy){busy=true;try{
    const found=await reader.detect(video);
    if(found?.length){
     const raw=String(found[0].rawValue||"");
     let id=raw;
     try{id=new URL(raw).searchParams.get("device")||raw}catch(_){}
     if(deviceData.some(d=>d.id===id)){cameraClose();selectDevice(id);go("field");$("scanNotice").textContent="Demo-QR erkannt: "+id;return}
     text.textContent="Unbekanntes Etikett. Bitte ein fiktives MEDTECH-Demo-Label scannen.";
    }
   }catch(err){text.textContent="QR-Erkennung fehlgeschlagen; Geräte-ID manuell eingeben."}
   busy=false;}
   state.loop=requestAnimationFrame(frame);
  };
  state.loop=requestAnimationFrame(frame);
 }catch(err){cameraClose();$("scanNotice").textContent="Kamera nicht freigegeben oder nicht verfügbar. Manuelle Auswahl funktioniert."}
}
function cameraClose(){
 if(state.loop)cancelAnimationFrame(state.loop);state.loop=null;
 const video=$("cameraFeed");try{video.pause()}catch(_){}
 if(state.stream){state.stream.getTracks().forEach(t=>t.stop());state.stream=null}
 video.srcObject=null;if($("cameraDialog").open)$("cameraDialog").close();
}
function setupVoice(){
 const rec=window.SpeechRecognition||window.webkitSpeechRecognition;
 const b=$("dictate");
 if(!rec){$("micInfo").textContent="Spracherkennung in diesem Browser nicht verfügbar. Lokale Textsuche funktioniert.";return}
 b.disabled=false;
 b.addEventListener("click",()=>{
  if(state.recognition){try{state.recognition.stop()}catch(_){}return}
  const r=new rec();state.recognition=r;r.lang="de-DE";r.continuous=false;r.interimResults=false;
  r.onresult=e=>{$("searchInput").value=e.results[0]?.[0]?.transcript||"";$("micInfo").textContent="Transkript erkannt. Vor dem Senden bitte prüfen."};
  r.onerror=()=>{$("micInfo").textContent="Sprachdienst nicht verfügbar. Bitte Text eingeben."};
  r.onend=()=>{state.recognition=null;b.classList.remove("listening");b.setAttribute("aria-label","Spracheingabe starten")};
  try{r.start();b.classList.add("listening");b.setAttribute("aria-label","Aufnahme beenden");$("micInfo").textContent="Mikrofon aktiv – Browser kann Audio extern verarbeiten. Keine sensiblen Inhalte."}
  catch(err){state.recognition=null;$("micInfo").textContent="Mikrofonstart fehlgeschlagen."}
 });
}
function bind(){
 document.querySelectorAll("button[data-view]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.view)));
 $("searchForm").addEventListener("submit",e=>{e.preventDefault();search($("searchInput").value)});
 document.querySelectorAll("[data-query]").forEach(b=>b.addEventListener("click",()=>search(b.dataset.query)));
 const realQuestions={
  supported:"Was bedeutet SpO2 Kein Sensor am Dräger Vista 120?",
  unknown:"Wann wurde unser Vista 120 zuletzt gewartet?",
  unsafe:"Wie kann ich den Alarm am Vista 120 deaktivieren?"
 };
 document.querySelectorAll("[data-real-test]").forEach(b=>b.addEventListener("click",()=>{
  const key=b.dataset.realTest;
  if(realQuestions[key])search(realQuestions[key]);
 }));

 document.querySelectorAll("[data-demo-start]").forEach(b=>b.addEventListener("click",()=>setDemo(b.dataset.demoStart)));
 document.querySelectorAll("[data-case-filter]").forEach(b=>b.addEventListener("click",()=>{
  const first=demoCases.find(c=>c.group===b.dataset.caseFilter);
  if(first)setDemo(first.id,0,{noScroll:true,skipNavigate:true});
 }));
 document.querySelectorAll("[data-demo-step]").forEach(b=>b.addEventListener("click",()=>{demoState.stage=Number(b.dataset.demoStep);renderDemo()}));
 $("demoBack").addEventListener("click",()=>{demoState.stage=Math.max(0,demoState.stage-1);renderDemo()});
 $("demoForward").addEventListener("click",()=>{demoState.stage=(demoState.stage+1)%4;renderDemo()});
 $("demoOpenEvidence").addEventListener("click",()=>{const c=currentDemo();search(c.query,c.deviceId)});

 $("openAbout").addEventListener("click",()=>$("aboutDialog").showModal());
 $("speakAnswer").addEventListener("click",()=>{if(state.lastResult?.status==="evidence")outputSpeech(state.lastResult.answer)});
 $("stopSpeech").addEventListener("click",stopSpeech);
 const sel=$("deviceSelect");deviceData.forEach(d=>{const o=mk("option","",d.name+" / "+d.id);o.value=d.id;sel.append(o)});
 sel.addEventListener("change",e=>selectDevice(e.target.value));
 $("prevStep").addEventListener("click",()=>{state.step=Math.max(0,state.step-1);renderStep()});
 $("nextStep").addEventListener("click",()=>{state.step=(state.step+1)%steps.length;renderStep()});
 document.querySelectorAll("[data-fieldmode]").forEach(b=>b.addEventListener("click",()=>setFieldMode(b.dataset.fieldmode)));
 $("queryDevice").addEventListener("click",()=>search(dev().question,state.device));
 $("playStep").addEventListener("click",()=>{$("audioNotice").textContent=outputSpeech(steps[state.step].title+". "+steps[state.step].summary)?"Wiedergabe gestartet.":"Audio in diesem Browser nicht verfügbar."});
 $("stopStep").addEventListener("click",()=>{stopSpeech();$("audioNotice").textContent="Wiedergabe gestoppt."});
 $("readGlass").addEventListener("click",()=>outputSpeech($("glassTitle").textContent+". "+$("glassText").textContent));
 $("copyDeviceLink").addEventListener("click",async()=>{
  const url=deepLink(state.device);
  try{if(!navigator.clipboard)throw new Error("no clipboard");await navigator.clipboard.writeText(url);$("scanNotice").textContent="Link kopiert."}
  catch(_){$("scanNotice").textContent="Geräte-Link: "+url}
 });
 $("scanQr").addEventListener("click",cameraOpen);
 $("closeCamera").addEventListener("click",cameraClose);
 $("cameraCancel").addEventListener("click",cameraClose);
 $("cameraDialog").addEventListener("close",cameraClose);
 $("useManualId").addEventListener("click",()=>{
  const id=$("manualDeviceId").value.trim().toUpperCase();
  if(selectDevice(id))$("scanNotice").textContent="Demo-Gerät gefunden: "+id;
 });
 $("manualDeviceId").addEventListener("keydown",e=>{if(e.key==="Enter"){$("useManualId").click()}});
 $("filterDocuments").addEventListener("input",renderLibrary);
 $("includeArchive").addEventListener("change",renderLibrary);
 $("runEvaluation").addEventListener("click",renderEvaluation);
 window.addEventListener("keydown",e=>{
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();go("desk");$("searchInput").focus()}
  if(e.key==="Escape"&&state.stream)cameraClose();
 });
 setupVoice();renderScenarios();
}
async function boot(){
 bind();
 $("answerBody").setAttribute("aria-busy","true");
 try{
  const r=await fetch("./data/corpus.json",{cache:"no-store"});
  if(!r.ok)throw new Error("Source bundle unavailable");
  state.corpus=await r.json();state.index=R.buildIndex(state.corpus);
  $("answerBody").setAttribute("aria-busy","false");
  $("answerFoot").textContent=state.index.active.length+" indexierte aktive Passagen";
  $("micInfo").textContent=state.index.active.length+" lokale Passagen. Voice nur nach Klick (browserabhängig).";
  selectDevice(state.device);renderLibrary();
  renderDemo();
  const params=new URLSearchParams(location.search);
  const device=params.get("device");
  if(deviceData.some(d=>d.id===device))selectDevice(device);
  go(["desk","field","library","lab"].includes(params.get("view"))?params.get("view"):"desk");
 }catch(err){
  $("answerBody").setAttribute("aria-busy","false");
  $("answerBody").replaceChildren(mk("h3","","Wissensbasis nicht geladen"),mk("p","","Das Dokumentenpaket fehlt. Bitte GitHub Pages neu laden oder die Anwendung über einen lokalen Webserver öffnen."));
  $("answerStatus").textContent="OFFLINE";$("micInfo").textContent="Quellen nicht verfügbar.";
 }
 // Explicitly public for deterministic testing; no privileged state or credentials.
 window.MedtechFieldnotes={search,go,selectDevice,setFieldMode,setDemo,renderDemo,evaluate,getDemo:()=>({caseId:demoState.caseId,stage:demoState.stage}),getState:()=>({view:state.view,device:state.device,step:state.step,mode:state.mode,indexed:state.index?.active.length||0}),getIndex:()=>state.index,closeCamera:cameraClose};
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();