const { chromium } = require("playwright");
const { readFile } = require("node:fs/promises");
const assert = require("node:assert/strict");

const url = "http://127.0.0.1:4173/upload.html";
async function ready(page) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelectorAll("#heroSourceSelect option").length === 9);
}
async function contains(locator, needle) {
  await locator.evaluate((el, expected) => new Promise((resolve, reject) => {
    let timer;
    const observer = new MutationObserver(check);
    function check() {
      if (el.textContent.includes(expected)) {
        clearTimeout(timer);
        observer.disconnect();
        resolve();
      }
    }
    observer.observe(el, { subtree: true, childList: true, characterData: true });
    timer = setTimeout(() => {
      observer.disconnect();
      reject(new Error("Expected " + expected + " in " + el.textContent));
    }, 12000);
    check();
  }), needle);
}

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await ready(page);
    assert.equal(await page.locator("#caseWorkspace").evaluate(el => el.open), false);
    await page.locator("#caseWorkspace > summary").click();
    await page.locator("#caseCreate").click();
    const id = await page.locator("#casePicker").inputValue();
    await page.locator("#caseStart").click();
    await contains(page.locator("#caseStatus"), "beobachteten Fakten");
    await page.locator("#caseTitle").fill("AED Eingangshalle");
    await page.locator("[data-case-field=facts]").fill("Selbsttest gemeldet, Zweckbestimmung und letzte Sichtprüfung fehlen.");
    await page.locator("#caseStart").click();
    await page.locator("#caseQuestions button").first().click();
    await contains(page.locator("#editorialAnswer"), "zum zweiten Mal");
    await page.locator("#dialogFollowups").getByRole("button", { name: "Welche Ausnahmen gibt es?" }).click();
    await contains(page.locator("#editorialAnswer"), "Sichtprüfung");
    await page.locator("#questionInput").fill("Gilt das auch für AEDs?");
    await page.locator("#askButton").click();
    await contains(page.locator("#editorialAnswer"), "Fernüberwachung");
    await page.locator("#questionInput").fill("Was ändert sich ab 2027?");
    await page.locator("#askButton").click();
    await contains(page.locator("#citationText"), "anlassbezogen erfolgen");
    await page.locator("#casePin").click();
    await contains(page.locator("#casePinStatus"), "AED Eingangshalle");
    await page.locator("#casePin").click();
    await contains(page.locator("#casePinStatus"), "bereits im Fall");
    await page.locator("#caseProofSummary").click();
    await contains(page.locator("#caseEvidence"), "§ 12 Abs. 2 S. 2–3");
    await page.locator("[data-case-field=open]").fill("Inbetriebnahmedatum fehlt.");
    await page.locator("[data-case-field=assessment]").fill("Ob die Ausnahme zutrifft, ist offen.");
    await page.locator("[data-case-field=next]").fill("Zweckbestimmung und Nachweise prüfen.");
    await page.locator("[data-case-field=owner]").fill("Medizintechnik");
    await page.locator("#casePrepare").click();
    await contains(page.locator("#caseStatus"), "Übergabe vorbereitet");
    const download = page.waitForEvent("download");
    await page.locator("#caseExport").click();
    const report = await readFile(await (await download).path(), "utf8");
    assert.match(report, /AED Eingangshalle/);
    assert.match(report, /Inbetriebnahmedatum fehlt/);
    assert.match(report, /§ 12 Abs\. 2 S\. 2–3/);
    assert.match(report, /SHA-256: [a-f0-9]{64}/);

    await ready(page);
    await page.locator("#caseWorkspace > summary").click();
    await page.locator("#casePicker").selectOption(id);
    assert.equal(await page.locator("[data-case-field=owner]").inputValue(), "Medizintechnik");
    assert.equal(await page.locator("[data-case-field=assessment]").isDisabled(), true);
    await page.locator("#caseProofSummary").click();
    await page.locator("#caseEvidence").getByRole("button", { name: "PDF-Beleg wieder öffnen" }).click();
    await contains(page.locator("#answerLead"), "gespeicherte Fassung und PDF-Seite abgeglichen");
    await page.locator("#caseClose").click();
    await contains(page.locator("#caseStatus"), "wer den Fall übernommen");
    await page.locator("[data-case-field=resolution]").fill("Das Prüfteam hat übernommen und die Nachweise dokumentiert.");
    await page.locator("#caseClose").click();
    await contains(page.locator("#caseStatus"), "ist abgeschlossen");
    assert.equal(await page.locator("#caseWorkspace").getAttribute("data-phase"), "closed");
    await page.locator("#caseType").selectOption("incident");
    await page.locator("#caseCreate").click();
    await page.locator("#caseTitle").fill("Anonymisierte Beobachtung");
    await page.locator("[data-case-field=facts]").fill("Technische Störung zeitlich dokumentiert.");
    await page.locator("#caseStart").click();
    await page.locator("#caseQuestions button").first().click();
    await contains(page.locator("#editorialAnswer"), "unverzüglich");
    await page.locator("#casePin").click();
    await page.locator("#caseQuestions button").nth(1).click();
    await contains(page.locator("#editorialAnswer"), "zentrale Kontaktstelle");
    await page.locator("#casePin").click();
    await page.locator("#caseProofSummary").click();
    await contains(page.locator("#caseEvidence"), "MPAMIV");
    await contains(page.locator("#caseEvidence"), "MPBetreibV");

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    mobile.on("pageerror", error => errors.push(error.message));
    await ready(mobile);
    await mobile.locator("#caseWorkspace > summary").click();
    await mobile.locator("#caseCreate").click();
    assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 3));
    await mobile.screenshot({ path: "artifacts/v4-case-mobile.png", fullPage: true });
    await page.screenshot({ path: "artifacts/v4-case-desktop.png", fullPage: true });
    assert.deepEqual(errors, []);
    console.log("PASS Fallanlage, 4-turn AED dialog, pin, export, reload, reopen, closure, two statutes and mobile.");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
