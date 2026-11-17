# MEDTECH COPILOT

**Quellenbasierter Wissensassistent für Krankenhaus-Medizintechnik** — public proof of concept, not affiliated with BG Klinikum Unfallkrankenhaus Berlin.

## Demo
Run `index.html` in a current browser, or open the published demo URL once deployed. Includes searchable knowledge, evidence-backed answers, guided simulation, voice input/output when supported, document library and self-tests. No accounts, backend or patient data.

**Safety:** Not approved for clinical decisions, device repairs, commissioning or release. All device-specific workflows are explicitly fictional exercises. Do not upload internal documents or personal/health data to the public demo. The demo uses deterministic local retrieval; **it is not a production LLM RAG deployment**.

## Architecture: prototype → hospital pilot
See [docs/INTEGRATION.md](docs/INTEGRATION.md) for approvals, ingestion, metadata, permissions, source freshness, security controls and acceptance tests.

## Local test
Open `index.html` in a browser; go to **Qualitätstest** and run the checks. On unsupported browsers, voice buttons will be disabled.

## Source policy
Legal citations point to the official publicly available MPBetreibV; other content is marked as fictional exercises, not manufacturer's instructions. No source data in this repo grants authorization to service any medical device.

## Roadmap
1. Document review and owner-approved corpus.
2. Adapter for hospital DMS with read-only least-privilege service identity.
3. Signed document metadata, source linking, ACL-aware hybrid search.
4. Private EU/on-prem model evaluation and clinical/medtech risk sign-off.
5. Only then controlled pilot; no autonomous equipment actions.
