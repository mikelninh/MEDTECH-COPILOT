# GitLaw × MEDTECH COPILOT: SOURCE FIRST

**Aim:** No answer without an expressly selected source. Show the inspected source **side by side** with the result, not only as a URL.

## Real supported source choices

- **Two original, fictional engineering manuals:** LUMEN P200 and ORION M100, clearly labelled as training material (not actual equipment instructions).
- **Three GitLaw non-official reader editions:** current GitLaw repository snapshots of MPBetreibV 2025, MPDG and ArbSchG. Browser reads the generated reader PDF and cites that edition's PDF viewer page.
- **Own document:** a locally selected, text-based PDF, processed in the browser (max 15 MB, 120 pages).
- **All federal laws:** [Open the complete GitLaw research tool](https://mikelninh.github.io/gitlaw/#/research). The MEDTECH source picker **does not load or independently verify all 5,936 laws**. Its three editions are bounded snapshots.

## Source-to-answer contract

1. Explicitly select one document. Until one is chosen, question input is unavailable.
2. Verify example PDF SHA-256 against a CI-generated public catalog before indexing its text.
3. Index **only** the chosen document's extracted passages.
4. Retrieve a candidate excerpt or explicitly abstain / block if unsafe. Answer is **extractive**, not generative reasoning.
5. Keep the document in the adjacent sticky right-hand panel while reading questions and results; automatically navigate to the cited PDF page.
6. A source switch must discard the previous answer, PDF and index, so no citation can leak from another source.
7. The right panel distinguishes an official *reference link* from the non-official PDF used for citation. The original law text at gesetze-im-internet.de may have changed, and the official PDF page numbers are **not** those of the GitLaw reader edition.
8. Own PDF is local-memory-only; sample PDFs are explicitly downloaded by the browser from GitHub Pages; standard website access logs may exist.

## Why this reuses GitLaw

The design borrows GitLaw's philosophy of **source resolution → evidence → independently inspectable original → human decision** rather than treating an LLM answer as proof. The implementation does **not** reuse GitLaw's full 5,936-law FAISS/BM25 backend: this remains a small static browser demo.

## Safety and quality gates

- Automated GitLaw reader PDF generation and source fingerprint check for five selected sample documents.
- Citation & version checks; 71 new document retrieval tests and the earlier 142 strict regression tests.
- Desktop/mobile Chromium test of source selection, cross-source isolation, PDF-page rendering and the persistent side-by-side layout.
- Official source links must be explicitly verified by readers, and clinical/repair decisions remain out of scope.

**Not a medical device, legal advice or a production hospital system.** Reusing this pattern in medtech means adding manufacturer approvals, version and device mapping, ACLs, approved source management and independent expert review before real deployment.
