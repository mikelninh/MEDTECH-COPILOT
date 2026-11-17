# MEDTECH COPILOT — FIELDNOTES v0.4

**Find the right passage. Identify the right device. Know when not to answer.**

Independent, public prototype for hospital-medical-engineering knowledge workflows. **Not affiliated with, connected to, or approved by UKB**. Not suitable for clinical decisions, device servicing or release.

## Live prototype

https://mikelninh.github.io/MEDTECH-COPILOT/

## What actually works
- **Passage retrieval (BM25):** browser-side index over `data/corpus.json`. Searches versioned text sections, produces exact extracts with document title, version and section; excludes retired documents. German/English query expansion for common medtech terms.
- **Three fictional device contexts:** ORION M100 monitor, LUMEN P200 pump, AERIS V300 ventilator. The device selection limits document search to applicable fictional manuals and general SOPs.
- **QR code hand-off:** QR labels generated at build time encode public deep links to fictional device profiles. Scan with a regular phone camera; in supported browsers, the demo also supports BarcodeDetector via explicit camera permission. Manual asset-ID entry always works.
- **Field guidance:** a deliberately high-level, safety-first four-step learning flow with source provenance; never a repair procedure.
- **Voice:** browser push-to-talk and text-to-speech with stop. Browser speech recognition may use external providers; do not dictate protected information.
- **Source library:** live/retired status, source provenance and links to official German law sources.
- **Evaluation:** 26 scripted retrieval/abstention/safety cases plus browser end-to-end smoke on desktop/mobile in GitHub Actions.

**Critical disclosure:** The prototype uses *real passage retrieval and extractive answers*, but **NOT an LLM, embeddings, production RAG service or live hospital DMS**. The documents are fictional training cards, with separate brief non-authoritative summaries of the MPBetreibV linked to the official law. The quote shown is text copied from the indexed document; it is not a generative answer.

## Run locally

```sh
python3 -m http.server 4173
# open http://localhost:4173/
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
