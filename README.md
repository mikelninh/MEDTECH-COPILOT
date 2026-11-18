# MEDTECH COPILOT — FIELDNOTES v0.9

**Bring Your Own Manual: ask a local PDF and verify the original page.**

Independent, public prototype for hospital-medical-engineering knowledge workflows. **Not affiliated with, connected to, or approved by UKB**. Not suitable for clinical decisions, device servicing or release.

## Live prototype

https://mikelninh.github.io/MEDTECH-COPILOT/

**V0.9 upload workspace:** https://mikelninh.github.io/MEDTECH-COPILOT/upload.html

### NEW · V0.9 Bring Your Own Manual

- Select a **text-based, non-confidential PDF** (max 15 MB, 120 pages). It is processed entirely inside the browser using **self-hosted Mozilla PDF.js 6.5.438**. Nothing in the PDF or the questions is uploaded to an application server.
- Full page-by-page text extraction and local passage index. Type a question in German or English; receive **an exact extracted passage and PDF page**, or a visible abstention/safety boundary. This is **lexical, extractive retrieval** and **not** semantic/LLM RAG.
- The **original PDF page is rendered beside the evidence**; a temporary local blob URL opens the PDF at the cited page in the browser.
- Clear document/index/blob URL from browser memory with **Remove PDF**. No database, cookies or localStorage. Hosted page/library downloads may be logged by the platform.
- No scanned-page OCR, no patient-data access, no document upload service, no repair or therapy instructions.
- Strict new test suite: 70+ unit cases, manufacturer PDF browser upload, synthetic multi-page PDF, scanned textless document, HTML-safe source display, mobile and reset paths. Exact current results live in [GitHub Actions](https://github.com/mikelninh/MEDTECH-COPILOT/actions).
- See [V0.9 design, privacy and technical gates](docs/BYOM_V09.md).

**Risk notice:** An excerpt may be related without answering the question. Human interpretation and verifying model/version/source are mandatory. This prototype is not approved for medical use.


## What actually works
- **Real manufacturer reference:** Seven independently paraphrased references to Dräger Vista 120 / Vista 120S SW 3.n, printed pages **82–83**. The previously indexed direct German PDF URL was unavailable (404) on live verification, so the app links to the official [Dräger documentation portal](https://www.draeger.com/ifu). Recheck model, software and original document there. The full copyrighted PDF is **not** republished here. Always verify instructions/revisions and applicable supplements against the real device.
- **Three public acceptance questions:** documented alarm meaning → source page; unknown local service history → abstain; alarm bypass → refuse. Three one-click buttons on the simplified home screen.
- **Passage retrieval (BM25):** browser-side index over `data/corpus.json`. Searches versioned text sections, produces exact extracts with document title, version and section; excludes retired documents. German/English query expansion for common medtech terms.
- **Three fictional device contexts:** ORION M100 monitor, LUMEN P200 pump, AERIS V300 ventilator. The device selection limits document search to applicable fictional manuals and general SOPs.
- **QR code hand-off:** QR labels generated at build time encode public deep links to fictional device profiles. Scan with a regular phone camera; in supported browsers, the demo also supports BarcodeDetector via explicit camera permission. Manual asset-ID entry always works.
- **Field guidance:** a deliberately high-level, safety-first four-step learning flow with source provenance; never a repair procedure.
- **Voice:** browser push-to-talk and text-to-speech with stop. Browser speech recognition may use external providers; do not dictate protected information.
- **Source library:** live/retired status, source provenance and links to official German law sources.
- **Seventeen interactive case demos:** seven manufacturer-reference cases, seven fictional service workflows and three failure-boundary cases, grouped to avoid information overload.
- **Strict evaluation:** 142/142 reproducible fixture checks (source integrity, wrong models/revisions, privacy, safety, revocation) and successful desktop/mobile Chromium journeys. See [strict audit report](docs/STRICT_AUDIT.md). This is **not** medical validation.

**Critical disclosure:** The prototype uses *real passage retrieval and extractive answers*, but **NOT an LLM, embeddings, production RAG service or live hospital DMS**. The corpus contains fictional training cards, brief non-authoritative summaries of the MPBetreibV, and **seven paraphrased entries anchored to the indexed Dräger SW 3.n manual**. For the real manufacturer source, displayed text is a **curated summary, not a verbatim quote or full-PDF ingestion**. The assistant has no generative model and does not check current manufacturer revisions automatically.

## Run locally

```sh
# PDF upload module needs the pinned PDF.js build and worker, served same-origin:
npm install --no-save --ignore-scripts --no-audit --no-fund pdfjs-dist@6.5.438
mkdir -p vendor
cp node_modules/pdfjs-dist/build/pdf.mjs vendor/pdf.mjs
cp node_modules/pdfjs-dist/build/pdf.worker.mjs vendor/pdf.worker.mjs
python3 -m http.server 4173
# open http://localhost:4173/upload.html
```

QR SVGs are built for the public deployment with `python scripts/make_labels.py qr` after installing the Python `qrcode` package. The rest works without external packages.

## Test

```sh
node tests/test_assistant.cjs
python3 -m unittest discover -s tests -v
```

Chromium browser tests run in GitHub Actions; screenshots are retained as workflow artifacts. See `tests/browser_smoke.cjs`.

## Safety architecture
- No account, backend or third-party LLM endpoint in the public demo.
- No patient data, hospital documents or internal records.
- Device labels are **fictional**; code never connects to or operates equipment.
- No equipment release, measurement, safety certification or clinical advice.
- Archived sources excluded from retrieval; old version view labelled as archive.
- Lack of supporting passage => abstain. Rules also block common unsafe prompts; **these are incomplete and NOT production-grade safeguards**.

## Next product milestone
With hospital owner/IT/privacy approval: internal document inventory and governance → actual secure ingestion → ACL-aware hybrid retrieval → citations to verified source versions → independent expert validation → restricted pilot. See `docs/INTEGRATION.md` and `docs/RELEASE_GATES.md`.

Built as a portfolio and collaboration conversation starter, not a deployable hospital product.
