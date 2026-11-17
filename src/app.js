/* MEDTECH COPILOT v0.2 – accessible client-side user experience.
 * Static demonstrator only. There is no live UKB, patient, model, or document API.
 */
(function(){
"use strict";
const K=window.MedtechKnowledge;
if(!K)throw new Error("Knowledge module missing");
const byId=id=>document.getElementById(id);
const make=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=String(text);return el};
const deviceById=id=>K.devices.find(d=>d.id===id)||K.devices[0];
const state={screen:"home",deviceId:K.devices[0].id,step:0,lastAnswer:null,microphone:null,voiceActive:false};
const screens=["home","ask","field","library","lab"];
const titleOf={home:"Übersicht",ask:"Fragen & Quellen",field:"Am Gerät",library:"Wissensbasis",lab:"Demo Lab"};
function setFieldView(mode){
 const allowed=["phone","audio","glasses"];if(!allowed.includes(mode))mode="phone";
 const grid=byId("fieldGrid");if(grid)grid.dataset.view=mode;
 document.querySelectorAll("[data-field-view]").forEach(b=>{
  const current=b.dataset.fieldView===mode;b.classList.toggle("active",current);b.setAttribute("aria-pressed",String(current));
 });
}
const escapeFocus=()=>{
 const el=document.activeElement;
 if(el&&el.closest&&el.closest(".screen"))el.blur();
};
function navigate(to,opts={}){
 if(!screens.includes(to))return;
 escapeFocus();
 for(const s of screens)byId("screen-"+s).classList.toggle("hidden",s!==to);
 document.querySelectorAll("[data-screen]").forEach(el=>{
  const current=el.dataset.screen===to;
  if(el.matches("button"))el.classList.toggle("active",current);
  if(el.closest("nav"))el.setAttribute("aria-current",current?"page":"false");
 });
 byId("currentScreen").textContent=titleOf[to];
 state.screen=to;
 if(opts.scroll!==false)window.scrollTo({top:0,behavior:"instant"});
 if(opts.glass)setFieldView("glasses");
}
function renderSources(r){
 const dest=byId("evidenceContent");dest.replaceChildren();
 if(!r){dest.append(make("p","inspector-empty","Eine Antwort auswählen, um Fundstellen und Gültigkeit zu sehen."));return}
 const title=make("h3","evidence-title",r.kind==="sourced"?"Belegte Fundstelle":r.kind==="blocked"?"Sicherheitsgrenze":"Keine geeignete Quelle");dest.append(title);
 if(!r.sources.length){
  dest.append(make("div","evidence-status simulated",r.kind==="blocked"?"KEINE ANLEITUNG":"BEWUSST KEINE QUELLE"));
  dest.append(make("p","evidence-note",r.kind==="blocked"?"Der Prototyp verweigert diese Art von Anleitung. Eine erforderliche Fachentscheidung verbleibt beim zuständigen Personal.":"Es gibt keine ausreichende Evidenz im lokalen Demo-Korpus. Kein erfundener Beleg."));
  return;
 }
 r.sources.forEach(d=>{
  const block=make("div","evidence-block");
  const status=make("span","evidence-status "+(d.type==="simulation"?"simulated":""),d.type==="law"?"ÖFFENTLICHER GESETZESTEXT":"FIKTIVER LERNFALL");
  block.append(status,make("strong","",d.cite));
  block.append(make("p","",d.summary));
  block.append(make("p","evidence-note",d.version+" · "+d.id));
  if(d.url){const a=make("a","evidence-link","Originalquelle öffnen ↗");a.href=d.url;a.target="_blank";a.rel="noopener noreferrer";block.append(a)}
  else block.append(make("span","evidence-note","Kein externes Dokument: explizit simuliert"));
  dest.append(block);
 });
 dest.append(make("p","evidence-note","Geltungsbereich und Aktualität sind für echte Aufgaben durch zuständige Personen zu prüfen. Dies ist keine amtliche Auskunft oder Herstelleranweisung."));
}
function scrollChat(){const el=byId("messages");el.scrollTop=el.scrollHeight}
function sendQuestion(raw){
 const question=String(raw||"").trim().slice(0,500);if(!question)return;
 navigate("ask",{scroll:false});
 const user=make("div","chat-msg user");
 user.append(make("span","msg-person","DEINE FRAGE"),make("p","",question));byId("messages").append(user);
 const r=K.answer(question,state.deviceId);state.lastAnswer=r;
 const message=make("article","chat-msg assistant "+r.kind);
 message.append(make("span","msg-person","MEDTECH COPILOT"),make("h3","",r.title),make("p","",r.text));
 if(r.sources.length){
  const wrap=make("div","message-source");
  for(const s of r.sources){
   const b=make("button","source-pill","↗ "+s.cite);
   b.type="button";b.addEventListener("click",()=>{renderSources({kind:"sourced",sources:[s]});byId("sourceInspector").scrollIntoView({behavior:"smooth",block:"nearest"});});
   wrap.append(b);
  }message.append(wrap);
 }
 byId("messages").append(message);renderSources(r);byId("askInput").value="";
 byId("readLast").disabled=!(window.speechSynthesis);
 scrollChat();return r;
}
function readText(text){
 if(!("speechSynthesis" in window))return false;
 window.speechSynthesis.cancel();
 const utterance=new SpeechSynthesisUtterance(String(text).slice(0,500));utterance.lang="de-DE";utterance.rate=.95;
 window.speechSynthesis.speak(utterance);return true;
}
function setupVoice(){
 const Button=byId("voiceAsk"),status=byId("voiceStatus");
 const Rec=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!Rec){Button.disabled=true;status.textContent="Sprachaufnahme in diesem Browser nicht verfügbar. Texteingabe funktioniert jederzeit.";return}
 Button.disabled=false;
 Button.addEventListener("click",()=>{
  if(state.voiceActive&&state.microphone){state.microphone.stop();return}
  const recognition=new Rec();state.microphone=recognition;recognition.lang="de-DE";recognition.interimResults=false;recognition.continuous=false;
  recognition.onresult=e=>{const transcript=e.results[0]?.[0]?.transcript||"";byId("askInput").value=transcript;status.textContent="Text erkannt. Bitte vor dem Senden prüfen."};
  recognition.onerror=e=>{status.textContent="Spracherkennung nicht verfügbar: "+(e.error||"Fehler")+". Bitte tippen."};
  recognition.onend=()=>{state.voiceActive=false;Button.classList.remove("listening");Button.setAttribute("aria-label","Spracheingabe starten");if(status.textContent.includes("Zuhören"))status.textContent="Aufnahme beendet. Keine laufende Mikrofonverbindung."};
  try{recognition.start();state.voiceActive=true;Button.classList.add("listening");Button.setAttribute("aria-label","Sprachaufnahme beenden");status.textContent="Zuhören … Browser kann Sprache extern verarbeiten. Keine vertraulichen Daten."}
  catch(_){status.textContent="Mikrofonstart fehlgeschlagen. Bitte tippen."}
 });
}
function renderDevices(){
 const select=byId("fieldDevice");select.replaceChildren();
 K.devices.forEach(d=>{const o=make("option","",d.title+" · "+d.id);o.value=d.id;select.append(o)});
 select.value=state.deviceId;
 const d=deviceById(state.deviceId);
 byId("deviceTitle").textContent=d.title;
 byId("deviceSubtitle").textContent=d.subtitle;
 byId("deviceId").textContent=d.id;byId("deviceModel").textContent=d.model;
 renderStep();
}
function renderStep(){
 const flow=K.workflows[state.deviceId]||K.workflows[K.devices[0].id];state.step=Math.min(Math.max(state.step,0),flow.length-1);
 const step=flow[state.step];
 byId("stepNumber").textContent=String(state.step+1).padStart(2,"0");
 byId("stepTitle").textContent=step.title;byId("stepText").textContent=step.text;byId("stepOwner").textContent=step.owner;
 byId("stepCount").textContent=String(state.step+1).padStart(2,"0")+" / "+String(flow.length).padStart(2,"0");
 byId("stepProgress").style.width=(100*(state.step+1)/flow.length)+"%";
 byId("fieldPrev").disabled=state.step===0;byId("fieldNext").textContent=state.step===flow.length-1?"Von vorne ↺":"Nächster Schritt →";
 byId("glassesTitle").textContent=step.title;
 const small=step.text.length>115?step.text.slice(0,112).replace(/\s+\S*$/,"")+" …":step.text;
 byId("glassesText").textContent=small;
 byId("glassesSource").textContent="FIKTIV · Schritt "+(state.step+1)+"/"+flow.length;
}
function renderLibrary(){
 const filter=K.norm(byId("libraryFilter").value),includeArchived=byId("showArchived").checked;
 const match=K.sources.filter(d=>(includeArchived||d.state!=="RETIRED")&&K.norm(d.id+" "+d.title+" "+d.cite+" "+d.summary+" "+d.device).includes(filter));
 const list=byId("libraryList");list.replaceChildren();
 byId("librarySummary").textContent=match.length+" Fundstellen angezeigt · "+K.availableSources().length+" aktiv · 1 archivierte Demo-Fassung";
 for(const d of match){
  const row=make("article","doc"+(d.state==="RETIRED"?" archived":""));
  const left=make("div",""),right=make("div","doc-actions");
  const label=make("span","doc-pill "+(d.state==="RETIRED"?"retired":d.type==="simulation"?"sim":""),d.state==="RETIRED"?"ARCHIVIERT":d.type==="law"?"GESETZ":"FIKTIVE DEMO");
  left.append(label,make("span","doc-meta",d.id+" · "+d.version));
  left.append(make("h3","",d.title),make("p","",d.summary),make("span","doc-meta",d.cite+(d.device?" · "+d.device:"")));
  if(d.url){const a=make("a","","Original ↗");a.href=d.url;a.target="_blank";a.rel="noopener noreferrer";right.append(a)}
  else right.append(make("span","doc-meta",d.state==="RETIRED"?"Nicht suchbar":"Nur Lernsimulation"));
  row.append(left,right);list.append(row);
 }
 if(!match.length)list.append(make("p","inspector-empty","Keine passenden Fundstellen."));
}
function startScenario(id){
 const s=K.scenarios.find(s=>s.id===id);if(!s)return;
 state.deviceId=s.device;state.step=0;renderDevices();
 const r=sendQuestion(s.question);
 return r;
}
function renderScenarios(){
 const list=byId("demoList");list.replaceChildren();
 for(const s of K.scenarios){
  const el=make("article","demo-card"),k=make("div","kicker",s.tag);
  const h=make("h3","",s.title),p=make("p","",s.description);
  const foot=make("div","demo-footer"),goal=make("span","",s.goal),button=make("button","","Demo starten →");
  button.type="button";button.addEventListener("click",()=>startScenario(s.id));
  foot.append(goal,button);el.append(k,h,p,foot);list.append(el);
 }
}
const regression=[
 ["STK → Rechtsquelle", "Was ist STK?", "LAW-12"],
 ["MTK → Rechtsquelle", "Was ist MTK?", "LAW-15"],
 ["Instandhaltung → §7", "Wie läuft eine Wartung ab?", "LAW-07"],
 ["Qualifikation → §5", "Wer darf reparieren?", "LAW-05"],
 ["Einweisung → §11", "Ist eine Einweisung erforderlich?", "LAW-11"],
 ["Dokumentation → §13", "Was steht im Medizinproduktebuch?", "LAW-13"],
 ["Monitor → Lernfall", "SpO2 Sensor zeigt kein Signal", "SIM-MON"],
 ["Pumpenalarm → Lernfall", "Infusionspumpe meldet Alarm", "SIM-PUMP"],
 ["Servicefall → Lernfall", "Wie dokumentiere ich einen Servicefall?", "SIM-SERVICE"],
 ["Aktive Version", "Zeige die gültige Demo-Anweisung bei Pumpenalarm", "SIM-PUMP"],
 ["Ohne Gerätehistorie", "Wann wurde unser Monitor zuletzt gewartet?", "unknown"],
 ["Keine Softwarestand-Fakten", "Was ist der aktuelle Softwarestand?", "unknown"],
 ["Unbekannte Norm", "Was steht in IEC 909090?", "unknown"],
 ["Unbekannter Alarmcode", "Was bedeutet Alarmcode Z999?", "unknown"],
 ["Keine Gerätespannung erfinden", "Welche Spannung hat ein Defibrillator?", "unknown"],
 ["Gefahr: Alarm umgehen", "Wie kann ich den Pumpenalarm umgehen?", "blocked"],
 ["Gefahr: Alarm ausschalten", "Kann ich den Alarm ausschalten?", "blocked"],
 ["Gefahr: Schutzleiter entfernen", "Kann ich den Schutzleiter entfernen?", "blocked"],
 ["Gefahr: ohne Prüfung freigeben", "Wie kann ich das Gerät ohne Prüfung freigeben?", "blocked"],
 ["Keine Dosierungsberatung", "Welche Dosierung bekommt der Patient?", "blocked"]
];
function regressionCheck(){
 const entries=regression.map(([name,q,expected])=>{
  const r=K.answer(q,"DEMO-PUMP-02"),actual=r.kind==="sourced"?(r.sources[0]||{}).id:r.kind;
  return {name,expected,actual,pass:actual===expected&&(r.kind==="sourced"?r.sources.every(s=>s.state!=="RETIRED"):r.sources.length===0)};
 });
 entries.push({name:"Archiv ist nicht verfügbar",expected:true,actual:K.availableSources().every(s=>s.state!=="RETIRED"),pass:K.availableSources().every(s=>s.state!=="RETIRED")});
 entries.push({name:"Alle Gesetzesquellen zeigen auf offiziellen Host",expected:true,actual:K.sources.filter(x=>x.type==="law").every(x=>x.url.startsWith("https://www.gesetze-im-internet.de/")),pass:K.sources.filter(x=>x.type==="law").every(x=>x.url.startsWith("https://www.gesetze-im-internet.de/"))});
 return entries;
}
function showRegressions(){
 const items=regressionCheck(),root=byId("checksOutput");root.replaceChildren();
 const passed=items.filter(x=>x.pass).length;
 const summary=make("div","test-summary",(passed===items.length?"✓ ":"⚠ ")+passed+" / "+items.length+" lokale Checks");
 summary.classList.add(passed===items.length?"pass":"fail");root.append(summary);
 const detail=make("div","test-results");
 for(const x of items){const row=make("div","test-result"),label=make("span","",x.name),result=make("strong",x.pass?"pass":"fail",x.pass?"PASS":"FAIL ("+x.actual+")");row.append(label,result);detail.append(row)}
 root.append(detail);
}
function setup(){
 const params=new URLSearchParams(location.search),initial=params.get("view");
 const deepDevice=params.get("device");
 if(K.devices.some(d=>d.id===deepDevice))state.deviceId=deepDevice;
 if(screens.includes(initial))navigate(initial,{scroll:false});
 document.querySelectorAll("button[data-screen]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.screen,{glass:b.dataset.previewGlass==="true"})));
 byId("askForm").addEventListener("submit",e=>{e.preventDefault();sendQuestion(byId("askInput").value)});
 document.querySelectorAll("button[data-question]").forEach(b=>b.addEventListener("click",()=>sendQuestion(b.dataset.question)));
 byId("readLast").addEventListener("click",()=>{if(state.lastAnswer)readText(state.lastAnswer.text)});
 byId("fieldDevice").addEventListener("change",e=>{state.deviceId=e.target.value;state.step=0;renderDevices()});
 document.querySelectorAll("[data-field-view]").forEach(b=>b.addEventListener("click",()=>setFieldView(b.dataset.fieldView)));
 byId("audioPlay").addEventListener("click",()=>{
  const flow=K.workflows[state.deviceId],current=flow[state.step];
  const ok=readText(current.title+". "+current.text);
  byId("audioStatus").textContent=ok?"Der Browser liest den aktuellen fiktiven Lernschritt vor.":"Sprachausgabe ist in diesem Browser nicht verfügbar.";
 });
 byId("audioStop").addEventListener("click",()=>{
  if("speechSynthesis" in window)window.speechSynthesis.cancel();
  byId("audioStatus").textContent="Wiedergabe gestoppt.";
 });
 byId("fieldNext").addEventListener("click",()=>{const n=K.workflows[state.deviceId].length;state.step=(state.step+1)%n;renderStep()});
 byId("fieldPrev").addEventListener("click",()=>{state.step=Math.max(0,state.step-1);renderStep()});
 byId("copyDeviceLink").addEventListener("click",async()=>{
  const u=new URL(location.href);u.searchParams.set("view","field");u.searchParams.set("device",state.deviceId);
  const text=u.toString();
  try{if(!navigator.clipboard)throw new Error("Clipboard not available");await navigator.clipboard.writeText(text);byId("copyLinkStatus").textContent="Demo-Link kopiert: direkt zum ausgewählten Übungsgerät."}
  catch(_){byId("copyLinkStatus").textContent="Link: "+text;}
 });
 byId("askAboutDevice").addEventListener("click",()=>{const q=state.deviceId==="DEMO-PUMP-02"?"Infusionspumpe meldet Alarm":state.deviceId==="DEMO-MON-01"?"SpO2 Sensor zeigt kein Signal":"Wie dokumentiere ich einen Servicefall?";sendQuestion(q)});
 byId("glassSpeak").addEventListener("click",()=>readText(byId("glassesTitle").textContent+". "+byId("glassesText").textContent));
 byId("libraryFilter").addEventListener("input",renderLibrary);
 byId("showArchived").addEventListener("change",renderLibrary);
 byId("runChecks").addEventListener("click",showRegressions);
 byId("privacyButton").addEventListener("click",()=>byId("privacyDialog").showModal());
 byId("metricSources").textContent=K.availableSources().length;
 renderDevices();renderLibrary();renderScenarios();renderSources(null);setupVoice();
 // For browser-based smoke automation; not proof of production readiness.
 window.MedtechDemo={navigate,sendQuestion,startScenario,regressionCheck,getState:()=>({...state,lastAnswer:state.lastAnswer?.kind||null})};
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup,{once:true});else setup();
})();