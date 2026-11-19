/* V0.9 / Bring Your Own Manual
 * Local-only PDF parsing with PDF.js and source-visible extractive lookup.
 * No file upload, no analytics, no cookies, no speech, no LLM API.
 */
import * as pdfjsLib from "../vendor/pdf.mjs";
import "./upload_core.js";
import "./source_router.js";
import "./evidence_highlight.js";

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

// PDF.js 6.5 also calls the proposal on WeakMap (for Path2D caches).
// Chromium 141 does not yet provide it, despite supporting Map itself.
if(typeof WeakMap.prototype.getOrInsertComputed!=="function"){
 Object.defineProperty(WeakMap.prototype,"getOrInsertComputed",{
  configurable:true,writable:true,value:function(key,callback){
   if(this.has(key))return this.get(key);
   const value=callback(key);this.set(key,value);return value;
  }
 });
}
if(typeof WeakMap.prototype.getOrInsert!=="function"){
 Object.defineProperty(WeakMap.prototype,"getOrInsert",{
  configurable:true,writable:true,value:function(key,value){
   if(this.has(key))return this.get(key);
   this.set(key,value);return value;
  }
 });
}

const Core=window.MedtechManualCore;
const Router=window.MedtechSourceRouter;
const Highlight=window.MedtechEvidenceHighlight;
const Learning=window.MedtechLearningLoop;
let learningStore=null;
try{learningStore=window.localStorage}catch(_){}
const learning=Learning?.create(learningStore)??null;
if(!Core)throw new Error("Browser retrieval engine unavailable.");
pdfjsLib.GlobalWorkerOptions.workerSrc=new URL("../vendor/pdf.worker.mjs",import.meta.url).toString();

const $=id=>document.getElementById(id);
const mk=(tag,cls,txt)=>{
 const n=document.createElement(tag);
 if(cls)n.className=cls;
 if(txt!==undefined)n.textContent=String(txt);
 return n;
};
const state={pdf:null,index:null,file:null,url:null,hash:null,page:1,render:null,renderedPage:0,renderVersion:0,busy:false,loadVersion:0,source:null,catalog:null,faqCatalog:null,group:"laws",routing:false,pendingQuestion:null,activeEvidence:null,lastQuestion:null};
function setSourceChoice(sourceId){
 const control=$("heroSourceSelect");
 const id=sourceId||"auto";
 if(control&&[...control.options].some(o=>o.value===id))control.value=id;
 document.querySelectorAll("[data-quick-source]").forEach(button=>{
  const selected=button.dataset.quickSource===id;
  button.classList.toggle("active",selected);
  button.setAttribute("aria-pressed",String(selected));
 });
}
function buildSourceSelector(){
 const select=$("heroSourceSelect");
 if(!select)return;
 select.replaceChildren(new Option("Quelle wählen","auto"));
 for(const [label,group] of [["Deutsche Gesetze","laws"],["Trainingshandbücher","medtech"]]){
  const section=document.createElement("optgroup");section.label=label;
  for(const item of state.catalog.sources.filter(x=>x.group===group))
   section.append(new Option(item.title,item.id));
  select.append(section);
 }
 select.append(new Option("Eigenes PDF auswählen","own"));
 setSourceChoice(state.source?.id||"auto");
}
async function updateHeroSelection(id){
 if(id==="own"){
  setSourceChoice("own");
  await selectGroup("own");
  setSourceChoice("own");
  heroMessage("Eigenes PDF: Wähle unten eine nicht vertrauliche PDF-Datei. Sie bleibt in diesem Tab.","action");
  $("ownPdfPanel").scrollIntoView({behavior:"smooth",block:"start"});
  return;
 }
 const current=state.source?.id;
 if(current&&id!==current)await destroySource();
 setSourceChoice(id);
 const choice=state.catalog?.sources?.find(x=>x.id===id);
 if(choice)heroMessage(choice.title+" für deine nächste Frage ausgewählt. Das PDF wird beim Suchen geprüft.","action");
 else heroMessage("Stelle eine Frage und bestätige anschließend die passende Quelle.");
}
function showSource(source){
 state.source=source||null;
 const name=source?.title||"Bitte Quelle auswählen";
 const note=source?((source.subtitle||"PDF")+" · "+(source.sourceKind==="government-law-pdf"?(source.retrievalMode==="verified-prior-snapshot"?"Bundesportal-Snapshot vom "+(source.sourceSnapshotAt||"unbekannt")+" · heute nicht neu abrufbar · aktuelle Fassung separat prüfen":"Original-PDF aus dem Bundesportal · abgerufen "+(source.sourceSnapshotAt||"Datum unbekannt")+" · geltende Fassung separat prüfen"):source.sourceKind==="manufacturer-original"?"Geprüftes öffentliches Herstellerdokument":source.sourceKind==="fictional-training"?"Fiktives Übungshandbuch – keine echte Herstelleranleitung":"Nur in diesem Tab gespeichert")):"Handbuch, Bundesgesetz oder eigenes PDF wählen.";
 $("selectedSourceName").textContent=name;
 $("selectedSourceInfo").textContent=note;
 $("sourceBanner").classList.toggle("has-source",!!source);
 $("viewerSourceName").textContent=name;
 $("viewerSourceMeta").textContent=source?note:"Die Originalseite erscheint direkt nach der Quellenauswahl.";
 const proof=$("viewerSourceProof");
 if(proof){
  const integrity=!!(source?.sha256&&state.hash===source.sha256);
  proof.classList.toggle("verified",integrity);
  proof.textContent=!source?"Noch keine Datei ausgewählt":integrity?
   "DATEI-INTEGRITÄT ✓ · SHA-256 "+source.sha256.slice(0,12)+"… · "+source.pages+" Seiten":
   "LOKALER QUELLENINDEX · Nicht extern auf Echtheit geprüft";
 }

 const link=$("sourceOfficialLink");
 if(source?.originalUrl){
  link.href=source.originalUrl;
  link.classList.remove("hidden");
  link.textContent=source.group==="laws"?"Bundesportal: aktuelle Fassung prüfen ↗":"Original beim Hersteller öffnen ↗";
 }else{
  link.removeAttribute("href");link.classList.add("hidden");
 }
 const suggestions=$("suggestedQuestions");
 suggestions.replaceChildren();
 if(source?.questions?.length){
  suggestions.classList.remove("hidden");
  suggestions.append(mk("span","question-chip-label","FRAGEN ZU DIESER QUELLE"));
  for(const query of source.questions.slice(0,2)){
   const b=mk("button","question-chip",query+" ↗");
   b.type="button";
   b.addEventListener("click",()=>{
    if(!state.index)return;
    $("questionInput").value=query;
    ask(query);
   });
   suggestions.append(b);
  }
 }else suggestions.classList.add("hidden");
 paintFaqs(source);
 if(source)setSourceChoice(source.id);
 document.querySelectorAll("[data-source-id]").forEach(b=>{
  const chosen=!!source&&b.dataset.sourceId===source.id;
  b.classList.toggle("active",chosen);b.setAttribute("aria-pressed",String(chosen));
 });
}
function makeCard(source){
 const b=mk("button","source-choice");b.type="button";b.dataset.sourceId=source.id;
 b.setAttribute("aria-pressed",String(state.source?.id===source.id));
 const cover=mk("img","source-cover");cover.src=source.cover;cover.alt="Buchcover: "+source.title;cover.loading="lazy";
 const info=mk("div","source-book-info");
 info.append(mk("span","source-choice-kicker",source.sourceKind==="government-law-pdf"?"BUNDESPORTAL · ORIGINAL-PDF":source.sourceKind==="manufacturer-original"?"HERSTELLER · ORIGINAL":"TRAINING · FIKTIV"),
  mk("strong","",source.title),mk("small","",source.subtitle+" · "+source.pages+" PDF-Seiten"));
 b.append(cover,info,mk("span","source-open-hint","Buch auswählen ↗"));
 b.addEventListener("click",()=>loadExample(source));
 return b;
}
function paintFaqs(source){
 const panel=$("faqPanel"),list=$("faqList");
 if(!panel||!list)return;
 list.replaceChildren();
 const faqs=source?.group==="laws"?state.faqCatalog?.faqs?.filter(q=>q.sourceId===source.id)||[]:[];
 panel.classList.toggle("hidden",!faqs.length);
 for(const faq of faqs){
  const item=mk("details","faq-item");
  const summary=mk("summary","faq-question",faq.question);
  const body=mk("div","faq-answer");
  body.append(mk("span","faq-reference",faq.answerReference),mk("p","",faq.answer));
  const links=mk("div","faq-links");
  const official=mk("a","faq-official","Norm im Bundesportal prüfen ↗");
  official.href=faq.sourceUrl;official.target="_blank";official.rel="noopener noreferrer";
  const askButton=mk("button","faq-ask","Frage in dieser Quelle suchen ↗");
  askButton.type="button";
  askButton.addEventListener("click",()=>{
   if(!state.index)return;
   $("questionInput").value=faq.question;
   ask(faq.question);
  });
  links.append(official,askButton);
  body.append(links);item.append(summary,body);
  item.addEventListener("toggle",()=>{
   if(item.open){learning?.faqOpen(source.id,faq.id);paintLearningCounts()}
  });
  list.append(item);
 }
}
async function loadFaqs(){
 try{
  const response=await fetch("./data/legal_faq.json",{cache:"no-store"});
  if(!response.ok)throw new Error("FAQ file missing");
  const data=await response.json();
  if(data.schemaVersion!==1||!Array.isArray(data.faqs))throw new Error("FAQ schema invalid");
  const sources=new Set(["mpbetreibv","mpdg","arbschg","mpamiv","mpav"]);
  for(const f of data.faqs)
   if(!/^[a-z0-9_-]{1,32}$/.test(f.id)||!sources.has(f.sourceId)||
     !/^https:\/\/www\.gesetze-im-internet\.de\/[a-z0-9_]+\/(?:__\d+|anlage_\d+)\.html$/.test(f.sourceUrl)||
     typeof f.answer!=="string"||f.answer.length<45)throw new Error("FAQ source not verified");
  state.faqCatalog=data;paintFaqs(state.source);paintLearningCounts();
 }catch(error){console.warn("Curated FAQ unavailable",error.message)}
}
function paintLearningCounts(){
 const area=$("learningCounts");if(!area)return;
 const enabled=!!learning?.enabled();
 area.replaceChildren();
 if(!enabled){area.append(mk("p","learning-off","Messung deaktiviert. Keine Nutzungsdaten werden erfasst."));return}
 const c=learning.stats();
 for(const [label,value] of [["Fragen",c.asked],["Ähnliche Folgefragen",c.reasked],["Mit Fundstelle",c.evidence],["Ohne Beleg",c.unknown],["Hilfreich",c.helpful],["Nicht hilfreich",c.unhelpful]]){
  const cell=mk("div","learning-metric");cell.append(mk("strong","",value),mk("span","",label));area.append(cell);
 }
 const ranking=Object.entries(c.faqOpens).sort((a,b)=>b[1]-a[1]).slice(0,3);
 if(ranking.length){
  const container=mk("div","local-faq-ranking");
  container.append(mk("small","","Meist geöffnet (nur dieser Browser)"));
  for(const [id,num] of ranking){const row=mk("span","",""+num+" × "+(state.faqCatalog?.faqs?.find(f=>f.id===id)?.question||id));container.append(row)}
  area.append(container);
 }
}
function paintCards(){
 const list=$("sourceCards");list.replaceChildren();
 const sources=state.catalog?.sources?.filter(x=>x.group===state.group)||[];
 if(state.group==="own"){list.classList.add("hidden");return}
 list.classList.remove("hidden");
 if(!sources.length){
  list.append(mk("p","source-missing","Beispielquellen nicht verfügbar. Ein eigenes PDF kannst du weiterhin lokal öffnen."));
  return;
 }
 for(const item of sources)list.append(makeCard(item));
 $("allLawHint").classList.toggle("hidden",state.group!=="laws");
}
async function selectGroup(group){
 if(!["medtech","laws","own"].includes(group))return;
 state.group=group;
 await destroySource();
 $("ownPdfPanel").classList.toggle("hidden",group!=="own");
 $("allLawHint").classList.toggle("hidden",group!=="laws");
 document.querySelectorAll("[data-source-group]").forEach(b=>{
  const chosen=b.dataset.sourceGroup===group;
  b.classList.toggle("active",chosen);b.setAttribute("aria-pressed",String(chosen));
 });
 paintCards();
}
async function loadExample(source){
 if(!state.catalog?.sources?.some(x=>x.id===source.id))return;
 await destroySource();
 const version=state.loadVersion;
 status("Beispielquelle wird geladen und anhand ihres Fingerprints geprüft …","loading");
 try{
  if(!/^\.\/examples\/[a-zA-Z0-9_.-]+\.pdf$/.test(source.path)||!/^[a-f0-9]{64}$/.test(source.sha256))throw new Error("Ungültige oder nicht geprüfte Quellenangaben.");
  const response=await fetch(source.path,{cache:"no-store"});
  if(!response.ok)throw new Error("Original-PDF ist nicht abrufbar ("+response.status+").");
  const data=await response.arrayBuffer();
  if(version!==state.loadVersion)return;
  if(data.byteLength>Core.MAX_BYTES)throw new Error("Beispieldokument überschreitet 15 MB.");
  const hash=await digest(data);
  if(hash!==source.sha256)throw new Error("Quellenversion hat sich geändert. Fingerprint stimmt nicht.");
  const file=new File([data],source.filename,{type:"application/pdf"});
  await chooseFile(file,source);
 }catch(err){if(version===state.loadVersion)status("Beispielquelle nicht geladen: "+String(err.message||err).slice(0,145),"error")}
}
async function loadCatalog(){
 try{
  const response=await fetch("./data/source_catalog.json",{cache:"no-store"});
  if(!response.ok)throw new Error("Katalog fehlt");
  const data=await response.json();
  if(data.schemaVersion!==1||!Array.isArray(data.sources))throw new Error("Katalog ungültig");
  const ids=new Set();
  for(const item of data.sources){
   if(!["medtech","laws"].includes(item.group)||ids.has(item.id)||typeof item.title!=="string"||!/^[a-f0-9]{64}$/.test(item.sha256)||!/^\.\/examples\/[a-zA-Z0-9_.-]+\.pdf$/.test(item.path))throw new Error("Quellenkatalog enthält unzulässige Einträge");
   if(item.group==="laws"&&!/^https:\/\/www\.gesetze-im-internet\.de\/[a-z0-9_]+\/[A-Za-z0-9_.-]+\.pdf$/.test(item.originalUrl))throw new Error("Amtliche Quelle nicht verifizierbar");
   if(!/^\.\/covers\/(orion|lumen|mpbetreibv|mpdg|arbschg|mpamiv|mpav)\.svg$/.test(item.cover))throw new Error("Ungültiges Quellen-Cover");
   ids.add(item.id);
  }
  state.catalog=data;
  buildSourceSelector();
  for(const button of document.querySelectorAll("[data-source-group]")){
   if(button.dataset.sourceGroup==="own")continue;
   const count=data.sources.filter(source=>source.group===button.dataset.sourceGroup).length;
   const badge=mk("span","tab-count",String(count));badge.setAttribute("aria-hidden","true");button.append(badge);
  }
  paintCards();
 }catch(err){
  $("sourceCards").replaceChildren(mk("p","source-missing","Öffentliche Beispielquellen konnten nicht geladen werden. Eigenes PDF bleibt verfügbar."));
  console.warn("Public example source catalog unavailable:",err.message);
 }
}

const status=(message,kind="neutral",percent="")=>{
 $("importMessage").textContent=message;
 $("importPercent").textContent=percent;
 $("importStatus").className="import-status "+kind;
};
const controls=ready=>{
 $("askSection").classList.toggle("hidden",!ready);
 $("askButton").disabled=!ready;
 $("questionInput").disabled=!ready;
 $("prevPage").disabled=!ready;
 $("nextPage").disabled=!ready;
};
function clearResults(){
 $("resultSection").classList.add("hidden");
 $("workspaceWelcome").classList.remove("hidden");
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
 state.index=null;state.file=null;state.hash=null;state.page=1;state.renderedPage=0;state.activeEvidence=null;
 $("sourceSide").classList.remove("has-source");
 $("pdfHighlights").replaceChildren();closeVerify();
 showSource(null);
 resetOwnCover();
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
function resetOwnCover(){
 const cover=$("ownCoverImage");
 if(!cover)return;
 cover.src="./covers/own.svg";
 cover.alt="Cover für dein eigenes PDF";
 $("ownCoverTitle").textContent="Dein PDF";
 $("ownCoverMeta").textContent="Sobald du ein PDF auswählst, zeigen wir hier eine Vorschau seiner ersten Seite. Das Bild bleibt in diesem Browser-Tab.";
}
async function updateOwnCover(version){
 const cover=$("ownCoverImage");
 if(!cover||!state.pdf||version!==state.loadVersion)return;
 let page=null;
 try{
  page=await state.pdf.getPage(1);
  if(version!==state.loadVersion)return;
  const natural=page.getViewport({scale:1});
  const viewport=page.getViewport({scale:Math.min(.65,260/natural.width)});
  const canvas=document.createElement("canvas");
  canvas.width=Math.max(1,Math.ceil(viewport.width));
  canvas.height=Math.max(1,Math.ceil(viewport.height));
  await page.render({canvas,viewport}).promise;
  if(version!==state.loadVersion||!state.file)return;
  cover.src=canvas.toDataURL("image/png");
  cover.alt="Lokale Vorschau der ersten Seite: "+state.file.name;
  $("ownCoverTitle").textContent=state.file.name;
  $("ownCoverMeta").textContent=state.pdf.numPages+" Seiten · Vorschau aus der ersten PDF-Seite · nicht hochgeladen";
 }catch(_){
  // Thumbnail failures must never block the source search or PDF viewer.
  if(version===state.loadVersion&&state.file){
   $("ownCoverTitle").textContent=state.file.name;
   $("ownCoverMeta").textContent="Covervorschau nicht verfügbar. Die PDF-Recherche funktioniert weiterhin.";
  }
 }finally{if(page)page.cleanup()}
}
async function chooseFile(file,sourceMeta=null){
 await destroySource();
 if(!file)return;
 // Direct file selection should reveal the own-PDF workspace even when the
 // visitor has not first clicked the "Mein PDF" tab.
 if(!sourceMeta){
  state.group="own";
  $("ownPdfPanel").classList.remove("hidden");
  $("allLawHint").classList.add("hidden");
  document.querySelectorAll("[data-source-group]").forEach(button=>{
   const active=button.dataset.sourceGroup==="own";
   button.classList.toggle("active",active);
   button.setAttribute("aria-pressed",String(active));
  });
  paintCards();
 }
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
  showSource(sourceMeta||{id:"own",group:"own",title:file.name,subtitle:"Eigenes lokales PDF",originalUrl:null,sourceKind:"local-user"});
  $("loadedName").textContent=file.name;
  $("loadedDetail").textContent=index.pages+" Seiten · "+index.chunks.length+" Suchpassagen · SHA-256 "+hash.slice(0,12)+"…";
  $("loadedBar").classList.remove("hidden");
  controls(true);
  status("Dokument lokal indexiert. Bereit für deine Fragen.","success",index.pages+" Seiten");
  $("sourceSide").classList.add("has-source");
  $("viewerEmpty").classList.add("hidden");
  await renderPage(1);
  if(!sourceMeta)await updateOwnCover(version);
  if(state.pendingQuestion){
   const pending=state.pendingQuestion;state.pendingQuestion=null;
   $("questionInput").value=pending;
   $("heroQuestionInput").value=pending;
   $("heroRecommendations").classList.add("hidden");
   ask(pending);
  }else{
   $("questionInput").focus({preventScroll:true});
   $("heroQueryStatus").textContent="Quelle aktiv: "+(state.source?.title||file.name)+". Du kannst nun direkt fragen.";
  }
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
 const official=$("sourceOfficialLink");
 if(state.source?.originalUrl)official.href=state.source.originalUrl+(state.source.group==="laws"?"":"#page="+target);
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
  const frame=$("pdfPageFrame");
  frame.style.width=Math.ceil(scaled.width)+"px";frame.style.height=Math.ceil(scaled.height)+"px";
  $("pdfHighlights").replaceChildren();
  canvas.classList.remove("hidden");
  $("viewerEmpty").classList.add("hidden");
  state.render=page.render({canvas,viewport:scaled,transform:[pixelRatio,0,0,pixelRatio,0,0]});
  await state.render.promise;
  if(version===state.renderVersion){
   state.render=null;
   state.renderedPage=target;
   if(state.activeEvidence?.page===target&&Highlight){
    try{
     const textContent=await page.getTextContent();
     if(version===state.renderVersion){
      const hits=Highlight.rectangles(textContent.items,scaled,state.activeEvidence);
      const layer=$("pdfHighlights");layer.replaceChildren();
      for(const hit of hits){
       const el=mk("div","pdf-passage-hit");
       el.style.left=hit.x+"px";el.style.top=hit.y+"px";
       el.style.width=hit.width+"px";el.style.height=hit.height+"px";
       layer.append(el);
      }
      if(hits.length)stage.scrollTop=Math.max(0,hits[0].y-65);
     }
    }catch(e){console.warn("Non-blocking citation highlight unavailable:",e.message)}
   }
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
function paintExcerpt(evidence){
 const el=$("citationText");el.replaceChildren();
 const raw=String(evidence?.excerpt||"");
 const words=[...new Set((evidence?.matchedTerms||[]).map(String).filter(w=>w.length>=4))].sort((a,b)=>b.length-a.length);
 if(!words.length){el.textContent=raw;return}
 const escaped=words.map(w=>w.replace(/[^A-Za-z0-9ÄÖÜäöüß]/g,"")).filter(Boolean);
 if(!escaped.length){el.textContent=raw;return}
 let matcher;
 try{matcher=new RegExp("("+escaped.join("|")+")","gi")}catch(_){el.textContent=raw;return}
 let index=0;
 for(const found of raw.matchAll(matcher)){
  if(found.index>index)el.append(document.createTextNode(raw.slice(index,found.index)));
  const mark=mk("mark","passage-term",found[0]);
  el.append(mark);index=found.index+found[0].length;
 }
 if(index<raw.length)el.append(document.createTextNode(raw.slice(index)));
}
function editorialAnswer(question){
 const panel=$("editorialAnswer");panel.replaceChildren();panel.classList.add("hidden");
 if(!state.source||state.source.group!=="laws")return;
 const matched=state.faqCatalog?.faqs?.find(f=>f.sourceId===state.source.id&&Highlight?.normalize(f.question)===Highlight?.normalize(question));
 if(!matched)return;
 panel.append(mk("div","editorial-label","KURZORIENTIERUNG · REDAKTIONELL, NICHT FACHLICH FREIGEGEBEN"));
 panel.append(mk("p","",matched.answer));
 const link=mk("a","editorial-link",matched.answerReference+" · geltende Norm prüfen ↗");
 link.href=matched.sourceUrl;link.target="_blank";link.rel="noopener noreferrer";panel.append(link);
 panel.classList.remove("hidden");
}
function closeVerify(){
 const side=$("sourceSide");
 if(!side)return;
 side.classList.remove("verify-open");
 document.body.classList.remove("verify-mode");
 const close=$("verifyClose");if(close)close.classList.add("hidden");
}
function openVerify(){
 if(!state.pdf)return;
 const side=$("sourceSide");
 if(window.matchMedia("(max-width:700px)").matches){
  side.classList.add("verify-open");
  document.body.classList.add("verify-mode");
  $("verifyClose").classList.remove("hidden");
  $("verifyClose").focus({preventScroll:true});
 }else{
  side.scrollIntoView({behavior:"smooth",block:"nearest"});
  side.classList.add("verify-pulse");
  window.setTimeout(()=>side.classList.remove("verify-pulse"),1100);
 }
}
function showResult(result){
 $("workspaceWelcome").classList.add("hidden");
 $("answeredQuestion").textContent=state.lastQuestion||"Deine Frage";
 const statusLabel=result.status==="evidence"?"QUELLE GEFUNDEN":result.status==="blocked"?"SICHERHEITSGRENZE":"NICHT BELEGT";
 $("resultSection").classList.remove("hidden");
 $("answerStatus").textContent=statusLabel;
 $("answerStatus").className="answer-status "+result.status;
 $("answerTitle").textContent=result.status==="evidence"?"Eine Fundstelle. Direkt im Original.":result.status==="blocked"?"Sicherheit geht vor.":"Keine belastbare Fundstelle gefunden.";
 $("feedbackAcknowledgement").textContent="";
 $("answerHelpful").disabled=false;$("answerUnhelpful").disabled=false;
 $("answerLead").textContent=result.reason;
 const c=$("citationCard"),extra=$("additionalCitations");
 c.classList.add("hidden");extra.replaceChildren();
 $("editorialAnswer").replaceChildren();$("editorialAnswer").classList.add("hidden");
 state.activeEvidence=null;
 if(result.status==="evidence"){
  const first=result.evidence[0];
  state.activeEvidence=first;
  editorialAnswer(state.lastQuestion);
  const showEvidence=ev=>{
   state.activeEvidence=ev;
   $("citationPage").textContent="PDF-SEITE "+ev.page;
   paintExcerpt(ev);
   $("citationMeta").textContent="Quellenauszug · "+ev.matchedTerms.length+" Übereinstimmungen · im Original prüfen";
   $("goToPage").onclick=()=>renderPage(ev.page);
   renderPage(ev.page);
  };
  c.classList.remove("hidden");
  showEvidence(first);
  for(const ev of result.evidence.slice(1)){
   const b=mk("button","more-citation","Weitere Fundstelle: Seite "+ev.page+" ↗");
   b.type="button";b.addEventListener("click",()=>showEvidence(ev));
   extra.append(b);
  }
  $("viewerTrustNote").textContent="Gold markierte Passagen sind visuelle Suchhilfen. Für die vollständige Bedeutung das Original und seinen Kontext prüfen.";
 }else{
  state.activeEvidence=null;
  state.renderVersion++;state.renderedPage=0;
  $("pdfHighlights").replaceChildren();
  if(state.render){try{state.render.cancel()}catch(_){}}
  if(state.pdf)renderPage(1);
  $("viewerTrustNote").textContent="Original bleibt verfügbar, aber keine belegte Antwort auf diese Frage.";
  const link=$("openOriginal");
  link.removeAttribute("href");link.classList.add("disabled");
  link.setAttribute("aria-disabled","true");link.tabIndex=-1;
 }
 $("resultSection").scrollIntoView({behavior:"smooth",block:"start"});
}
function ask(question){
 state.lastQuestion=String(question||"");
 const result=Core.search(state.index,state.lastQuestion);
 showResult(result);
 learning?.ask(state.source?.id||"other",state.lastQuestion,result.status);
 paintLearningCounts();
 return result;
}

function autoStatus(title,detail,kind="ready"){
 const panel=$("sourceAutoStatus");
 panel.className="source-auto-status "+kind;
 panel.classList.remove("hidden");
 $("sourceAutoTitle").textContent=title;
 $("sourceAutoReason").textContent=detail;
}
async function animateBookChoice(selected){
 const shelf=$("sourceAutoBooks");
 shelf.replaceChildren();
 const books=(state.catalog?.sources||[]).map(source=>{
  const img=mk("img","auto-book");img.src=source.cover;img.alt="";
  img.dataset.bookId=source.id;
  shelf.append(img);return img;
 });
 if(!books.length)return;
 const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
 if(!reduced){
  for(let i=0;i<10;i++){
   books.forEach((b,j)=>b.classList.toggle("scanning",i%books.length===j));
   await new Promise(resolve=>setTimeout(resolve,85));
  }
 }
 books.forEach(b=>{
  b.classList.toggle("selected",b.dataset.bookId===selected.id);
  b.classList.remove("scanning");
 });
}
function heroMessage(message,tone="neutral"){
 const el=$("heroQueryStatus");
 el.textContent=message;el.dataset.tone=tone;
}
function offerSources(question,route){
 const panel=$("heroRecommendations");panel.replaceChildren();panel.classList.remove("hidden");
 const sources=state.catalog?.sources||[];
 if(!sources.length){
  panel.append(mk("p","hero-pending","Quellenkatalog noch nicht bereit. Die Frage bleibt im Feld erhalten."));return;
 }
 const matches=(route?.ranked||[]).filter(x=>x.score>=4).slice(0,3);
 if(!matches.length){
  panel.append(mk("strong","hero-recommend-title","Bitte selbst eine Quelle bestätigen."));
  panel.append(mk("p","hero-recommend-note","Keine eindeutige Quelle aus deiner Frage erkannt. Wähle unten bewusst ein Buch; die Frage wird anschließend automatisch gesucht."));
  const button=mk("button","hero-browse","Quellenbibliothek ansehen ↓");
  button.type="button";button.addEventListener("click",()=>$("sourceChooser").scrollIntoView({behavior:"smooth",block:"start"}));
  panel.append(button);
  return;
 }
 panel.append(mk("strong","hero-recommend-title",route.status==="selected"?"Passende Quelle gefunden – bitte bestätigen":"Welche Quelle passt zu deiner Frage?"));
 panel.append(mk("p","hero-recommend-note","Die Auswahl erfolgt bewusst durch dich. Es wird niemals stillschweigend zwischen Gesetzen gewechselt."));
 const row=mk("div","hero-recommend-list");
 for(const item of matches){
  const src=sources.find(x=>x.id===item.id);if(!src)continue;
  const button=mk("button","hero-recommend-card");button.type="button";button.dataset.recommendSource=src.id;
  const cover=mk("img","",undefined);cover.src=src.cover;cover.alt="";cover.width=40;cover.height=58;
  const name=mk("span","",undefined);name.append(mk("strong","",src.title),mk("small","",src.group==="laws"?"Konsolidierter Bundesportal-Text":"Fiktives Training"));
  button.append(cover,name,mk("span","hero-recommend-arrow","→"));
  button.addEventListener("click",async()=>{
   if(state.routing)return;
   state.routing=true;
   button.disabled=true;
   heroMessage("Prüfe die ausgewählte Quelle und lade ihre Originalseiten …");
   try{
    state.pendingQuestion=question;
    await selectGroup(src.group);
    await loadExample(src);
    if(!state.index)heroMessage("Dokument nicht geladen. Wähle eine andere Quelle.","warning");
   }finally{state.routing=false}
  });
  row.append(button);
 }
 panel.append(row);
}
async function handleQuestion(text){
 const q=String(text||"").trim();
 if(!q||state.routing)return null;
 if(Core.classify(q)==="blocked"&&!state.index){
  state.pendingQuestion=null;
  $("heroRecommendations").classList.add("hidden");
  heroMessage("Sicherheitsgrenze: keine Anleitungen zur Umgehung von Schutzfunktionen oder klinischen Änderungen.","warning");
  return {status:"blocked",evidence:[]};
 }
 const selected=$("heroSourceSelect")?.value||"auto";
 if(selected==="own"&&state.source?.id!=="own"){
  state.pendingQuestion=q;
  await selectGroup("own");setSourceChoice("own");
  $("ownPdfPanel").scrollIntoView({behavior:"smooth",block:"start"});
  heroMessage("Wähle zuerst dein PDF. Die Frage wird danach nur darin gesucht.","action");
  return {status:"awaiting-private-document"};
 }
 const explicit=state.catalog?.sources?.find(x=>x.id===selected);
 if(explicit&&state.source?.id!==explicit.id){
  state.routing=true;
  state.pendingQuestion=q;
  $("heroRecommendations").classList.add("hidden");
  heroMessage("Prüfe und öffne "+explicit.title+" …","action");
  try{
   await selectGroup(explicit.group);
   await loadExample(explicit);
   if(!state.index){state.pendingQuestion=null;heroMessage("Die Quelle konnte nicht geöffnet werden. Bitte erneut versuchen.","warning")}
  }finally{state.routing=false}
  return {status:state.index?"searched":"source-error"};
 }
 if(state.index){
  $("questionInput").value=q;$("heroQuestionInput").value=q;
  $("heroRecommendations").classList.add("hidden");
  return ask(q);
 }
 state.pendingQuestion=q;
 const route=Router?.route(q,state.catalog?.sources||[])||{status:"unmatched",ranked:[]};
 heroMessage("Bitte eine Quelle bestätigen. Wir suchen ausschließlich darin.","action");
 offerSources(q,route);
 return route;
}

function setup(){
 const viewer=$("viewer");
 $("sourceSide").append(viewer);
 const close=mk("button","verify-close hidden","← Zur Antwort");close.id="verifyClose";close.type="button";
 close.addEventListener("click",()=>closeVerify());
 viewer.prepend(close);
 $("verifySource").addEventListener("click",openVerify);
 document.addEventListener("keydown",event=>{if(event.key==="Escape"&&$("sourceSide").classList.contains("verify-open"))closeVerify()});
 $("heroQuestionForm").addEventListener("submit",event=>{
  event.preventDefault();void handleQuestion($("heroQuestionInput").value);
 });
 $("heroSourceSelect").addEventListener("change",event=>{void updateHeroSelection(event.target.value)});
 document.querySelectorAll("[data-quick-source]").forEach(button=>button.addEventListener("click",()=>{
  void updateHeroSelection(button.dataset.quickSource);
 }));
 $("welcomeExample").addEventListener("click",()=>{
  const q="Wie oft ist eine sicherheitstechnische Kontrolle (STK) fällig?";
  $("heroQuestionInput").value=q;
  void handleQuestion(q);
 });

 document.querySelectorAll("[data-starter-question]").forEach(button=>button.addEventListener("click",()=>{
  const q=button.dataset.starterQuestion;
  $("heroQuestionInput").value=q;
  void handleQuestion(q);
 }));

 const identity=mk("div","source-identity");
 const kicker=mk("span","eyebrow","AKTIVE ORIGINALQUELLE");
 const title=mk("strong","source-identity-name","Bitte Quelle auswählen");title.id="viewerSourceName";
 const meta=mk("small","source-identity-meta","Handbuch · Gesetz · eigenes PDF");meta.id="viewerSourceMeta";
 const external=mk("a","source-official-link hidden","Offizielles PDF öffnen ↗");
 external.id="sourceOfficialLink";external.target="_blank";external.rel="noopener noreferrer";
 const proof=mk("div","source-provenance","Noch keine Datei ausgewählt");proof.id="viewerSourceProof";
 identity.append(kicker,title,meta,proof,external);
 viewer.prepend(identity);
 const viewerNote=mk("p","viewer-source-note","Die gelben Markierungen sind Suchhilfen. Fachliche Bewertung und Geltungsstand bitte immer am Original prüfen.");
 viewerNote.id="viewerTrustNote";viewer.append(viewerNote);
 document.querySelectorAll("[data-source-group]").forEach(b=>b.addEventListener("click",()=>selectGroup(b.dataset.sourceGroup)));
 paintCards();loadCatalog();loadFaqs();


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
 $("learningConsent").checked=!!learning?.enabled();
 $("learningConsent").addEventListener("change",e=>{learning?.consent(e.target.checked);paintLearningCounts()});
 $("resetLearning").addEventListener("click",()=>{learning?.reset();$("learningConsent").checked=false;paintLearningCounts()});
 $("exportLearning").addEventListener("click",()=>{
  if(!learning?.enabled())return;
  const blob=new Blob([learning.exportData()],{type:"application/json"});
  const url=URL.createObjectURL(blob),anchor=document.createElement("a");
  anchor.href=url;anchor.download="medtech-local-metrics.json";anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 for(const [button,helpful] of [["answerHelpful",true],["answerUnhelpful",false]]){
  $(button).addEventListener("click",()=>{
   if(learning?.enabled()){
    learning.feedback(helpful);paintLearningCounts();
    $("feedbackAcknowledgement").textContent="Danke! Bewertung nur in diesem Browser gezählt.";
   }else $("feedbackAcknowledgement").textContent="Für lokales Qualitätsfeedback bitte zuerst oben die freiwillige Messung aktivieren.";
   $("answerHelpful").disabled=true;$("answerUnhelpful").disabled=true;
  });
 }
 paintLearningCounts();

 $("questionForm").addEventListener("submit",e=>{
  e.preventDefault();
  const value=$("questionInput").value.trim();
  if(value)void handleQuestion(value);
 });
 $("prevPage").addEventListener("click",()=>renderPage(state.page-1));
 $("nextPage").addEventListener("click",()=>renderPage(state.page+1));
 window.addEventListener("resize",()=>{
  if(state.pdf&&$("resultSection").classList.contains("hidden")===false&&state.page)renderPage(state.page);
 });
 window.MedtechUploadDemo={
  status:()=>({loaded:!!state.index,pages:state.index?.pages||0,chunks:state.index?.chunks.length||0,fileName:state.file?.name||null,renderedPage:state.renderedPage,sourceId:state.source?.id||null,group:state.group}),
  selectSource:async id=>{const x=state.catalog?.sources?.find(y=>y.id===id);if(x){await selectGroup(x.group);await loadExample(x)}},
  askWithAutoSource:handleQuestion,
  ask,remove:destroySource
 };
}
setup();