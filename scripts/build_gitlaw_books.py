#!/usr/bin/env python3
"""GitLaw non-official PDF reader editions + pinned real Philips manufacturer PDF."""
import argparse,hashlib,json,re,urllib.request
from pathlib import Path
from io import BytesIO
from datetime import datetime,timezone
from xml.sax.saxutils import escape
import fitz
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from build_source_catalog import fictional_manual
LAWS=[
 ("mpbetreibv","MPBetreibV","Medizinprodukte-Betreiberverordnung","mpbetreibv_2025",["Was steht zum Medizinproduktebuch?","Was gilt für sicherheitstechnische Kontrollen?"]),
 ("mpdg","MPDG","Medizinprodukterecht-Durchführungsgesetz","mpdg",["Was ist der Zweck des MPDG?","Welche Aufgaben haben Behörden?"]),
 ("arbschg","ArbSchG","Arbeitsschutzgesetz","arbschg",["Was steht zur Gefährdungsbeurteilung?","Welche Pflichten hat der Arbeitgeber?"])
]
PHILIPS_SHA="a32a620f8374c6709961e95f8b3d6099a1fb2c5574db71fcd9f4b41cab3e656e"
PHILIPS_URL="https://www.documents.philips.com/assets/Addendum/20250422/0be5036d5af74ece8a8fb2c70090cd18.pdf?feed=ifu_docs_feed"
def sha(b):return hashlib.sha256(b).hexdigest()
def fetch_law(slug):
    if not re.fullmatch("[a-z0-9_]+",slug):raise RuntimeError("Unsafe GitLaw path")
    url="https://raw.githubusercontent.com/mikelninh/gitlaw/main/laws/"+slug+".md"
    req=urllib.request.Request(url,headers={"User-Agent":"MedtechCopilot GitLaw version snapshot"})
    with urllib.request.urlopen(req,timeout=40) as response:
        if not response.geturl().startswith("https://raw.githubusercontent.com/mikelninh/gitlaw/"):raise RuntimeError("GitLaw redirect rejected")
        raw=response.read(1024*1024+1)
    if not 1000<len(raw)<1024*1024:raise RuntimeError("GitLaw markdown invalid")
    return raw,url
def pdf_from_markdown(raw,title,subtitle):
    source=raw.decode("utf-8")
    if not source.startswith("# ") or title.lower() not in source[:370].lower():raise RuntimeError("GitLaw source title mismatch")
    font=next((p for p in ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf","/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"] if Path(p).is_file()),None)
    if not font:raise RuntimeError("Unicode font unavailable")
    pdfmetrics.registerFont(TTFont("LawBook",font))
    body=ParagraphStyle("Body",fontName="LawBook",fontSize=8.2,leading=12.1,spaceAfter=5,textColor=HexColor("#283C2F"))
    heading=ParagraphStyle("Heading",parent=body,fontSize=11.5,leading=16,spaceBefore=11,spaceAfter=7,keepWithNext=True,textColor=HexColor("#1C6342"))
    titleStyle=ParagraphStyle("Title",parent=body,fontSize=17,leading=23,spaceAfter=14)
    warning=ParagraphStyle("Notice",parent=body,fontSize=9,leading=14,spaceAfter=12,textColor=HexColor("#8D4537"))
    flow=[Paragraph(escape(subtitle),titleStyle),
          Paragraph("GITLAW-LESEFASSUNG · NICHT AMTLICH",warning),
          Paragraph("Diese PDF wird aus dem GitLaw-Gesetzesspiegel erzeugt. Die PDF-Seitenzahlen sind nicht die Seiten der amtlichen Gesetzesfassung. Die geltende Rechtslage und Änderungen sind auf gesetze-im-internet.de zu prüfen.",body),
          Spacer(1,12)]
    for line in source.splitlines():
        line=line.strip()
        if not line:flow.append(Spacer(1,3));continue
        if line.startswith("---"):continue
        level=len(line)-len(line.lstrip("#"))
        pure=re.sub(r"[*_]{2}","",line[level:].strip() if level else line)
        flow.append(Paragraph(escape(pure),heading if level else body))
    b=BytesIO()
    def footer(canvas,doc):
        canvas.setFillColor(HexColor("#739077"))
        canvas.setFont("LawBook",7.5)
        canvas.drawString(38,27,"GITLAW · NICHTAMTLICHE LESEFASSUNG")
        canvas.drawRightString(A4[0]-38,27,"PDF-SEITE "+str(doc.page))
    SimpleDocTemplate(b,pagesize=A4,leftMargin=40,rightMargin=40,topMargin=40,bottomMargin=43,
                      title=title+" – GitLaw-Lesefassung").build(flow,onFirstPage=footer,onLaterPages=footer)
    return b.getvalue()
def orion_manual():
    """Original, wholly fictional and distributable training-manual PDF."""
    book=fitz.open()
    material=[
      ("ORION M100 – FIKTIVER PATIENTENMONITOR","Dieses frei erfundene Trainingsgeraet dient nur der Demonstration von Suche und Quellenvergleich. Der Name ORION M100 bezeichnet kein reales Herstellerhandbuch. Der technische Aufnahmebogen nennt Geraetemodell, Softwarestand, Service-Ticket, Fehlerwortlaut und den uebernehmenden Fachbereich."),
      ("SPO2-SIGNAL IM UEBUNGSFALL","Meldung SpO2 kein Signal: Im simulierten Fall kann die Sensorverbindung, die Messstelle oder eine externe Stoerung als moeglicher Faktor erfasst werden. Die Dokumentation darf keine klinische Interpretation der Sauerstoffsaettigung oder Versorgungsempfehlung liefern. Das Behandlungsteam entscheidet ueber patientenbezogene Massnahmen."),
      ("EKG-SIGNALRAUSCHEN","Beim fiktiven ORION M100 wird ein verrauschtes EKG-Signal als gemeldete Beobachtung erfasst. In der technischen Aufnahme werden Elektrodenkontakt, Kabel, Bewegung und Umgebungseinfluesse als moegliche Beobachtungen aufgefuehrt, ohne eine definitive Ursache zu behaupten. Meldungen duerfen nicht als sichere Diagnose dargestellt werden."),
      ("SERVICE UND FREIGABE","Nach einer angenommenen Reparatur sind dokumentierte Sicherheitspruefungen, Versionen, offene Punkte und autorisierte Freigaben getrennt zu protokollieren. Ein abgeschlossenes Service-Ticket bedeutet nicht automatisch, dass das Geraet wieder zur Benutzung freigegeben wurde. Alle Inhalte sind rein fiktiv.")
    ]
    for n,(title,body) in enumerate(material,1):
      page=book.new_page(width=595,height=842)
      page.draw_rect(fitz.Rect(32,32,563,810),color=(.77,.85,.82),fill=(.965,.985,.973))
      page.draw_rect(fitz.Rect(32,32,563,84),color=(.1,.29,.25),fill=(.1,.29,.25))
      page.insert_text((46,61),"MEDTECH COPILOT | FIKTIVES TRAININGSMATERIAL",fontsize=11,color=(.92,1,.94))
      page.insert_textbox(fitz.Rect(45,124,545,202),title,fontsize=18)
      page.insert_textbox(fitz.Rect(46,220,545,657),body,fontsize=13,lineheight=1.55)
      page.insert_text((46,771),"NICHT REAL: TRAININGSTEXT | PDF-SEITE "+str(n),fontsize=9)
    binary=book.tobytes(garbage=4,deflate=True)
    book.close()
    return binary

def pdf_pages(raw):
    if not raw.startswith(b"%PDF-") or len(raw)>15*1024*1024:raise RuntimeError("PDF too large or invalid")
    doc=fitz.open(stream=raw,filetype="pdf");n=len(doc)
    if n<1 or n>120:raise RuntimeError("PDF page limit exceeded: "+str(n))
    if sum(len(doc[i].get_text()) for i in range(min(n,8)))<200:raise RuntimeError("PDF has no usable text")
    doc.close();return n
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--out-dir",default="examples")
    parser.add_argument("--manifest",default="data/source_catalog.json")
    args=parser.parse_args()
    folder=Path(args.out_dir);folder.mkdir(parents=True,exist_ok=True)
    catalog={"schemaVersion":1,"retrievedAt":datetime.now(timezone.utc).date().isoformat(),
             "scope":"GitLaw editions are non-official reader PDFs; always confirm legal text with official law website.","sources":[]}
    def add(id,group,title,subtitle,filename,kind,original,pdf,questions,gitlaw=None,source_sha=None):
        n=pdf_pages(pdf)
        (folder/filename).write_bytes(pdf)
        item={"id":id,"group":group,"title":title,"subtitle":subtitle,"filename":filename,
              "cover":"./covers/"+id+".svg","sourceKind":kind,"originalUrl":original,
              "questions":questions,"path":"./examples/"+filename,"pages":n,"sha256":sha(pdf)}
        if gitlaw:item["gitlawUrl"]=gitlaw;item["gitlawTextSha256"]=source_sha
        catalog["sources"].append(item)
        print("VERIFIED",id,n,"pages; sha",sha(pdf)[:15],flush=True)
    add("lumen","medtech","LUMEN P200","Fiktives Trainingshandbuch","LUMEN-P200-demo.pdf",
        "fictional-training",None,fictional_manual(),
        ["Was steht zur Batteriehistorie?","Was gehört ins Service-Ticket?"])
    add("orion","medtech","ORION M100","Fiktiver Patientenmonitor","ORION-M100-demo.pdf",
        "fictional-training",None,orion_manual(),
        ["Was steht zum SpO2-Signal?","Was gehört zum Service-Ticket?"])
    for id,title,subtitle,slug,questions in LAWS:
        raw,url=fetch_law(slug)
        pdf=pdf_from_markdown(raw,title,subtitle)
        add(id,"laws",title,subtitle+" · GitLaw-Lesefassung",title+".pdf",
            "gitlaw-reader-not-official","https://www.gesetze-im-internet.de/"+slug+"/",
            pdf,questions,url,sha(raw))
    target=Path(args.manifest);target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("PASS FIVE curated sample sources (3 GitLaw reader books, 2 fictional manuals)",flush=True)
if __name__=="__main__":main()
