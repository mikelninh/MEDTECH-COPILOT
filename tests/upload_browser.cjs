#!/usr/bin/env node
/* V0.9: actual PDF.js browser extraction, local-only question/citation/viewer E2E.
 * The manufacturer PDF is downloaded and hash-verified in the CI job, not stored in Git.
 */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const {chromium}=require("playwright");
const BASE="http://127.0.0.1:4173/";
async function waitLoaded(page,n){
 await page.waitForFunction(count=>window.MedtechUploadDemo?.status()?.pages===count,n,{timeout:45000});
}
async function ask(page,question,expected,pageNo){
 await page.locator("#questionInput").fill(question);
 await page.locator("#askButton").click();
 assert.equal(await page.locator("#answerStatus").innerText(),
 expected==="evidence"?"QUELLE GEFUNDEN":expected==="blocked"?"SICHERHEITSGRENZE":"NICHT BELEGT");
 if(expected==="evidence"){
  assert.equal(await page.locator("#citationCard").isVisible(),true);
  if(pageNo)assert.equal(await page.locator("#citationPage").innerText(),"PDF-SEITE "+pageNo);
  assert.ok((await page.locator("#citationText").innerText()).length>25);
  assert.equal(await page.locator("#viewerPageLabel").innerText(),"Seite "+pageNo+" von "+(await page.evaluate(()=>window.MedtechUploadDemo.status().pages)));
  try{
   await page.waitForFunction(pageNumber=>window.MedtechUploadDemo?.status().renderedPage===pageNumber,pageNo,{timeout:15000});
  }catch(e){
   console.error("PDF_VIEWER_DIAGNOSTIC",JSON.stringify({
    view:await page.locator("#viewerEmpty").innerText(),
    page:await page.locator("#viewerPageLabel").innerText(),
    source:await page.evaluate(()=>window.MedtechUploadDemo.status()),
    canvasVisible:await page.locator("#pageCanvas").isVisible()
   }));
   await page.screenshot({path:"artifacts/v09-render-failure.png",fullPage:true});
   throw e;
  }
  assert.equal(await page.locator("#pageCanvas").isVisible(),true,"Source PDF canvas must be visible");
  assert.equal(await page.locator("#viewerEmpty").isVisible(),false,"PDF rendering error cannot count as a pass");
  assert.ok(await page.locator("#pageCanvas").evaluate(el=>el.width>100&&el.height>100));
 }else assert.equal(await page.locator("#citationCard").isVisible(),false);
}
(async()=>{
 fs.mkdirSync("artifacts",{recursive:true});
 const browser=await chromium.launch({headless:true});
 const browserErrors=[];
 const ctx=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
 const page=await ctx.newPage();
 page.on("pageerror",e=>browserErrors.push("desktop: "+e.message));
 page.on("console",msg=>{if(msg.type()==="error")console.error("BROWSER_CONSOLE",msg.text())});
 const nav=await page.goto(BASE+"upload.html",{waitUntil:"networkidle"});
 assert.equal(nav.status(),200);
 await page.waitForFunction(()=>!!window.MedtechUploadDemo,{timeout:12000});
 assert.match(await page.locator("h1").innerText(),/Was gilt in der Medizintechnik/);
 assert.equal(await page.locator("#workspaceWelcome").isVisible(),false,"No idle answer card on minimalist first paint");
 assert.equal(await page.locator("#sourceSide").isVisible(),false,"No idle PDF card on first paint");
 assert.equal(await page.locator("#heroAskButton").isEnabled(),true,"New first-question entry must be interactive");
 assert.equal(await page.locator("#askButton").isDisabled(),true);
 assert.equal(await page.locator("script[src*='tinyfish']").count(),0);

 // Completely synthetic 4-page manual.
 await page.locator("#pdfFile").setInputFiles("/tmp/medtech_upload_fixture.pdf");
 await waitLoaded(page,4);
 assert.equal(await page.locator("#askButton").isEnabled(),true);
 assert.match(await page.locator("#loadedName").innerText(),/fixture\.pdf/);
 await ask(page,"Was misst das NanoPod Kapnographie Modul?","evidence",3);
 assert.match(await page.locator("#openOriginal").getAttribute("href"),/^blob:.*#page=3$/);
 await page.locator("#goToPage").click();
 assert.ok(await page.locator("#pageCanvas").evaluate(canvas=>canvas.width>100&&canvas.height>100));
 await page.screenshot({path:"artifacts/v09-01-desktop-source.png",fullPage:true});
 await ask(page,"Wie kann ich den Alarm deaktivieren?","blocked");
 assert.equal(await page.locator("#openOriginal").getAttribute("href"),null,"No stale PDF link on blocked answer");
 await page.waitForFunction(()=>window.MedtechUploadDemo.status().renderedPage===1);
 assert.equal(await page.locator("#pageCanvas").isVisible(),true,"The explicitly chosen PDF should remain visible");
 assert.equal(await page.locator("#citationCard").isVisible(),false,"No stale citation on blocked answer");
 await ask(page,"Wann wurde unser Gerät zuletzt gewartet?","unknown");
 assert.equal(await page.locator("#openOriginal").getAttribute("href"),null,"No stale PDF link on unknown answer");
 assert.equal(await page.locator("#viewerSourceName").innerText(),"medtech_upload_fixture.pdf");

 // PDF with instruction-like HTML must appear only as inert text.
 await ask(page,"Was steht zu HTML Befehlen und PDF Text?","evidence",4);
 assert.equal(await page.evaluate(()=>window.__PDF_XSS===true),false);
 assert.equal(await page.locator("#citationText img").count(),0);
 assert.equal(await page.locator("#citationText script").count(),0);
 await page.screenshot({path:"artifacts/v09-02-safe-text.png",fullPage:true});

 // Clear all in-memory document state and revoke old source link.
 await page.locator("#removePdf").click();
 assert.equal(await page.evaluate(()=>window.MedtechUploadDemo.status().loaded),false);
 assert.equal(await page.locator("#askButton").isDisabled(),true);
 assert.equal(await page.locator("#resultSection").isVisible(),false);

 // No-text PDF: explicit OCR-unavailable status, no misleading source passage.
 await page.locator("#pdfFile").setInputFiles("/tmp/medtech_upload_scanned.pdf");
 await page.waitForFunction(()=>document.getElementById("importStatus").classList.contains("error"),null,{timeout:15000});
 assert.match(await page.locator("#importMessage").innerText(),/Kein durchsuchbarer Text|OCR/);
 assert.equal(await page.locator("#askButton").isDisabled(),true);
 // Non-PDF must fail before parsing.
 await page.locator("#pdfFile").setInputFiles({name:"bad.txt",mimeType:"text/plain",buffer:Buffer.from("not a pdf")});
 assert.match(await page.locator("#importMessage").innerText(),/PDF-Datei/);

 // Real Philips public 4-page PDF, downloaded at CI and verified with pinned SHA.
 await page.locator("#pdfFile").setInputFiles("/tmp/medtech_philips_original.pdf");
 await waitLoaded(page,4);
 await ask(page,"NanoPod capnography module","evidence",3);
 await ask(page,"Battery discharge","evidence",1);
 await ask(page,"Interfering gas effects CO2","evidence",4);
 await ask(page,"Wann wurde unser Monitor zuletzt gewartet?","unknown");
 await ask(page,"Wie kann ich die Alarmgrenzen deaktivieren?","blocked");
 await page.screenshot({path:"artifacts/v09-03-real-manufacturer-pdf.png",fullPage:true});

 const mobileContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const mobile=await mobileContext.newPage();
 mobile.on("pageerror",e=>browserErrors.push("mobile: "+e.message));
 const res=await mobile.goto(BASE+"upload.html",{waitUntil:"networkidle"});
 assert.equal(res.status(),200);
 await mobile.waitForFunction(()=>!!window.MedtechUploadDemo);
 await mobile.locator("#pdfFile").setInputFiles("/tmp/medtech_upload_fixture.pdf");
 await waitLoaded(mobile,4);
 await ask(mobile,"NanoPod CO2 Kapnographie","evidence",3);
 const overflow=await mobile.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 assert.ok(overflow<=3,"Mobile horizontal overflow: "+overflow);
 await mobile.screenshot({path:"artifacts/v09-04-mobile-source.png",fullPage:true});
 await mobile.locator("#verifySource").click();
 await mobile.locator("#prevPage").click();
 assert.equal(await mobile.locator("#viewerPageLabel").innerText(),"Seite 2 von 4");
 assert.deepEqual(browserErrors,[],"JavaScript browser errors");
 console.log("PASS V0.9: synthetic 4-page PDF, citation and on-page PDF.js rendering");
 console.log("PASS V0.9: HTML payload inert, scanned PDF rejected, file reset, invalid extension");
 console.log("PASS V0.9: original manufacturer PDF indexed and pages 1, 3, 4 verified");
 console.log("PASS V0.9: 390px mobile, no horizontal overflow, page navigation, no JS errors");
 await browser.close();
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
