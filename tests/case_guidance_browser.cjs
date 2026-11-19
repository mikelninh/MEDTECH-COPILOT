const { chromium } = require("playwright");
const { readFile } = require("node:fs/promises");
const assert = require("node:assert/strict");

const url = "http://127.0.0.1:4173/upload.html";
const byCheck = (page, key) => page.locator(`[data-check="${key}"]`);
async function text(page, selector, snippet) {
  await page.waitForFunction(([selector, snippet]) => document.querySelector(selector)?.textContent.includes(snippet), [selector, snippet], { timeout: 12000 });
}

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.querySelectorAll("#heroSourceSelect option").length === 9);
    await page.locator("#caseWorkspace > summary").click();
    await page.locator("#caseExample").click();
    await text(page, "#casePriorityTitle", "Für die Benutzung durch Laien vorgesehen");
    await page.locator("#casePracticeLink").click();
    assert.equal(await page.locator("#practiceContext").inputValue(), "aed");
    assert.equal(await page.locator("#practiceChoices button").count(), 10);
    await page.locator("#casePriorityGo").click();
    assert.equal(await byCheck(page, "purpose").locator("select").evaluate(el => el === document.activeElement), true);
    await byCheck(page, "purpose").locator("select").selectOption("yes");
    await text(page, '[data-check="purpose"] summary', "Angabe ohne Nachweis");
    await byCheck(page, "purpose").locator("input").fill("Übungs-IFU · Kapitel 1");
    await text(page, "#casePriorityTitle", "Selbsttestfunktion");

    await byCheck(page, "commissioned").locator("summary").click();
    await byCheck(page, "commissioned").locator('input[type="date"]').fill("2027-01-01");
    assert.equal(await byCheck(page, "remote").count(), 0);
    await byCheck(page, "commissioned").locator('input:not([type])').fill("Übungsakte · Inbetriebnahmeprotokoll");
    assert.equal(await byCheck(page, "remote").count(), 1);
    await page.locator(".case-rule-set summary").click();
    await page.locator("#caseRuleList li").filter({ hasText: "S. 2–3" }).getByRole("button").click();
    await text(page, "#citationText", "anlassbezogen erfolgen");
    await page.locator("#casePin").click();
    await text(page, "#caseRuleList", "Festgehaltenen Beleg öffnen");

    await page.locator('[data-case-field="assessment"]').fill("Die fachliche Entscheidung wird durch das Prüfteam getroffen.");
    await page.locator('[data-case-field="owner"]').fill("Medizintechnik");
    await page.locator(".case-draft summary").click();
    await page.locator("#caseAdoptDraft").click();
    assert.match(await page.locator('[data-case-field="assessment"]').inputValue(), /^Die fachliche Entscheidung/);
    await page.locator("#casePrepare").click();
    await text(page, "#caseStatus", "Bestätige die fachliche Prüfung");
    await page.locator("#caseReviewed").check();

    await byCheck(page, "fault").locator("summary").click();
    await byCheck(page, "fault").locator("select").selectOption("failed");
    await text(page, "#casePriorityTitle", "sofort weitergeben");
    assert.equal(await page.locator("#caseReviewed").isChecked(), false);
    await page.locator("#casePrepare").click();
    await text(page, "#caseStatus", "älteren Fallstand");
    await page.locator("#casePriorityGo").click();
    await text(page, "#citationText", "unverzüglich wiederhergestellt");
    await page.locator("#casePin").click();
    await page.locator("#caseAdoptDraft").click();
    assert.match(await page.locator('[data-case-field="next"]').inputValue(), /unverzüglich/);
    await page.locator("#caseReviewed").check();
    await page.locator("#casePrepare").click();
    await text(page, "#caseStatus", "Übergabe vorbereitet");
    const response = page.waitForEvent("download");
    await page.locator("#caseExport").click();
    const report = await readFile(await (await response).path(), "utf8");
    assert.match(report, /Fallnachweise \(Angaben der Fachkraft\)/);
    assert.match(report, /Selbsttest fehlgeschlagen/);
    assert.match(report, /Abrufdatum/);
    assert.match(report, /§ 12 Abs\. 2 letzter Satz/);
    assert.match(report, /Die fachliche Entscheidung wird durch das Prüfteam/);

    await page.reload({ waitUntil: "networkidle" });
    await page.locator("#caseExample").click();
    await page.locator('[data-case-field="resolution"]').fill("Medizintechnik hat die Verantwortung für die Prüfung dokumentiert.");
    await page.locator("#caseClose").click();
    assert.equal(await page.locator("#caseWorkspace").getAttribute("data-phase"), "closed");
    assert.equal(await page.locator("#casePriority").isVisible(), false);

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    mobile.on("pageerror", error => errors.push(error.message));
    await mobile.goto(url, { waitUntil: "networkidle" });
    await mobile.locator("#caseWorkspace > summary").click();
    await mobile.locator("#caseExample").click();
    await mobile.locator("#casePriorityGo").click();
    assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 3));
    await mobile.locator("#caseGuidance").screenshot({ path: "artifacts/case-guidance-mobile.png" });
    await page.locator("#caseBack").click();
    await page.locator("#caseGuidance").screenshot({ path: "artifacts/case-guidance-desktop.png" });
    assert.deepEqual(errors, []);
    console.log("PASS AED intake, evidence priority, date boundary, PDF pins, urgent branch, reviewed handoff, reload, close and mobile");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
