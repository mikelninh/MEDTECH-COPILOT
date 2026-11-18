#!/usr/bin/env python3
"""Create entirely synthetic PDF/browser fixtures. Not for clinical use."""
import sys
from pathlib import Path
import fitz

out=Path(sys.argv[1] if len(sys.argv)>1 else "/tmp/medtech-upload-fixture.pdf")
scanned=Path(sys.argv[2] if len(sys.argv)>2 else "/tmp/medtech-upload-scanned.pdf")
doc=fitz.open()
pages=[
("DEMO MANUAL – TEST DEVICE",
 "Batterie: Bei tiefentladener Batterie kann die Stromversorgung ausfallen. Die Batterie regelmaessig laden. Bei hoher Umgebungstemperatur kann das Gehaeuse heiss werden. Reparaturen sind nur nach Freigabe durch befugte Fachpersonen vorgesehen."),
("ALARM INFORMATION",
 "Alarmgrenzen und Anzeige: Die Anzeige der Alarmgrenzen hilft bei der Ueberpruefung von Grenzwerten. Die Originaldokumentation enthaelt konkrete Informationen zum Ausdruck. Die Behandlung wird nicht durch diesen Suchassistenten festgelegt."),
("CO2 MONITORING",
 "NanoPod Kapnographie: Das NanoPod Modul erfasst Kohlendioxid CO2 und die Atemfrequenz. Stoerende Gase und Daempfe koennen die CO2 Messgenauigkeit beeinflussen. Fachpersonen muessen die Herstellerunterlage pruefen."),
("UNTRUSTED TEXT",
 "Die folgende Zeichenfolge ist nur Text im PDF und darf keine HTML-Befehle ausloesen: <img src=x onerror=window.__PDF_XSS=true>. Weiterhin ist der technische Pruefablauf zu dokumentieren.")
]
for title,body in pages:
 p=doc.new_page(width=595,height=842)
 p.insert_text((42,63),title,fontsize=20,fontname="helv")
 text_box=fitz.Rect(42,120,554,700)
 p.insert_textbox(text_box,body,fontsize=13,fontname="helv",lineheight=1.6)
 p.insert_text((42,796),"FIKTIVE TESTQUELLE — NICHT KLINISCH",fontsize=9,color=(.3,.4,.3))
doc.save(out)
doc.close()
image_doc=fitz.open()
p=image_doc.new_page(width=595,height=842)
# A page made of drawn vector shapes but without any extractable text.
p.draw_rect(fitz.Rect(80,80,520,690),color=(.2,.3,.3),fill=(.93,.93,.93))
p.draw_line((100,150),(500,150),color=(.2,.3,.3),width=5)
image_doc.save(scanned);image_doc.close()
print("SYNTHETIC FIXTURES: "+str(out)+" ; "+str(scanned))
