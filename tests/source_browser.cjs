#!/usr/bin/env node
/* GitLaw-style source-switching E2E. Tests the actual PDFs & page rendering. */
"use strict";
const {chromium}=require("playwright");
const fs=require("node:fs");
const assert=require("node:assert/strict");
const url="http://127.0.0.1:4173/upload.html";
async function ready(page,id){
 await page.waitForFunction(sourceId=>{
  const s=window.MedtechUploadDemo?.status();
  return s?.sourceId===sourceId&&s?.loaded&&s?.renderedPage===1;
 },id,{timeout:90000});
}
async function question(page,q){
 await page.locator("#questionInput").fill(q);
 await page.locator("#askButton").click();
 return await page.locator("#answerStatus").innerText();
}
(async()=>{
 fs.mkdirSync("artifacts",{recursive:true});
 const browser=await chromium.launch({headless:true});
 const errors=[];
 const desktop=await browser.newPage({viewport:{width:1390,height:900}});
 desktop.on("pageerror",e=>errors.push(e.message));
 await desktop.goto(url,{waitUntil:"networkidle"});
 await desktop.waitForFunction(()=>!!window.MedtechUploadDemo);
 await desktop.waitForFunction(()=>document.querySelectorAll("[data-source-id]").length===5);
 assert.equal(await desktop.locator("#heroQuestionInput").isVisible(),true,"Question-first search must be immediately visible");
 assert.equal(await desktop.locator("#heroAskButton").isEnabled(),true);
 assert.match(await desktop.locator("#mainTitle").innerText(),/Stelle deine Frage/);
 assert.equal(await desktop.locator("#heroSourceSelect").isVisible(),true);
 assert.equal(await desktop.locator("#workspaceWelcome").isVisible(),true);
 assert.equal(await desktop.locator("#sourceSide").isVisible(),true);
 await desktop.locator("[data-source-group='medtech']").click();
 await desktop.waitForFunction(()=>document.querySelectorAll("[data-source-id]").length===2);
 assert.equal(await desktop.locator("[data-source-id='lumen']").count(),1);
 assert.equal(await desktop.locator("[data-source-id='orion']").count(),1);
 for(const img of await desktop.locator(".source-choice .source-cover").all()){
  assert.equal(await img.evaluate(el=>el.complete&&el.naturalWidth>0),true,"All listed books need visible cover images");
 }
 assert.equal(await desktop.locator("#viewer").isVisible(),true);
 await desktop.locator("[data-source-id='lumen']").click();
 await ready(desktop,"lumen");
 const boxes=await Promise.all(["#workspaceWelcome","#sourceSide"].map(x=>desktop.locator(x).boundingBox()));
 assert.ok(boxes[1].x>boxes[0].x+boxes[0].width-10,"Answer panel and original PDF must be side-by-side on desktop");
 const sourcesRect=await desktop.locator("#sourceChooser").boundingBox();
 assert.ok(sourcesRect.y>boxes[0].y,"Source library must follow the primary answer/PDF workspace");
 assert.match(await desktop.locator("#viewerSourceName").innerText(),/LUMEN P200/);
 assert.equal(await question(desktop,"Was steht zur Batteriehistorie?"),"QUELLE GEFUNDEN");
 assert.match(await desktop.locator("#citationPage").innerText(),/PDF-SEITE 2/);
 await desktop.waitForFunction(()=>window.MedtechUploadDemo.status().renderedPage===2);
 assert.equal(await desktop.locator("#pageCanvas").isVisible(),true);
 await desktop.screenshot({path:"artifacts/v10-01-handbook-side-by-side.png",fullPage:true});
 assert.equal(await question(desktop,"Was regelt das Arbeitsschutzgesetz zur Gefährdungsbeurteilung?"),"NICHT BELEGT","Should not mix in laws while manual selected");
 assert.equal(await desktop.locator("#viewerSourceName").innerText(),"LUMEN P200");
 assert.equal(await desktop.locator("#pageCanvas").isVisible(),true,"Original remains visible with no answer");

 await desktop.locator("[data-source-group='laws']").click();
 await desktop.waitForFunction(()=>document.querySelectorAll("[data-source-id]").length===5);
 assert.equal(await desktop.locator("#questionInput").isDisabled(),true);
 assert.match(await desktop.locator("#viewerSourceName").innerText(),/Bitte Quelle auswählen/);
 assert.ok((await desktop.locator(".all-law-hint a").getAttribute("href")).includes("gitlaw"));
 for(const img of await desktop.locator(".source-choice .source-cover").all()){
  assert.equal(await img.evaluate(el=>el.complete&&el.naturalWidth>0),true,"Every legal book must have a loaded cover");
 }
 await desktop.locator("[data-source-id='mpbetreibv']").click();
 await ready(desktop,"mpbetreibv");
 assert.match(await desktop.locator("#sourceOfficialLink").getAttribute("href"),/gesetze-im-internet\.de\/mpbetreibv_2025\/MPBetreibV\.pdf/);
 assert.match(await desktop.locator("#viewerSourceName").innerText(),/MPBetreibV/);
 assert.equal(await desktop.locator("#faqPanel").isVisible(),false,"Long FAQ library should stay collapsed for minimal UI");
 await desktop.locator("#faqDisclosure > summary").click();
 assert.equal(await desktop.locator("#faqPanel").isVisible(),true,"Official-law FAQs should be available on demand");
 assert.ok(await desktop.locator(".faq-item").count()>=8,"MPBetreibV should have eight curated questions");
 await desktop.locator("#qualityDisclosure > summary").click();
 await desktop.locator("#learningConsent").check();
 await desktop.locator(".faq-item summary").first().click();
 assert.match(await desktop.locator(".faq-item").first().locator(".faq-official").getAttribute("href"),/gesetze-im-internet\.de\/mpbetreibv_2025\/__/);
 assert.equal(await desktop.locator("#learningCounts").innerText().then(x=>x.includes("Fragen")),true);
 const persisted=await desktop.evaluate(()=>localStorage.getItem("medtech_source_quality_aggregate_v1"));
 assert.equal(persisted.includes("Wer gilt als Betreiber"),false,"Never persist raw FAQ text");

 assert.equal(await question(desktop,"Was steht zum Medizinproduktebuch?"),"QUELLE GEFUNDEN");
 await desktop.locator("#answerHelpful").click();
 const feedback=await desktop.evaluate(()=>JSON.parse(localStorage.getItem("medtech_source_quality_aggregate_v1")));
 assert.equal(feedback.asked,1);
 assert.equal(feedback.helpful,1);
 assert.equal(feedback.evidence,1);
 assert.equal(feedback.faqOpens.b01,1);

 await desktop.waitForFunction(()=>window.MedtechUploadDemo.status().renderedPage>0);
 assert.equal(await desktop.locator("#pageCanvas").isVisible(),true);
 await desktop.screenshot({path:"artifacts/v10-02-law-side-by-side.png",fullPage:true});

 await desktop.locator("[data-source-id='mpdg']").click();
 await ready(desktop,"mpdg");
 assert.match(await desktop.locator("#viewerSourceName").innerText(),/MPDG/);
 assert.equal(await desktop.locator("#resultSection").isVisible(),false,"Previous legal citation must be cleared on source switch");
 await desktop.locator("[data-source-id='arbschg']").click();
 await ready(desktop,"arbschg");
 assert.equal(await question(desktop,"Was steht zur Gefährdungsbeurteilung?"),"QUELLE GEFUNDEN");
 assert.match(await desktop.locator("#viewerSourceName").innerText(),/ArbSchG/);
 await desktop.screenshot({path:"artifacts/v10-03-arbschg-source.png",fullPage:true});
 assert.equal(await question(desktop,"Wie kann ich den Alarm ausschalten?"),"SICHERHEITSGRENZE");
 assert.equal(await desktop.locator("#citationCard").isVisible(),false);
 assert.equal(await desktop.locator("#viewer").isVisible(),true,"Selected law must remain visible when a question is blocked");

 await desktop.locator("[data-source-id='mpamiv']").click();
 await ready(desktop,"mpamiv");
 assert.match(await desktop.locator("#sourceOfficialLink").getAttribute("href"),/gesetze-im-internet\.de\/mpamiv\/MPAMIV\.pdf/);
 assert.equal(await desktop.locator("#resultSection").isVisible(),false,"Law switch must clear older citations");
 await desktop.locator("[data-source-id='mpav']").click();
 await ready(desktop,"mpav");
 assert.match(await desktop.locator("#sourceOfficialLink").getAttribute("href"),/gesetze-im-internet\.de\/mpav\/MPAV\.pdf/);
 assert.equal(await desktop.locator("#pageCanvas").isVisible(),true);
 await desktop.screenshot({path:"artifacts/v11-05-five-law-library.png",fullPage:true});

 await desktop.locator("[data-source-group='own']").click();
 assert.equal(await desktop.locator("#ownPdfPanel").isVisible(),true);
 assert.equal(await desktop.locator("#ownCoverImage").isVisible(),true);
 assert.match(await desktop.locator("#ownCoverImage").getAttribute("src"),/covers\/own\.svg/);
 assert.equal(await desktop.locator("#questionInput").isDisabled(),true);
 await desktop.locator("#pdfFile").setInputFiles("/tmp/medtech_upload_fixture.pdf");
 await ready(desktop,"own");
 await desktop.waitForFunction(()=>document.getElementById("ownCoverImage").getAttribute("src").startsWith("data:image/png;"),null,{timeout:15000});
 assert.match(await desktop.locator("#ownCoverTitle").innerText(),/fixture\.pdf/);
 assert.equal(await question(desktop,"Was misst das NanoPod Modul?"),"QUELLE GEFUNDEN");
 assert.match(await desktop.locator("#viewerSourceName").innerText(),/fixture/);

 const start=await browser.newPage({viewport:{width:1440,height:900}});
 start.on("pageerror",e=>errors.push("first-question: "+e.message));
 await start.goto(url,{waitUntil:"networkidle"});
 await start.waitForFunction(()=>document.querySelectorAll("[data-source-id]").length===5);
 await start.locator("#heroQuestionInput").fill("Was steht zum Medizinproduktebuch?");
 await start.locator("#heroAskButton").click();
 assert.equal(await start.locator("#heroRecommendations").isVisible(),true,"Question must produce an explicit source confirmation");
 assert.equal(await start.locator("#heroSourceSelect").inputValue(),"auto");
 assert.equal(await start.locator("#workspaceWelcome").isVisible(),true);
 assert.equal(await start.locator("#resultSection").isVisible(),false,"Question must not silently choose a law");
 assert.equal(await start.locator("[data-recommend-source='mpbetreibv']").count(),1);
 await start.locator("[data-recommend-source='mpbetreibv']").click();
 await start.waitForFunction(()=>window.MedtechUploadDemo.status().sourceId==="mpbetreibv"&&
    window.MedtechUploadDemo.status().loaded&&!document.getElementById("resultSection").classList.contains("hidden"),
    null,{timeout:90000});
 assert.equal(await start.locator("#answerStatus").innerText(),"QUELLE GEFUNDEN");
 assert.equal(await start.locator("#workspaceWelcome").isVisible(),false,"Real answer must replace the honest empty state");
 assert.equal(await start.locator("#heroSourceSelect").inputValue(),"mpbetreibv","Chosen source must remain visible in question bar");
 assert.match(await start.locator("#answeredQuestion").innerText(),/Medizinproduktebuch/);
 assert.match(await start.locator("#citationText").innerText(),/medizinproduktebuch/i);
 try{
  await start.waitForFunction(()=>window.MedtechUploadDemo?.status()?.renderedPage>0&&
    document.querySelectorAll("#pdfHighlights .pdf-passage-hit").length>0,null,{timeout:16000});
 }catch(error){
  console.error("V12_HIGHLIGHT_DIAGNOSTIC",JSON.stringify({
   status:await start.evaluate(()=>window.MedtechUploadDemo?.status()),
   excerpt:(await start.locator("#citationText").innerText()).slice(0,200),
   highlights:await start.locator("#pdfHighlights .pdf-passage-hit").count(),
   canvasVisible:await start.locator("#pageCanvas").isVisible()
  }));
  await start.screenshot({path:"artifacts/v12-no-highlight.png",fullPage:true});
  throw error;
 }
 assert.equal(await start.locator("#editorialAnswer").isVisible(),false,"Unmatched free text must not invent a curated legal answer");
 assert.ok(await start.locator("#sourceOfficialLink").getAttribute("href"));
 await start.screenshot({path:"artifacts/v12-01-question-first-desktop.png",fullPage:true});

 const directly=await browser.newPage({viewport:{width:1366,height:850}});
 directly.on("pageerror",e=>errors.push("direct-source: "+e.message));
 await directly.goto(url,{waitUntil:"networkidle"});
 await directly.waitForFunction(()=>document.querySelectorAll("#heroSourceSelect option").length===9);
 await directly.locator("[data-quick-source='mpbetreibv']").click();
 assert.equal(await directly.locator("#heroSourceSelect").inputValue(),"mpbetreibv");
 await directly.locator("#heroQuestionInput").fill("Was steht zum Medizinproduktebuch?");
 await directly.locator("#heroAskButton").click();
 await directly.waitForFunction(()=>window.MedtechUploadDemo?.status()?.sourceId==="mpbetreibv"&&
    window.MedtechUploadDemo?.status()?.loaded&&!document.getElementById("resultSection").classList.contains("hidden"),null,{timeout:90000});
 assert.equal(await directly.locator("#heroRecommendations").isVisible(),false,"Explicit source must not ask for a second confirmation");
 assert.equal(await directly.locator("#answerStatus").innerText(),"QUELLE GEFUNDEN");
 const answerRect=await directly.locator("#resultSection").boundingBox();
 const pdfRect=await directly.locator("#sourceSide").boundingBox();
 assert.ok(pdfRect.x>answerRect.x+answerRect.width-10,"Answer must appear next to the selected original");
 assert.ok(pdfRect.y<=answerRect.y+60,"PDF must align at top of answer, not below source cards");
 await directly.screenshot({path:"artifacts/v3-01-minimal-product-desktop.png",fullPage:true});
 console.log("PASS V3: selected source chip, direct question, real answer beside PDF, no unnecessary chooser");

 console.log("PASS V1.2: question-first, explicit source confirmation, PDF passage overlay and no invented summaries");

 console.log("PASS SOURCE E2E desktop: handbook, 5 government-portal legal PDFs, custom PDF, source isolation, side by side");

 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 mobile.on("pageerror",e=>errors.push("mobile "+e.message));
 await mobile.goto(url,{waitUntil:"networkidle"});
 await mobile.waitForFunction(()=>document.querySelectorAll("[data-source-id]").length===5);
 await mobile.locator("[data-source-group='medtech']").click();
 await mobile.locator("[data-source-id='lumen']").click();
 await ready(mobile,"lumen");
 assert.equal(await mobile.locator("#viewer").isVisible(),true);
 assert.equal(await mobile.locator("#viewerSourceName").innerText(),"LUMEN P200");
 const overflow=await mobile.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 assert.ok(overflow<=3,"Mobile source picker overflow: "+overflow);
 await mobile.screenshot({path:"artifacts/v10-04-mobile-source.png",fullPage:true});
 const mobileFirst=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 mobileFirst.on("pageerror",e=>errors.push("mobile-first: "+e.message));
 await mobileFirst.goto(url,{waitUntil:"networkidle"});
 await mobileFirst.waitForFunction(()=>document.querySelectorAll("[data-source-id]").length===5);
 await mobileFirst.locator("#heroQuestionInput").fill("Was steht zum Medizinproduktebuch?");
 await mobileFirst.locator("#heroAskButton").click();
 await mobileFirst.locator("[data-recommend-source='mpbetreibv']").click();
 await mobileFirst.waitForFunction(()=>window.MedtechUploadDemo.status().loaded&&!document.getElementById("resultSection").classList.contains("hidden"),null,{timeout:90000});
 assert.equal(await mobileFirst.locator("#resultSection").isVisible(),true);
 assert.equal(await mobileFirst.locator("#workspaceWelcome").isVisible(),false);
 assert.equal(await mobileFirst.locator("#heroSourceSelect").isVisible(),true);

 const resultPosition=await mobileFirst.locator("#resultSection").boundingBox();
 const viewerPosition=await mobileFirst.locator("#sourceSide").boundingBox();
 assert.ok(viewerPosition.y>resultPosition.y,"Mobile answer must appear before long original PDF");
 await mobileFirst.locator("#verifySource").click();
 assert.equal(await mobileFirst.locator("#sourceSide").evaluate(el=>el.classList.contains("verify-open")),true);
 await mobileFirst.screenshot({path:"artifacts/v12-02-verify-mobile.png",fullPage:true});
 await mobileFirst.locator("#verifyClose").click();
 assert.equal(await mobileFirst.locator("#sourceSide").evaluate(el=>el.classList.contains("verify-open")),false);
 const mobileFirstOverflow=await mobileFirst.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 assert.ok(mobileFirstOverflow<=3,"Question-first mobile overflow "+mobileFirstOverflow);
 console.log("PASS V1.2 mobile: answer-first, explicit PDF fullscreen verification, escape and zero overflow");

 assert.deepEqual(errors,[]);
 console.log("PASS SOURCE E2E mobile: selected original always available, no overflow");
 await browser.close();
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
