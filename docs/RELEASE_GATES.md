# Release gates — MEDTECH COPILOT

**Status: NOT APPROVED for internal hospital use.** This is an independently built public portfolio demo, not a clinical system, a real RAG/LLM pipeline, or a UKB-approved tool.

## Two separate release decisions

### A. Supervised demonstration to interested colleagues (no real devices or data)
Every **mandatory** gate below must be passed before distributing an unattended public link. The existing public code repository is not an endorsement to deploy at a hospital.

| Gate | Definition of done | Evidence required | Current status |
| --- | --- | --- | --- |
| D1 — Scope & branding | Prominently states prototype, no affiliation, no medical use; fictional cases distinguishable from law | Source/UI review | PASS in code; verify in browsers |
| D2 — Automated regression | All backend unit tests and JavaScript routing tests pass for current commit; zero failing tests | GitHub Actions check on exact release SHA | PASS on initial workflow run; re-check latest commit |
| D3 — Clinical/technical abstention | 0 unsafe instructions; 0 invented values for unknown device/model; 0 unsupported claims in a **separate** adversarial set of >=20 questions | Manual signed-off test sheet | NOT DONE |
| D4 — Source trust | Every factual legal answer opens its relevant authoritative source; accurate section & no stale/version-conflicted source | Human verification of all five legal entries | NOT DONE |
| D5 — UI smoke & accessibility | Chat, source link, document search, guided case, quality page, keyboard control tested in desktop + mobile; broken/no-microphone fallback works | Screen recording or checklist | NOT DONE |
| D6 — Privacy of speech & inputs | No private/patient data, clear warning about browser-dependent external speech recognition, no upload/telemetry; live page served over HTTPS | Browser network/permissions audit | IN PROGRESS |
| D7 — Usability | 3 independent testers perform one source lookup and one guided case unaided; record confusion and completion time | 3 observations and revisions | NOT DONE |
| D8 — Live URL | Published URL tested from a second non-developer device, incl. mobile; no link-only assumptions | Real availability check | NOT DONE |

**Decision:** A guided, clearly labelled concept discussion can happen now. A broadly shared demo should wait until all mandatory demo gates pass. Never use this prototype to make care or equipment decisions.

### B. Connected hospital pilot (separate deployment and new gate)
**All gates are mandatory**; a passing demo is not authorization.

1. Written approval by hospital Medizintechnik owner, IT security, data protection and applicable clinical/device safety stakeholders.
2. Signed corpus/data inventory and per-document owner; licensing checks; no patient/service-ticket raw text without specific authorization, lawful basis and risk assessment.
3. Private authenticated environment and real server-enforced ACLs, independent penetration testing, logs with minimum necessary data, secrets and encryption.
4. Revocation and permission-change tests: 0 leaks after access removal; cached chunks, embeddings and citations purged across layers.
5. Approved, version-controlled document lifecycle: integrity hashes, current version only for routine retrieval, auditable citations to exact page and passage.
6. Domain review: independent blind reference set **at least 50** representative real questions; >=95% correct source retrieval and **100% verified grounding on answered questions**, with mandatory abstention on unsupported cases. Thresholds are proposed targets, to be signed off by hospital risk owners.
7. Safety/abuse: **zero** actionable unsafe clinical or service instructions across the agreed red-team suite. A zero observed failure rate in a finite suite is not a guarantee.
8. Workflow design excludes autonomous repair, measurements, equipment release or patient-facing advice. Operator remains accountable; full risk analysis and training before use.
9. Voice and accessibility approved for workplace use; consent/notice, local alternatives, retention and browser/provider processing assessed.
10. Formal pilot authorization with stop conditions, escalation owner, incident response and post-pilot evaluation.

## Demo tests currently present
- 24 deterministic question-routing/refusal regression cases: `node tests/test_assistant.cjs`
- 6 demonstration document-gating unit tests: `python -m unittest discover -s tests -v`
- 12 built-in browser sample checks, not equivalent to user acceptance or hospital risk evaluation.
- CI workflow `.github/workflows/quality.yml` runs Python + Node tests on push/PR.
- **Known limits**: only nine entries (five legal and four fictional); no real document import, model, vector index, identity integration or production secure backend; browser voice depends on browser/provider.

## Suggested 3-minute Thursday walkthrough
1. Show 'Was ist eine STK?' and click the official law source.
2. Ask 'Welche Spannung hat unser Defibrillator?' and show honest no-data abstention.
3. Ask an unsafe alarm-bypass question and show refusal.
4. Open the fictional guided-service case and explain it is not a manufacturer's procedure.
5. End by asking the team what knowledge-management problem they actually experience, rather than asserting an unverified need.

## Release checklist sign-off
- [ ] D1-D8 reviewed and evidenced
- [ ] Version and test-run URL documented
- [ ] No real devices/patients/internal docs in demo
- [ ] At least one independent reviewer signed off public demo
- [ ] Distribution approved for its intended audience

Reference legal sources: https://www.gesetze-im-internet.de/mpbetreibv_2025/  
DSK RAG guidance: https://www.datenschutzkonferenz-online.de/media/oh/DSK_OH_RAG.pdf
