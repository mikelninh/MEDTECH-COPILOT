/* V0.9 / Bring Your Own Manual
 * Local-only PDF parsing with PDF.js and source-visible extractive lookup.
 * No file upload, no analytics, no cookies, no speech, no LLM API.
 */
import * as pdfjsLib from "../vendor/pdf.mjs";
import "./upload_core.js";
import "./source_router.js";

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
if(!Core)throw new Error("Browser retrieval engine unavailable.");
pdfjsLib.GlobalWorkerOptions.workerSrc=new URL("../vendor/pdf.worker.mjs",import.meta.url).toString();

const $=id=>document.getElementById(id);
const mk=(tag,cls,txt)=>{
 const n=document.createElement(tag);
 if(cls)n.className=cls;
 if(txt!==undefined)n.textContent=String(txt);
 return n;
};
const state={pdf:null,index:null,file:null,url:null,hash:null,page:1,render:null,renderedPage:0,renderVersion:0,busy:false,loadVersion:0,source:null,catalog:null,group:"medtech",routing:false};
function showSource(source){
 state.source=source||null;
 const name=source?.title||"Bitte Quelle auswählen";
 const note=source?((source.subtitle||"PDF")+" · "+(source.sourceKind==="gitlaw-reader-not-official"?"Nichtamtliche GitLaw-Lesefassung – aktuelles Recht separat prüfen":source.sourceKind==="manufacturer-original"?"Geprüftes öffentliches Herstellerdokument":source.sourceKind==="fictional-training"?"Fiktives Übungshandbuch – keine echte Herstelleranleitung":"Nur in diesem Tab gespeichert")):"Handbuch, Bundesgesetz oder eigenes PDF wählen.";
 $("selectedSourceName").textContent=name;
 $("selectedSourceInfo").textContent=note;
 $("sourceBanner").classList.toggle("has-source",!!source);
 $("viewerSourceName").textContent=name;
 $("viewerSourceMeta").textContent=source?note:"Die Originalseite erscheint direkt nach der Quellenauswahl.";
 const link=$("sourceOfficialLink");
 if(source?.originalUrl){
  link.href=source.originalUrl;
  link.classList.remove("hidden");
  link.textContent=source.group==="laws"?"Amtliche Gesetzesfassung prüfen ↗":"Original beim Hersteller öffnen ↗";
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
 info.append(mk("span","source-choice-kicker",source.sourceKind==="gitlaw-reader-not-official"?"GITLAW · LESEFASSUNG":source.sourceKind==="manufacturer-original"?"HERSTELLER · ORIGINAL":"TRAINING · FIKTIV"),
  mk("strong","",source.title),mk("small","",source.subtitle+" · "+source.pages+" PDF-Seiten"));
 b.append(cover,info);
 b.addEventListener("click",()=>loadExample(source));
 return b;
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
   if(!/^\.\/covers\/(orion|lumen|mpbetreibv|mpdg|arbschg)\.svg$/.test(item.cover))throw new Error("Ungültiges Quellen-Cover");
   ids.add(item.id);
  }
  state.catalog=data;paintCards();
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
  $("viewerEmpty").classList.add("hidden");
  await renderPage(1);
  if(!sourceMeta)await updateOwnCover(version);
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
  $("viewerTrustNote").textContent="Originalseite zur gefundenen Passage. Gedruckte Seitenzahlen können abweichen.";
  renderPage(first.page);
 }else{
  // A refusal or non-answer must not visually inherit the previous citation.
  state.renderVersion++;
  state.renderedPage=0;
  if(state.render){try{state.render.cancel()}catch(_){}}
  // Keep the expressly chosen PDF visible, but reset the prior citation context.
  if(state.pdf)renderPage(1);
  $("viewerTrustNote").textContent="Originalquelle ist weiter sichtbar, aber zu dieser Frage gibt es keine belegte Fundstelle.";
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
async function handleQuestion(text){
 const q=String(text||"").trim();
 if(!q||state.routing)return null;
 if(!state.index){
  autoStatus("Quelle auswählen","Bitte zuerst ausdrücklich eines der Beispielhandbücher, ein Gesetz oder dein eigenes PDF auswählen.","clarify");
  return null;
 }
 return ask(q);
 if(Core.classify(q)==="blocked"){
  autoStatus("Sicherheitsgrenze","Keine Quelle wird für riskante technische oder klinische Handlungsanweisungen ausgewählt.","warning");
  const answer={status:"blocked",reason:"Der Copilot gibt keine Anleitung zur Umgehung von Schutzfunktionen oder zu klinischen Änderungen.",answer:"",evidence:[]};
  showResult(answer);return answer;
 }
 if(!state.catalog?.sources?.length){
  autoStatus("Quellenkatalog derzeit nicht verfügbar","Du kannst noch ein eigenes PDF auswählen.","warning");
  return null;
 }
 const result=Router.route(q,state.catalog.sources);
 if(result.status!=="selected"){
  autoStatus("Welche Quelle meinst du?",result.reason,"clarify");
  const shelf=$("sourceAutoBooks");shelf.replaceChildren();
  const candidates=result.ranked.filter(x=>x.score>=2).slice(0,3);
  if(!candidates.length)candidates.push(...result.ranked.slice(0,3));
  const box=mk("div","auto-suggestions");
  for(const candidate of candidates){
   const source=state.catalog.sources.find(x=>x.id===candidate.id);
   if(!source)continue;
   const b=mk("button","auto-suggestion");
   b.type="button";
   const img=mk("img","auto-suggestion-cover");
   img.src=source.cover;img.alt="";
   b.append(img,mk("span","",source.title+" ↗"));
   b.addEventListener("click",async()=>{
    await selectGroup(source.group);
    await loadExample(source);
    if(state.index){$("questionInput").value=q;ask(q)}
   });
   box.append(b);
  }
  shelf.append(box);
  return result;
 }
 const selected=state.catalog.sources.find(x=>x.id===result.id);
 state.routing=true;
 autoStatus("COPILOT SUCHT DAS PASSENDE BUCH","Vergleicht Begriffe und Fachgebiete. Keine automatische medizinische Entscheidung.","routing");
 try{
  await animateBookChoice(selected);
  await selectGroup(selected.group);
  autoStatus(selected.title+" gewählt",result.reason+". Erklärbare Begriffserkennung – kein generatives KI-Modell.","success");
  await loadExample(selected);
  if(!state.index){
   autoStatus("Quelle momentan nicht verfügbar","Die Dokumentenprüfung ist fehlgeschlagen. Bitte andere Quelle wählen oder neu versuchen.","warning");
   return null;
  }
  $("questionInput").value=q;
  return ask(q);
 }finally{state.routing=false}
}

function setup(){
 const viewer=$("viewer");
 $("sourceSide").append(viewer);
 const identity=mk("div","source-identity");
 const kicker=mk("span","eyebrow","AKTIVE ORIGINALQUELLE");
 const title=mk("strong","source-identity-name","Bitte Quelle auswählen");title.id="viewerSourceName";
 const meta=mk("small","source-identity-meta","Handbuch · Gesetz · eigenes PDF");meta.id="viewerSourceMeta";
 const external=mk("a","source-official-link hidden","Offizielles PDF öffnen ↗");
 external.id="sourceOfficialLink";external.target="_blank";external.rel="noopener noreferrer";
 identity.append(kicker,title,meta,external);
 viewer.prepend(identity);
 const viewerNote=mk("p","viewer-source-note","Quelle auswählen – anschließend bleibt die Originalseite ständig hier sichtbar.");
 viewerNote.id="viewerTrustNote";viewer.append(viewerNote);
 document.querySelectorAll("[data-source-group]").forEach(b=>b.addEventListener("click",()=>selectGroup(b.dataset.sourceGroup)));
 paintCards();loadCatalog();

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