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
 await desktop.waitForFunction(()=>document.querySelectorAll("[data-source-id]").length>0);
 assert.equal(await desktop.locator("[data-source-id='lumen']").count(),1);
 assert.equal(await desktop.locator("[data-source-id='orion']").count(),1);
 for(const img of await desktop.locator(".source-choice .source-cover").all()){
  assert.equal(await img.evaluate(el=>el.complete&&el.naturalWidth>0),true,"All listed books need visible cover images");
 }
 assert.equal(await desktop.locator("#viewer").isVisible(),true);
 await desktop.locator("[data-source-id='lumen']").click();
 await ready(desktop,"lumen");
 const boxes=await Promise.all([".source-chooser","#sourceSide"].map(x=>desktop.locator(x).boundingBox()));
 assert.ok(boxes[1].x>boxes[0].x+boxes[0].width-10,"Source PDF must remain side-by-side on desktop");
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
 await desktop.waitForFunction(()=>document.querySelectorAll("[data-source-id]").length===3);
 assert.equal(await desktop.locator("#questionInput").isDisabled(),true);
 assert.match(await desktop.locator("#viewerSourceName").innerText(),/Bitte Quelle auswählen/);
 assert.ok((await desktop.locator(".all-law-hint a").getAttribute("href")).includes("gitlaw"));
 await desktop.locator("[data-source-id='mpbetreibv']").click();
 await ready(desktop,"mpbetreibv");
 assert.match(await desktop.locator("#sourceOfficialLink").getAttribute("href"),/gesetze-im-internet\.de\/mpbetreibv_2025\/MPBetreibV\.pdf/);
 assert.match(await desktop.locator("#viewerSourceName").innerText(),/MPBetreibV/);
 assert.equal(await question(desktop,"Was steht zum Medizinproduktebuch?"),"QUELLE GEFUNDEN");
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
 console.log("PASS SOURCE E2E desktop: handbook, 3 federal laws, custom PDF, source isolation, side by side");

 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 mobile.on("pageerror",e=>errors.push("mobile "+e.message));
 await mobile.goto(url,{waitUntil:"networkidle"});
 await mobile.waitForFunction(()=>document.querySelectorAll("[data-source-id]").length>0);
 await mobile.locator("[data-source-id='lumen']").click();
 await ready(mobile,"lumen");
 assert.equal(await mobile.locator("#viewer").isVisible(),true);
 assert.equal(await mobile.locator("#viewerSourceName").innerText(),"LUMEN P200");
 const overflow=await mobile.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 assert.ok(overflow<=3,"Mobile source picker overflow: "+overflow);
 await mobile.screenshot({path:"artifacts/v10-04-mobile-source.png",fullPage:true});
 assert.deepEqual(errors,[]);
 console.log("PASS SOURCE E2E mobile: selected original always available, no overflow");
 await browser.close();
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
