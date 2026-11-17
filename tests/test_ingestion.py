import sys
import unittest
from dataclasses import replace
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from ingestion import Document, InMemoryApprovedIndex


class IngestionGateTests(unittest.TestCase):
    def setUp(self):
        self.idx = InMemoryApprovedIndex()
        self.doc = Document(
            source_id="example-1",
            version="1.0",
            title="Demo Wartungsanweisung",
            owner="example-owner",
            content="Demonstration of approved documentation only.",
            acl_groups=frozenset({"medtech-team"}),
            approval_status="APPROVED",
            privacy_reviewed=True,
        )

    def test_only_approved(self):
        with self.assertRaises(ValueError):
            self.idx.ingest(replace(self.doc, approval_status="DRAFT"))

    def test_privacy_review_required(self):
        with self.assertRaises(ValueError):
            self.idx.ingest(replace(self.doc, privacy_reviewed=False))

    def test_empty_acl_rejected(self):
        with self.assertRaises(ValueError):
            self.idx.ingest(replace(self.doc, acl_groups=frozenset()))

    def test_unauthorized_document_invisible(self):
        self.idx.ingest(self.doc)
        self.assertEqual([], self.idx.search("Wartungsanweisung", frozenset({"public"})))
        self.assertEqual(1, len(self.idx.search("Wartungsanweisung", frozenset({"medtech-team"}))))

    def test_revocation_removes_search_results(self):
        self.idx.ingest(self.doc)
        self.assertTrue(self.idx.revoke("example-1"))
        self.assertEqual([], self.idx.search("Wartungsanweisung", frozenset({"medtech-team"})))

    def test_replacement_updates_version(self):
        old_checksum = self.idx.ingest(self.doc)
        new_checksum = self.idx.ingest(replace(self.doc, version="2.0", content="Updated approved documentation."))
        self.assertNotEqual(old_checksum, new_checksum)
        self.assertEqual("2.0", self.idx.search("Updated", frozenset({"medtech-team"}))[0].document.version)


if __name__ == "__main__":
    unittest.main()
