# MEDTECH COPILOT V0.9 — Bring Your Own Manual

**Public prototype:** https://mikelninh.github.io/MEDTECH-COPILOT/upload.html  
**Independent demonstration, not a product of UKB or Philips and not approved for clinical use.**

## The user's actual journey

1. Open the upload workspace. Select a **public, non-confidential, text-based** PDF (up to 15 MB and 120 pages).
2. Browser-local Mozilla PDF.js reads each page's text. The file bytes and extracted text remain in memory in that browser tab.
3. Ask a free-form question in German or English.
4. The deterministic engine returns either (a) a **verbatim extracted passage and original PDF page**, (b) **not enough evidence**, or (c) **safety boundary**.
5. A PDF.js-rendered original page sits beside the passage. Follow the numbered citation, page arrows or temporary blob URL.
6. Remove the file to destroy the PDF instance, revoke the blob URL, and clear the in-memory index. Reloading the page also clears it.

**Important:** The answer is an extractive *candidate passage*, **not a semantic or generative answer**. A match does not prove that the passage fully answers the question. The reader must check the original page, device, revision and context. Clinical or servicing decisions are prohibited.

## Local data-flow design

```text
User file → browser File API (arrayBuffer)
          → PDF.js worker (self-hosted on GitHub Pages)
          → page-wise text extraction
          → in-memory 65–90-word overlapping passage index
User question → local tokenisation, German/English synonyms, lexical scoring
              → evidence / unknown / blocked
              → excerpt + page reference → PDF.js-rendered original page
Remove file → PDF destroy + blob URL revoke + in-memory index cleared
```

No file upload endpoint, accounts, model APIs, cookies, localStorage or conversation history. The app downloads **its own scripts** from GitHub Pages, which may produce standard hosting access logs. The original PDF and the entered question are not submitted to an application server. No browser speech recognition is used in this mode.

**Please do not use internal hospital documents or personal/patient data in this public demonstration.** A local-only browser prototype is not a substitute for an organisational information-security review.

## Document limitations

- PDF only; type/header and file size validated. The file must include an extractable text layer: no OCR for scans or photographs.
- Up to 15 MB, 120 pages and 1.2 million extracted characters. These thresholds keep browser memory and mobile use bounded; performance depends on hardware.
- Page references are **PDF viewer page numbers**, not necessarily the printed page numbers.
- Tables, columns, ligatures, layout and technical drawings can produce misleading text order. Figures are visible in the original page renderer but are not interpreted by the search engine.
- The assistant does **not** verify against current manufacturer bulletins or legal requirements, translate documents automatically, or identify a device revision.
- Keyword matching and synonyms are not language understanding. Hallucination controls are conservative but incomplete; there are no patient-care claims.

## Test plan and release gates

1. **Core:** `node tests/upload_core.cjs` — at least 50 predefined evidence, missing-answer and blocked cases, citation provenance, limits, XSS-safe text handling.
2. **Browser:** `node tests/upload_browser.cjs` — actual PDF.js ingestion and rendering of a four-page synthetic manual and a **SHA-256-pinned Philips IFU addendum**, refusal/abstention, scanned-PDF rejection, reset behaviour and 390-pixel mobile layout.
3. **Legacy regression:** `node tests/test_assistant.cjs`, `node tests/strict_audit.cjs`, `node tests/pdf_evidence.cjs` plus original browser journey and seven scripted persona walks.
4. **Deployment:** GitHub Pages publishes **only the exact Git commit whose GitHub Actions quality workflow passed**; PDF.js and its worker are installed at identical pinned version `6.5.438` and hosted under `vendor/`.
5. **Open independent gate:** Two unprompted real users, unfamiliar manuals, independently reviewed correctness/abstention and task completion versus existing manual search; remains unperformed.

This is a portfolio proof of responsible source-grounded engineering, **not** a medically validated device-support assistant.

## Verification

- [Browser source code](../src/upload_app.mjs)
- [Page retrieval core](../src/upload_core.js)
- [GitHub Actions quality gates](../.github/workflows/quality.yml)
- [Original Philips PDF ingestion and pinned SHA](../scripts/ingest_philips_pdf.py)
- [Browser E2E test](../tests/upload_browser.cjs)
- [Core fixtures](../tests/upload_core.cjs)

## Possible V1.0 (not implemented)

With a controlled backend and genuine document access policies: private upload infrastructure, encrypted storage with retention controls, document permissions, hybrid semantic retrieval, figure/table understanding, expert-vetted citations, independently curated evaluation and hospital owner approval. This would be a separate project, not a silent extension of a static public website.
