# MEDTECH COPILOT — Strict Audit

**Stand:** 17. November 2026 · **Version:** FIELDNOTES v0.7  
**Prüfurteil:** **GO für eine ausdrücklich nichtklinische öffentliche Konzeptdemo. NO-GO für tatsächliche Geräteentscheidungen oder Krankenhausbetrieb.**

## Verifizierter CI-Lauf

- **142 / 142** adversariale, quellengestützte und strukturelle Checks bestanden.
- **33 / 33** bestehende Assistenten-Regressionsfragen bestanden.
- **Desktop- und mobile Chromium-E2E-Journeys bestanden**, inklusive Herstellerquelle, Versionsanzeige, Quellenlink, fehlender Daten, Sicherheitsablehnung, Geräteprofil, Demo-Fallgruppen und mobil nutzbarer Oberfläche.
- **17 interaktive Fälle**: 7 Herstellerreferenz, 7 fiktive Betriebsabläufe, 3 Grenzfälle.

**Prüfprotokoll:** https://github.com/mikelninh/MEDTECH-COPILOT/actions/runs/44125037861  
**Testcode:** [Strict Audit](../tests/strict_audit.cjs) · [Browser Smoke](../tests/browser_smoke.cjs)  
Im erfolgreichen CI-Lauf werden `strict_audit.json`, `strict_audit.md` und Screenshots als Artefakte gespeichert.

## Was der strengere Audit aufgedeckt hat

Der erste adversariale Stichprobensatz bestand zunächst **29 von 50** Erwartungen. Die Tests deckten unter anderem auf:

1. **Verwechselte Dräger-SpO₂-Alarmtypen**: «Kein Sensor» vs. «Sensor ab» und «Komm. Fehler». Jetzt wird nur ein exakt identifizierter Alarmabschnitt zur angegebenen Gerätefamilie herangezogen.
2. **Falsche Gerätekontexte**: Vista 120, Vista 120 SC und Vista 300 sowie abweichende Softwarestände müssen getrennt bleiben. Die Demo gibt bei fehlender Zuordnung keine Herstelleranweisung aus.
3. **Riskante Umformulierungen**: Verschiedene Alarm-Unterdrückungsfragen wurden nicht erkannt. Zusätzliche Sicherheitsregeln und Gegenbeispiele sind jetzt Teil der Regressionstests.
4. **Unbelegte Betriebsdaten**: Konkrete STK-Fristen, Softwarestände, Seriennummern oder lokale Wartungshistorien werden nicht aus allgemeinen SOPs abgeleitet.
5. **Quellenkontrolle**: Archivierte Dokumente, doppelte IDs, unzulässige URL-Schemata und Lookalike-Domains werden getestet.

Die aktuelle bestandene Suite bestätigt **nur diese konkret geprüften Fälle**, nicht allgemeine Fehlersicherheit.

## Besonderer Quellenbefund: Dräger

Die öffentlich indexierte deutschsprachige Gebrauchsanweisung **Vista 120/Vista 120S SW 3.n**, Druckseiten **82–83**, stützt sieben kurze, **selbst formulierte** Alarm-Zusammenfassungen.

**Wichtiger Befund:** Der zuvor angegebene direkte deutsche Dräger-PDF-Link lieferte beim erneuten Live-Abruf **404**. Deshalb verlinkt die App nun auf die offizielle [Dräger-Dokumentensuche](https://www.draeger.com/ifu), nicht auf ein nicht erreichbar bestätigtes PDF. Modell, Revision und Originaldokument müssen dort für eine echte Anwendung neu geprüft werden. Der PDF-Volltext wurde nicht als Dokument-RAG importiert.

## Was die Prüfung ausdrücklich nicht beweist

- Kein echter LLM-RAG-Stack: derzeit lokale, lexikalische Passagensuche plus exakte Alarm-Zuordnung.
- Keine unabhängige klinische Fachprüfung der Formulierungen, kein nachgewiesener Zeitgewinn und keine Blindstudie mit Medizintechnik-Mitarbeitenden.
- Keine Integration in Geräte-, Service-, Patientendaten- oder Rechteverwaltung des UKB.
- Keine Sicherheitsfreigabe, keine medizinische Diagnose, keine Reparatur- oder Therapieanweisung.
- Keyword-/Regel-basierte Grenzerkennung kann bei bisher nicht geprüften Formulierungen scheitern.
- Browser-E2E-Tests beweisen Interaktionsfunktion, nicht ausreichende Barrierefreiheit, Datenschutzfreigabe oder klinische Eignung.
- Die technische Erreichbarkeit externer Dokumente kann sich ändern.

## Nächste zwingende Gates vor einem begrenzten internen Piloten

1. **Information Governance:** ausdrückliche Freigabe von Klinik-IT, Datenschutz, zuständiger Medizintechnik und Dokumenteigentümern; Zugriffsbeschränkungen und Revisionsprüfung.
2. **Echte Dokumentenbasis:** freigegebene Originale mit Seiten-/Abschnittsreferenzen, Versionsständen und automatischem Widerruf; keine Veröffentlichung interner PDFs.
3. **Unabhängiger Expertentest:** mindestens 100 vorher ungesehene, von Fachpersonen bewertete Fragen einschließlich gefährlicher, unklarer und unbeantwortbarer Fälle; relevante Fehlversuche müssen nachvollziehbar und reproduzierbar beseitigt werden.
4. **Bediener-Test:** Sucheffizienz gegen heutigen Prozess, Fehlerrate, Verständlichkeit und sichere Eskalation mit realistischen Abläufen messen.
5. **Security & Betrieb:** Authentifizierung, dokumentbezogene ACL, Audit-Logs, Informationsklassifizierung, Angriffstests, Ausfallszenarien und verlässliche Abschaltung.

**Release-Regel im Repository:** Die öffentliche GitHub-Pages-Pipeline publiziert künftig erst nach erfolgreich abgeschlossener Qualitäts-Pipeline auf `main` und verwendet den geprüften Commit.

**Kurzurteil:** Ein nachvollziehbar getesteter Konzeptbeweis. **Keine produktionsreife Krankenhaussoftware.**
