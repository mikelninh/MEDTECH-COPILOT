# Internal document ingestion — hospital integration blueprint

> **Design proposal only.** No UKB access, approval or existing system architecture is assumed. Public demo code and production hospital systems must remain separate.

## Governance and data boundaries
- Joint owner decision: Medizintechnik lead + hospital IT security + data protection officer + operational owners; involve procurement/legal, staff council as applicable and device safety officer.
- Create a data inventory: SOPs, manufacturer documents, service tickets, inspection records, device inventory and training. Classify confidential data, personal data, patient data and manufacturer-licensed materials.
- Start with approved, non-personal SOPs/manuals. Do not ingest patient records or free-text service tickets in MVP; require a separately documented legal basis, risk assessment and stringent minimization if later considered.
- Contractual obligations: purpose limitation, processor agreement (where relevant), subprocessor list, region, retention, training/no-training policies, exit/export/deletion plan. Review possible DPIA/DSFA.
- Ingestion is **not** authorization: every source must have an accountable document owner and explicit permitted use.

## Proposed connectors
1. Use hospital-approved DMS/SharePoint/ECM read-only connector (Graph API *if applicable*). No browser copy/paste or public URL proxies.
2. Scope by approved site/folder and service principal permissions; subscribe to changes plus periodic reconciliation. Cache must expire/revoke when source changes.
3. For legacy network shares, use an internal ingestion agent in the hospital network with monitored outbound-only connectivity, or on-prem processing.
4. For ticketing systems, retain tickets in system of record; index only vetted redacted incident knowledge articles, not raw incidents.
5. Maintain provenance: `source_system, source_id, document_id, version, checksum, title, owner, approved_at, valid_from, valid_to, review_due, device_make, model, document_type, language, classification, acl_groups, url, page, section, last_synced_at`.
6. OCR only where needed, validate with the document owner, and extract tables carefully. Chunk by headings and page boundaries; retain every citation link.
7. Build full-text + embeddings/hybrid retrieval on an approved network; index security labels on **every chunk**.
8. At query time authenticate user via hospital SSO, intersect user group memberships with source ACL **before** ranking or showing snippets; revalidate on citation-open and enforce backend filtering.
9. Retrieval outputs: answer passage + exact source, page/section, revision, date, approval status and permissions. On missing, conflicting, out-of-date sources abstain and point to the owner.

## Document state machine
`DISCOVERED → QUARANTINED → PARSED → REVIEW_REQUIRED → APPROVED → INDEXED → RETIRED/REVOKED`.
- Only approved versions are eligible for normal answers.
- Revoke/remove immediately from lexical, vector, caches and session histories on deletion/permission downgrade; verify purge.
- Keep previous versions for controlled audit only, **not** searchable by general users.

## Security and reliability
- Dedicated private project and private network. Default no external model endpoint; if selected, hospital legal/IT approve region and controls.
- TLS, encryption at rest, secret manager, short-lived service credentials, SIEM audit events (without leaking document text or patient data).
- Input defenses: treat retrieved documents as **untrusted evidence**, not instructions to the model. Detect prompt injection and model refusal conditions.
- Time-limited voice transcript handling; no recordings by default, no ambient listening, microphone permission clearly indicated.
- Human review required for repairs, device returns-to-service, normative conclusions. Clinical guidance is out of scope.
- Source monitoring detects checksum mismatch, missing pages, citation drift, version changes and stale documents.

## Example data object
```json
{
  "source_system": "example-dms",
  "source_id": "example-only-123",
  "document_id": "example-SOP-007",
  "version": "2.1",
  "status": "APPROVED",
  "classification": "INTERNAL",
  "acl_groups": ["medtech-team"],
  "device_make": "EXAMPLE",
  "model": "EX-100",
  "section": "5.2",
  "page": 12,
  "checksum": "sha256:...",
  "review_due": "2027-03-31",
  "content": "...",
  "url": "https://internal.example/...",
  "synced_at": "2026-11-17T12:00:00Z"
}
```

## Acceptance / release gates
1. **ACL denial**: users outside authorized group see zero hits, excerpts, suggestions, or citations.
2. **Revocation**: removed access or withdrawn document disappears from every index/cache.
3. **Source integrity**: every substantive statement cites exact approved passage and current version.
4. **Abstention**: absent or contradictory evidence produces no invented process/measurement limits.
5. **Attack tests**: malicious instructions in PDF/ticket cannot trigger disclosure, access, or prohibited advice.
6. **Risk workflow**: unsafe device scenarios require trained staff and escalation, never autonomous approval.
7. **Evaluation**: domain experts score representative questions, retrieval recall, grounded answer precision, latency and user feedback.
8. **Privacy/security sign-off** before connecting first hospital internal document.

## References
- DSK RAG orientation: https://www.datenschutzkonferenz-online.de/media/oh/DSK_OH_RAG.pdf
- MPBetreibV: https://www.gesetze-im-internet.de/mpbetreibv_2025/
- GDPR: https://eur-lex.europa.eu/eli/reg/2016/679/oj
