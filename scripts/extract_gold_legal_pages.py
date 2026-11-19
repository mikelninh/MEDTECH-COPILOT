#!/usr/bin/env python3
"""Turn the *exact downloaded, fingerprint-checked* law PDFs into offline
test-only text pages. No web, no generated answers, no production artifact."""
import json,sys,hashlib
from pathlib import Path
import fitz
manifest=json.loads(Path("data/source_catalog.json").read_text())
output={}
for entry in manifest["sources"]:
    if entry["group"]!="laws":continue
    name=entry["id"]
    path=Path("examples")/(entry["filename"])
    content=path.read_bytes()
    assert hashlib.sha256(content).hexdigest()==entry["sha256"], "PDF differs from signed catalogue: "+name
    doc=fitz.open(stream=content,filetype="pdf")
    assert doc.page_count==entry["pages"],"Page count drift: "+name
    output[name]=[{"number":i+1,"text":page.get_text("text",sort=False)} for i,page in enumerate(doc)]
    doc.close()
Path(sys.argv[1] if len(sys.argv)>1 else "/tmp/medtech-gold-pdf-pages.json").write_text(json.dumps(output,ensure_ascii=False))
print("LEGAL FIXTURE: verified",len(output),"official snapshot PDFs, pages",sum(map(len,output.values())))
