#!/usr/bin/env python3
"""Build a *small* source-backed index directly from a manufacturer's public PDF.

PDF is downloaded ONLY during the build, validated, and discarded. The public
release includes a few short extracts with page-level anchors, not the PDF or
its full text. Model-specific indications are part of every entry.

Run: python scripts/ingest_philips_pdf.py --out data/pdf_pages.json
Requires: pymupdf (pip install pymupdf)
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import urllib.request
from pathlib import Path

URL = ("https://www.documents.philips.com/assets/Addendum/20250422/"
       "0be5036d5af74ece8a8fb2c70090cd18.pdf?feed=ifu_docs_feed")
DOC_ID = "PHILIPS-IFU-ADDENDUM-453665155181-2025-02"
PART_NO = "453665155181"
MAX_BYTES = 8 * 1024 * 1024

# Page anchors, manually checked against the public four-page source.
# The script must find these ON THESE PAGES before publishing anything.
TARGETS = [
    {
        "id": "high-temperature", "pdfPage": 1,
        "anchor": r"High Ambient Temperatures",
        "title": "High ambient temperature",
        "summaryDe": "Das Addendum warnt bei den Modellen 6100/6300/6500 vor erhöhten Umgebungstemperaturen und möglichem Oberflächenkontakt.",
        "scope": "Philips 6100/6300/6500",
        "terms": ["philips", "temperatur", "hitze", "heat", "temperature", "ambient", "surface", "transport"],
    },
    {
        "id": "battery-deep-discharge", "pdfPage": 1,
        "anchor": r"exhaustive discharge",
        "title": "Battery deep discharge",
        "summaryDe": "Das Addendum weist für 6100/6300/6500 auf regelmäßiges Laden und auf nicht mehr ladbare tiefentladene Batterien hin.",
        "scope": "Philips 6100/6300/6500",
        "terms": ["philips", "batterie", "akku", "battery", "discharge", "entladung", "aufladen", "charge"],
    },
    {
        "id": "alarm-limits", "pdfPage": 2,
        "anchor": r"Viewing All Alarm Limits",
        "title": "Viewing alarm limits",
        "summaryDe": "Eine Ergänzung beschreibt die Anzeige und Druckfunktion von Alarmgrenzen für bestimmte IntelliVue-Gerätegruppen.",
        "scope": "Philips IntelliVue MX100/X3 and specified monitor families",
        "terms": ["philips", "intellivue", "alarms", "alarmgrenzen", "grenzwerte", "limits", "view", "drucken", "print"],
    },
    {
        "id": "nanopod", "pdfPage": 3,
        "anchor": r"NanoPod capnography module",
        "title": "NanoPod capnography module",
        "summaryDe": "Der NanoPod-Abschnitt erläutert den vorgesehenen Messbereich für Kohlendioxid und Atemfrequenz beim professionellen Monitoring.",
        "scope": "Philips 6100/6300/6500",
        "terms": ["philips", "nanopod", "kapnographie", "capnography", "co2", "respiration", "atemfrequenz"],
    },
    {
        "id": "co2-interference", "pdfPage": 4,
        "anchor": r"Interfering Gas and Vapor Effects",
        "title": "CO₂ measurement interference",
        "summaryDe": "Die Ergänzung enthält eine technische Spezifikation zum Einfluss störender Gase auf die CO₂-Messgenauigkeit.",
        "scope": "Philips 6100/6300/6500 with specified Microstream CO2 configuration",
        "terms": ["philips", "co2", "gase", "interference", "gas", "dampf", "accuracy", "genauigkeit", "microstream"],
    },
]


def download_pdf():
    request = urllib.request.Request(
        URL, headers={"User-Agent": "Mozilla/5.0 (compatible; MedtechEvidenceDemo/0.8)"}
    )
    try:
        with urllib.request.urlopen(request, timeout=40) as response:
            final_url = response.geturl()
            if not final_url.startswith("https://www.documents.philips.com/"):
                raise RuntimeError("Unexpected PDF redirect host: " + final_url)
            data = response.read(MAX_BYTES + 1)
    except Exception as ex:
        raise RuntimeError("Original manufacturer PDF download failed; RELEASE BLOCKED: " + str(ex))
    if len(data) > MAX_BYTES or len(data) < 1_000 or not data.startswith(b"%PDF-"):
        raise RuntimeError("PDF invalid or too large; RELEASE BLOCKED")
    return data


def excerpt_near(page_text: str, anchor: str, n_words: int = 17) -> str:
    flat = re.sub(r"\s+", " ", page_text).strip()
    match = re.search(anchor, flat, flags=re.IGNORECASE)
    if not match:
        raise RuntimeError("Required page anchor missing: " + anchor)
    # A deliberately short extract: not a full-PDF republication.
    prefix = flat[:match.start()]
    words_before = re.findall(r"\S+", prefix)[-3:]
    after = flat[match.start():]
    words_after = re.findall(r"\S+", after)[: n_words - len(words_before)]
    return " ".join(words_before + words_after)


def build(pdf_bytes: bytes):
    import fitz  # PyMuPDF

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    if len(doc) != 4:
        raise RuntimeError(f"Unexpected PDF length {len(doc)} (expected 4): RELEASE BLOCKED")
    texts = [page.get_text("text", sort=True) for page in doc]
    all_text = " ".join(texts)
    if PART_NO not in all_text or "IntelliVue" not in all_text or "2025-02" not in all_text:
        raise RuntimeError("PDF identity / edition markers absent: RELEASE BLOCKED")
    entries = []
    for spec in TARGETS:
        page = spec["pdfPage"]
        text = texts[page - 1]
        if len(text.strip()) < 100:
            raise RuntimeError(f"Page {page} appears scanned/empty; release blocked")
        entry = dict(spec)
        entry["excerpt"] = excerpt_near(text, spec["anchor"])
        del entry["anchor"]
        entries.append(entry)
    return {
        "schemaVersion": 1,
        "sourceId": DOC_ID,
        "sourceTitle": "Philips IntelliVue – Addendum to the Instructions for Use",
        "publisher": "Philips",
        "partNumber": PART_NO,
        "edition": "2025-02",
        "pageCount": len(doc),
        "pdfSha256": hashlib.sha256(pdf_bytes).hexdigest(),
        "sourceUrl": URL,
        "citationNote": "PDF pages are one-based viewer pages. The entries are short extracts plus original German summaries; source PDF not republished.",
        "entries": entries,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="data/pdf_pages.json")
    args = parser.parse_args()
    result = build(download_pdf())
    target = Path(args.out)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"PDF VERIFIED: {result['pageCount']} pages; SHA256={result['pdfSha256']}")
    for item in result["entries"]:
        print(f"PASS page {item['pdfPage']}: {item['id']} ({len(item['excerpt'].split())} snippet words)")
    print("PUBLIC INDEX: " + str(target))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1)
