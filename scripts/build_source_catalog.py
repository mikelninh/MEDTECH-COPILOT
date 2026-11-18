#!/usr/bin/env python3
"""Prepare selectable *public* PDF examples for the GitLaw-style source workspace.
Clinical demo PDF is 100% fictional. Federal law PDFs are sourced from
gesetze-im-internet.de, checked, hashed and re-used verbatim in the tested build.
A failed download or unexpected text/layout blocks publication.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
import fitz

LIMIT = 15 * 1024 * 1024
SOURCES = [
    {
        "id": "mpbetreibv",
        "group": "laws",
        "title": "MPBetreibV",
        "subtitle": "Medizinprodukte-Betreiberverordnung",
        "filename": "MPBetreibV.pdf",
        "originalUrl": "https://www.gesetze-im-internet.de/mpbetreibv_2025/MPBetreibV.pdf",
        "mustInclude": "Medizinprodukte-Betreiberverordnung",
        "questions": ["Was steht zu sicherheitstechnischen Kontrollen?", "Was gehört ins Medizinproduktebuch?"],
    },
    {
        "id": "mpdg",
        "group": "laws",
        "title": "MPDG",
        "subtitle": "Medizinprodukterecht-Durchführungsgesetz",
        "filename": "MPDG.pdf",
        "originalUrl": "https://www.gesetze-im-internet.de/mpdg/MPDG.pdf",
        "mustInclude": "Medizinprodukterecht",
        "questions": ["Was regelt das Medizinprodukterecht-Durchführungsgesetz?", "Welche Aufgaben haben die zuständigen Behörden?"],
    },
    {
        "id": "arbschg",
        "group": "laws",
        "title": "ArbSchG",
        "subtitle": "Arbeitsschutzgesetz",
        "filename": "ArbSchG.pdf",
        "originalUrl": "https://www.gesetze-im-internet.de/arbschg/ArbSchG.pdf",
        "mustInclude": "Arbeitsschutzgesetz",
        "questions": ["Was steht zur Gefährdungsbeurteilung?", "Welche Pflichten hat der Arbeitgeber?"],
    },
]

def fictional_manual():
    doc = fitz.open()
    pages = [
        ("LUMEN P200  |  FIKTIVES SERVICE-HANDBUCH",
         "Nur Schulungszwecke. Dieses Gerät und alle Angaben sind erfunden. "
         "Die LUMEN P200 ist eine fiktive Infusionspumpe für das Lernen von "
         "Dokumentationsprozessen. Medizinische Entscheidungen, Dosierungen und "
         "Alarmbehandlung dürfen nicht aus dieser Übungsunterlage abgeleitet werden. "
         "Bei ungeklärten Störungen ist das zuständige klinische Team einzubeziehen."),
        ("BATTERIE UND PRÄVENTIVE WARTUNG",
         "Im simulierten Wartungsprozess werden Sichtprüfung des Gehäuses, "
         "Zustand des Netzkabels, Batteriehistorie und Datum der letzten "
         "Inspektion dokumentiert. Eine Batteriewarnung allein beweist keinen "
         "Defekt des Akkus. Das Prüfprotokoll erhält Geräte-ID, Datum, "
         "beobachtete Meldung und verantwortliche Fachperson."),
        ("VERSCHLUSSALARM IM ÜBUNGSFALL",
         "Eine fiktive Meldung Verschlussalarm wird im Service-Ticket wörtlich "
         "aufgenommen. Sie kann unterschiedliche Ursachen haben und erlaubt "
         "keine automatische Fehlerdiagnose. Das Klinikteam verantwortet "
         "die Patientensicherheit; Medizintechnik erfasst Modell, Revision, "
         "Geräte-ID und die freigegebene Herstellerunterlage. Es werden "
         "keine Anleitungen zur Umgehung von Alarmfunktionen gegeben."),
        ("REPARATUR, PRÜFUNG UND ÜBERGABE",
         "Eine abgeschlossene Reparatur ist nicht mit einer nachgewiesenen "
         "Freigabe gleichzusetzen. In der fiktiven Dokumentation werden "
         "durchgeführte Prüfungen, Messnachweise, Softwareversionen, "
         "offene Punkte und die zuständige Freigabeperson erfasst. "
         "Die Freigabe darf nur durch autorisierte Personen und nach "
         "den geltenden Vorgaben erfolgen."),
    ]
    for i,(title,body) in enumerate(pages,1):
        page=doc.new_page(width=595,height=842)
        page.draw_rect(fitz.Rect(32,32,563,810),color=(.79,.87,.8),fill=(.97,.99,.97))
        page.draw_rect(fitz.Rect(32,32,563,78),color=(.12,.35,.24),fill=(.12,.35,.24))
        page.insert_text((47,60),"FIELDNOTES / FIKTIVES TRAININGSMATERIAL",fontsize=10,color=(.9,1,.93))
        page.insert_textbox(fitz.Rect(47,121,547,193),title,fontsize=20,color=(.14,.3,.2),fontname="helv")
        page.insert_textbox(fitz.Rect(47,218,547,610),body,fontsize=13,lineheight=1.62)
        page.insert_text((47,755),f"FIKTION – KEINE HERSTELLERANLEITUNG    |    PDF-Seite {i}",fontsize=9,color=(.42,.57,.46))
    content=doc.tobytes(garbage=4,deflate=True)
    doc.close()
    return content

def fetch_official(url):
    parsed=urlparse(url)
    if parsed.scheme!="https" or parsed.hostname!="www.gesetze-im-internet.de" or not parsed.path.endswith(".pdf"):
        raise RuntimeError("Unapproved official URL")
    req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (MEDTECH-COPILOT public source verification)"})
    with urllib.request.urlopen(req,timeout=45) as response:
        final=urlparse(response.geturl())
        if final.scheme!="https" or final.hostname!="www.gesetze-im-internet.de":
            raise RuntimeError("Unexpected PDF redirect host")
        body=response.read(LIMIT+1)
    if len(body)>LIMIT or not body.startswith(b"%PDF-"):
        raise RuntimeError("Invalid/oversized official PDF")
    return body

def validate(body,expected):
    pdf=fitz.open(stream=body,filetype="pdf")
    if not 1<=len(pdf)<=120:
        raise RuntimeError(f"Document outside 1-120 page gate: {len(pdf)}")
    text=" ".join(pdf[i].get_text("text") for i in range(min(len(pdf),15)))
    if len(text)<250 or expected.lower() not in text.lower():
        raise RuntimeError("Source title or text extraction unavailable")
    pages=len(pdf);pdf.close()
    return pages

def main():
    args=argparse.ArgumentParser()
    args.add_argument("--out-dir",default="examples")
    args.add_argument("--manifest",default="data/source_catalog.json")
    conf=args.parse_args()
    folder=Path(conf.out_dir);folder.mkdir(parents=True,exist_ok=True)
    now=datetime.now(timezone.utc).strftime("%Y-%m-%d")
    catalog={"schemaVersion":1,"retrievedAt":now,"scope":"Examples verified at build time; laws may change and are not legal advice.","sources":[]}
    examples=[{
        "id":"lumen",
        "group":"medtech",
        "title":"LUMEN P200",
        "subtitle":"Fiktives Service-Handbuch · 4 Seiten",
        "filename":"LUMEN-P200-demo.pdf",
        "originalUrl":None,
        "mustInclude":"FIKTIVES SERVICE-HANDBUCH",
        "questions":["Was steht zur Batteriehistorie?","Was gehört ins Service-Ticket?"],
        "_bytes":fictional_manual()
    }]+SOURCES
    for item in examples:
        content=item.get("_bytes") or fetch_official(item["originalUrl"])
        page_count=validate(content,item["mustInclude"])
        (folder/item["filename"]).write_bytes(content)
        record={k:v for k,v in item.items() if k not in ("mustInclude","_bytes")}
        record.update({"path":"./examples/"+item["filename"],"pages":page_count,
                       "sha256":hashlib.sha256(content).hexdigest(),
                       "sourceKind":"official-federal-law" if item["group"]=="laws" else "fictional-training"})
        catalog["sources"].append(record)
        print(f"VERIFIED {item['id']}: {page_count} pages, {len(content)} bytes; sha256={record['sha256'][:16]}")
    out=Path(conf.manifest);out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("SOURCE CATALOG "+str(out))

if __name__=="__main__":
    main()
