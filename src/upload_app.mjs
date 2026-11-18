/* V0.9 / Bring Your Own Manual
 * Local-only PDF parsing with PDF.js and source-visible extractive lookup.
 * No file upload, no analytics, no cookies, no speech, no LLM API.
 */
import * as pdfjsLib from "../vendor/pdf.mjs";
import "./upload_core.js";

// PDF.js 6.5 uses the proposed Map#getOrInsertComputed API.
// Headless Chromium versions used in CI may not implement it yet.
if(typeof Map.prototype.getOrInsertComputed!=="function"){
 Object.defineProperty(Map.prototype,"getOrInsertComputed",{
  configurable:true,writable:true,value:function(key,callback){
   if(this.has(key))return this.get(key);
   const value=callback(key);this.set(key,value);return value;
  }
 });
}
if(typeof Map.prototype.getOrInsert!=="function"){
 Object.defineProperty(Map.prototype,"getOrInsert",{
  configurable:true,writable:true,value:function(key,value){
   if(this.has(key))return this.get(key);
   this.set(key,value);return value;
  }
 });
}

const Core=window.MedtechManualCore;
if(!Core)throw new Error("Browser retrieval engine unavailable.");
pdfjsLib.GlobalWorkerOptions.workerSrc=new URL("../vendor/pdf.worker.mjs",import.meta.url).toString();

const $=id=>document.getElementById(id);
const mk=(tag,cls,txt)=>{
 const n=document.createElement(tag);
 if(cls)n.className=cls;
 if(txt!==undefined)n.textContent=String(txt);
 return n;
};
const state={pdf:null,index:null,file:null,url:null,hash:null,page:1,render:null,renderedPage:0,renderVersion:0,busy:false,loadVersion:0};
const status=(message,kind="neutral",percent="")=>{
 $("importMessage").textContent=message;
 $("importPercent").textContent=percent;
 $("importStatus").className="import-status "+kind;
};
const controls=ready=>{
 $("askButton").disabled=!ready;
 $("questionInput").disabled=!ready;
 $("prevPage").disabled=!ready;
 $("nextPage").disabled=!ready;
};
function clearResults(){
 $("resultSection").classList.add("hidden");
 $("citationCard").classList.add("hidden");
 $("additionalCitations").replaceChildren();
 $("answerLead").textContent="";
 $("citationText").textContent="";
 $("questionInput").value="";
}
async function destroySource(){
 state.loadVersion++;
 state.renderVersion++;
 if(state.render){
  try{state.render.cancel();await state.render.promise}catch(_){}
  state.render=null;
 }
 if(state.pdf){
  try{await state.pdf.destroy()}catch(_){}
  state.pdf=null;
 }
 if(state.url){URL.revokeObjectURL(state.url);state.url=null}
 state.index=null;state.file=null;state.hash=null;state.page=1;state.renderedPage=0;
 controls(false);clearResults();
 $("loadedBar").classList.add("hidden");
 $("loadedName").textContent="";$("loadedDetail").textContent="";
 $("viewerPageLabel").textContent="Noch kein PDF";
 $("viewerCounter").textContent="– / –";
 $("viewerEmpty").classList.remove("hidden");
 $("pageCanvas").classList.add("hidden");
 $("openOriginal").removeAttribute("href");
 $("openOriginal").classList.add("disabled");
 $("openOriginal").setAttribute("aria-disabled","true");
 $("openOriginal").tabIndex=-1;
 $("pdfFile").value="";
}
async function digest(bytes){
 if(!crypto?.subtle)return "Nicht verfügbar";
 const value=await crypto.subtle.digest("SHA-256",bytes);
 return [...new Uint8Array(value)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
function docText(textContent){
 let output="";
 for(const item of textContent.items){
  if(typeof item.str!=="string")continue;
  const txt=item.str.trim();
  if(!txt)continue;
  if(output&&!/\s$/.test(output)&&!/^[-,.;:!?]/.test(txt))output+=" ";
  output+=txt;
  if(item.hasEOL)output+="\n";
 }
 return output.replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n");
}
async function chooseFile(file){
 await destroySource();
 if(!file)return;
 if(!/\.pdf$/i.test(file.name)&&file.type!=="application/pdf"){
  status("Bitte eine PDF-Datei auswählen.","error");return;
 }
 if(file.size>Core.MAX_BYTES){status("Datei zu groß. Maximal 15 MB.","error");return}
 if(file.size<100){status("Die Datei ist zu klein oder leer.","error");return}
 const version=state.loadVersion;
 state.busy=true;
 $("dropzone").classList.add("busy");
 status("PDF wird lokal geöffnet …","loading");
 let working=null,sourceUrl=null;
 try{
  const buffer=await file.arrayBuffer();
  if(version!==state.loadVersion)return;
  const marker=new TextDecoder("latin1").decode(buffer.slice(0,5));
  if(marker!=="%PDF-")throw new Error("Keine gültige PDF-Datei (%PDF-Kopf fehlt).");
  const hash=await digest(buffer);
  sourceUrl=URL.createObjectURL(file);
  const loading=pdfjsLib.getDocument({data:new Uint8Array(buffer),isEvalSupported:false,disableAutoFetch:true,stopAtErrors:true});
  working=await loading.promise;
  if(version!==state.loadVersion){await working.destroy();URL.revokeObjectURL(sourceUrl);return}
  if(working.numPages>Core.MAX_PAGES)throw new Error("Dieses PDF hat "+working.numPages+" Seiten. Maximal 120 sind möglich.");
  const pages=[];
  for(let n=1;n<=working.numPages;n++){
   if(version!==state.loadVersion){await working.destroy();URL.revokeObjectURL(sourceUrl);return}
   const page=await working.getPage(n);
   const extracted=await page.getTextContent({disableNormalization:false});
   pages.push({number:n,text:docText(extracted)});
   if(n===1||n%4===0||n===working.numPages){
    status("Text wird Seite für Seite extrahiert …","loading",n+" / "+working.numPages);
    await new Promise(resolve=>setTimeout(resolve,0));
   }
   page.cleanup();
  }
  if(version!==state.loadVersion){await working.destroy();URL.revokeObjectURL(sourceUrl);return}
  const index=Core.chunkPages(pages);
  state.pdf=working;working=null;
  state.url=sourceUrl;sourceUrl=null;
  state.file=file;state.index=index;state.hash=hash;state.page=1;
  $("loadedName").textContent=file.name;
  $("loadedDetail").textContent=index.pages+" Seiten · "+index.chunks.length+" Suchpassagen · SHA-256 "+hash.slice(0,12)+"…";
  $("loadedBar").classList.remove("hidden");
  controls(true);
  status("Dokument lokal indexiert. Bereit für deine Fragen.","success",index.pages+" Seiten");
  $("viewerEmpty").classList.add("hidden");
  await renderPage(1);
  $("questionInput").focus({preventScroll:true});
 }catch(err){
  status("Nicht eingelesen: "+(err?.name==="PasswordException"?"PDF ist passwortgeschützt.":"")+String(err?.message||"Unbekannter PDF-Fehler").slice(0,155),"error");
  if(working){try{await working.destroy()}catch(_){}}
  if(sourceUrl)URL.revokeObjectURL(sourceUrl);
 }finally{
  state.busy=false;$("dropzone").classList.remove("busy");
 }
}
async function renderPage(pageNumber){
 if(!state.pdf)return;
 const target=Math.max(1,Math.min(state.pdf.numPages,Math.round(pageNumber)));
 const version=++state.renderVersion;
 if(state.render){
  try{state.render.cancel();await state.render.promise}catch(_){}
  state.render=null;
 }
 state.page=target;state.renderedPage=0;
 $("viewerPageLabel").textContent="Seite "+target+" von "+state.pdf.numPages;
 $("viewerCounter").textContent=target+" / "+state.pdf.numPages;
 $("prevPage").disabled=target<=1;
 $("nextPage").disabled=target>=state.pdf.numPages;
 const link=$("openOriginal");
 link.href=state.url+"#page="+target;
 link.target="_blank";
 link.rel="noopener noreferrer";
 link.tabIndex=0;link.classList.remove("disabled");link.setAttribute("aria-disabled","false");
 try{
  const page=await state.pdf.getPage(target);
  if(version!==state.renderVersion)return;
  const stage=$("viewerStage");
  const viewport=page.getViewport({scale:1});
  const fit=Math.max(.28,Math.min(1.75,(stage.clientWidth-32)/viewport.width));
  const scaled=page.getViewport({scale:fit});
  const pixelRatio=Math.min(window.devicePixelRatio||1,2);
  // A fresh canvas prevents PDF.js from inheriting a cancelled render's context.
  const oldCanvas=$("pageCanvas");
  const canvas=document.createElement("canvas");
  canvas.id="pageCanvas";canvas.className="hidden";canvas.setAttribute("aria-label","Gerenderte Original-PDF-Seite");
  oldCanvas.replaceWith(canvas);
  canvas.getContext("2d",{alpha:false});
  canvas.width=Math.ceil(scaled.width*pixelRatio);
  canvas.height=Math.ceil(scaled.height*pixelRatio);
  canvas.style.width=Math.ceil(scaled.width)+"px";
  canvas.style.height=Math.ceil(scaled.height)+"px";
  canvas.classList.remove("hidden");
  $("viewerEmpty").classList.add("hidden");
  state.render=page.render({canvas,viewport:scaled,transform:[pixelRatio,0,0,pixelRatio,0,0]});
  await state.render.promise;
  if(version===state.renderVersion){
   state.render=null;
   state.renderedPage=target;
  }
  page.cleanup();
 }catch(err){
  if(version!==state.renderVersion||err?.name==="RenderingCancelledException")return;
  state.renderedPage=0;
  console.error("PDF page rendering failed",err);
  $("viewerEmpty").classList.remove("hidden");
  $("viewerEmpty").querySelector("p").textContent="PDF-Seite nicht darstellbar: "+String(err?.message||"Renderfehler").slice(0,130)+". Das PDF lässt sich separat öffnen.";
  $("pageCanvas").classList.add("hidden");
 }
}
function showResult(result){
 const statusLabel=result.status==="evidence"?"QUELLE GEFUNDEN":result.status==="blocked"?"SICHERHEITSGRENZE":"NICHT BELEGT";
 $("resultSection").classList.remove("hidden");
 $("answerStatus").textContent=statusLabel;
 $("answerStatus").className="answer-status "+result.status;
 $("answerTitle").textContent=result.status==="evidence"?"Das steht tatsächlich im Dokument.":result.status==="blocked"?"Diese Anfrage beantworten wir nicht.":"Keine ausreichende Evidenz gefunden.";
 $("answerLead").textContent=result.reason;
 const c=$("citationCard"),extra=$("additionalCitations");
 c.classList.add("hidden");extra.replaceChildren();
 if(result.status==="evidence"){
  const first=result.evidence[0];
  $("citationPage").textContent="PDF-SEITE "+first.page;
  $("citationText").textContent=first.excerpt;
  $("citationMeta").textContent="Wortgetreuer Indexauszug · "+first.matchedTerms.length+" Suchbegriffe gefunden";
  $("goToPage").onclick=()=>renderPage(first.page);
  c.classList.remove("hidden");
  for(const ev of result.evidence.slice(1)){
   const b=mk("button","more-citation","Weitere Fundstelle: Seite "+ev.page+" ↗");
   b.type="button";b.addEventListener("click",()=>{
    $("citationText").textContent=ev.excerpt;
    $("citationPage").textContent="PDF-SEITE "+ev.page;
    $("citationMeta").textContent="Wortgetreuer Indexauszug · "+ev.matchedTerms.length+" Suchbegriffe gefunden";
    $("goToPage").onclick=()=>renderPage(ev.page);
    renderPage(ev.page);
   });
   extra.append(b);
  }
  renderPage(first.page);
 }else{
  // A refusal or non-answer must not visually inherit the previous citation.
  state.renderVersion++;
  state.renderedPage=0;
  if(state.render){try{state.render.cancel()}catch(_){}}
  $("pageCanvas").classList.add("hidden");
  $("viewerEmpty").classList.remove("hidden");
  $("viewerEmpty").querySelector("p").textContent="Für diese Frage liegt keine belegte Originalseite vor. Du kannst das PDF bei einer neuen belegten Frage wieder öffnen.";
  $("viewerPageLabel").textContent="Keine zitierbare Fundstelle";
  const link=$("openOriginal");
  link.removeAttribute("href");link.classList.add("disabled");
  link.setAttribute("aria-disabled","true");link.tabIndex=-1;
 }
 $("resultSection").scrollIntoView({behavior:"smooth",block:"start"});
}
function ask(question){
 const result=Core.search(state.index,question);
 showResult(result);
 return result;
}
function setup(){
 $("choosePdf").addEventListener("click",()=>$("pdfFile").click());
 $("pdfFile").addEventListener("change",e=>{if(e.target.files?.[0])chooseFile(e.target.files[0])});
 const zone=$("dropzone");
 zone.addEventListener("dragover",e=>{e.preventDefault();zone.classList.add("over")});
 zone.addEventListener("dragleave",e=>{e.preventDefault();zone.classList.remove("over")});
 zone.addEventListener("drop",e=>{
  e.preventDefault();zone.classList.remove("over");
  if(e.dataTransfer?.files?.length)chooseFile(e.dataTransfer.files[0]);
 });
 $("removePdf").addEventListener("click",async()=>{await destroySource();status("Datei und temporärer Suchindex entfernt.","neutral")});
 $("questionForm").addEventListener("submit",e=>{
  e.preventDefault();
  if(!state.index)return;
  const value=$("questionInput").value.trim();
  if(value)ask(value);
 });
 $("prevPage").addEventListener("click",()=>renderPage(state.page-1));
 $("nextPage").addEventListener("click",()=>renderPage(state.page+1));
 window.addEventListener("resize",()=>{
  if(state.pdf&&$("resultSection").classList.contains("hidden")===false&&state.page)renderPage(state.page);
 });
 window.MedtechUploadDemo={
  status:()=>({loaded:!!state.index,pages:state.index?.pages||0,chunks:state.index?.chunks.length||0,fileName:state.file?.name||null,renderedPage:state.renderedPage}),
  ask,remove:destroySource
 };
}
setup();