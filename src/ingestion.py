"""Proof-of-concept document gate. Not an approved hospital security component.

The sample stores only in-process data. Do not use it for real medical/personal data.
External integrations, SSO and hardened enforcement must be independently reviewed.
"""
from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from typing import FrozenSet


@dataclass(frozen=True)
class Document:
    source_id: str
    version: str
    title: str
    owner: str
    content: str
    acl_groups: FrozenSet[str]
    approval_status: str
    privacy_reviewed: bool
    document_type: str = "SOP"
    source_url: str = ""
    page: int = 1


@dataclass(frozen=True)
class IndexedDocument:
    document: Document
    checksum: str


class InMemoryApprovedIndex:
    """Pedagogical document gate.

    A real application must enforce identity and document ACLs in the trusted
    backend and inside every storage/retrieval/cache layer, not just here.
    """

    def __init__(self) -> None:
        self._items: dict[str, IndexedDocument] = {}

    def ingest(self, document: Document) -> str:
        if document.approval_status != "APPROVED":
            raise ValueError("Only approved documents may be indexed")
        if not document.privacy_reviewed:
            raise ValueError("Explicit privacy review is required")
        if not (document.source_id and document.version and document.owner):
            raise ValueError("Missing provenance or version")
        if not document.acl_groups:
            raise ValueError("Missing access control list")
        if not document.content.strip():
            raise ValueError("Document is empty")
        digest = sha256(document.content.encode("utf-8")).hexdigest()
        self._items[document.source_id] = IndexedDocument(document, digest)
        return digest

    def revoke(self, source_id: str) -> bool:
        return self._items.pop(source_id, None) is not None

    def search(self, query: str, user_groups: FrozenSet[str]) -> list[IndexedDocument]:
        # ACL gate BEFORE any ranking and before exposing snippets/metadata.
        authorized = [
            value for value in self._items.values()
            if value.document.acl_groups.intersection(user_groups)
        ]
        tokens = {t.lower() for t in query.split() if len(t) > 2}
        ranked = [
            (sum(token in (v.document.title + " " + v.document.content).lower()
                 for token in tokens), v)
            for v in authorized
        ]
        return [v for score, v in sorted(ranked, key=lambda x: -x[0]) if score > 0]
