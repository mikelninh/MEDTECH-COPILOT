# MEDTECH COPILOT – simulierte Nutzerstudie

**17. November 2026 · Version 0.7 · Ergebnis: 25/28 erwartete Verhaltensweisen, 7/7 Browser-Journeys**

**Methode:** 7 *skriptbasierte, fiktive Rollen* mit je vier selbst formulierten Fragen; danach ein realer Chromium-Durchlauf durch die sichtbare App (Desktop oder Mobilgerät). Keine Menschen wurden befragt. Die unten genannten Rückmeldungen sind **Review-Hypothesen**, keine Interviews oder echten Nutzerzitate.

## Ergebnis – bitte nicht mit Produktnutzen verwechseln

| Messung | Ergebnis |
|---|---:|
| Erwartetes Systemverhalten | **25/28 (89 %)** |
| Belegte Antworten, wenn Quelle erwartet | **7/10** |
| Korrektes Nichtwissen | **13/13** |
| Sicherheit: richtige Blockierung | **5/5** |
| Ausführbare UI-Nutzerreisen | **7/7** |
| Laufzeitfehler im Browser | **0** |

**Wichtig:** 89 % bedeutet *nicht*, dass 89 % aller Arbeitsaufgaben sinnvoll gelöst wurden. Bei 13 Aufgaben war „Ich weiß es nicht“ das **korrekte** Ergebnis. Ein verlässlicher Rechercheassistent muss außerdem ausreichend viele echte Fragen beantworten können.

Vor der Korrekturrunde erfüllte das Suchsystem **20/28** Erwartungen. Fünf Abweichungen wurden im selben Durchlauf behoben, insbesondere bei klinischen Beurteilungsfragen, Alarmstummschaltung, Alarmgrenzen, Gerätefreigabe und flexibler formulierten Alarmmeldungen.

## Simulierte Rollen und Feedback-Hypothesen

| Rolle | Antwortverhalten | E2E | Plausibles Feedback aus dem Test |
|---|---:|---|---|
| Erfahrene Medizintechnikerin | 4/4 | PASS | Der Fundstellenbezug ist nützlich. Echte Anlagenhistorie fehlt vollständig. |
| Neuer Teamkollege | 4/4 | PASS | STK-Begriff und geführte Demo funktionieren; ein Vergleich zwischen STK und MTK wird bewusst nicht beantwortet. |
| Pflegekraft | 4/4 | PASS | Alarme werden verständlich eingeordnet, riskante Handlungswünsche blockiert. Reale Versorgung muss deutlich getrennt bleiben. |
| IT-/Datenschutzverantwortliche | **2/4** | PASS | Unklar, welche App-Daten gespeichert werden und was Browser-Spracherkennung mit Audio macht. |
| Medizintechnik-Teamleitung | **3/4** | PASS | Es fehlt die direkte, verifizierte Hersteller-PDF-Fundstelle; keine gemessene Zeitersparnis oder Mitarbeiterstudie. |
| Servicetechniker mit Gerätekenntnis | 4/4 | PASS | Versionen, Geräteansicht, Audio-/Brillenkonzept sind auffindbar; echtes Gerätemanagement fehlt. |
| AI-/Softwareingenieurin | 4/4 | PASS | Belege und Grenzen sind technisch prüfbar, aber die Suche ist deterministisch und kein allgemeines PDF-RAG. |

**Alle sieben Browsertests wurden mit derselben veröffentlichten Benutzeroberfläche durchgeführt.** Der Ablauf umfasst Recherche, Quellenbibliothek, Archiv, SpO₂- und Sicherheits-Demos, Gerätekontext und optionale Geräteansichten. Das beweist technische Durchführbarkeit in diesen Skripten, **nicht** spontane Verständlichkeit bei echten Nutzer:innen.

## Die drei konkreten Lücken

1. **P1 – Datenschutz-Transparenz:** Frage „Welche Daten werden in der App gespeichert?“ → derzeit **keine Antwort**. Ein leicht verständliches, überprüfbares Datenflussblatt muss auf der Startseite und in der Suche erreichbar sein. Dabei auch Hosting-Logs und Browser-Speech-Service klar abgrenzen, statt pauschal „100 % lokal“ zu versprechen.
2. **P1 – Voice-Transparenz:** Frage „Wie funktioniert SpeechRecognition und wo liegen Audiodaten?“ → derzeit **keine Antwort**. Browserabhängige Verarbeitung und explizites Opt-in erklären; vor einer Klinikeinführung keine sensiblen Sprachinhalte zulassen.
3. **P1 – Hersteller-Original:** Frage „Zeige mir die offizielle Dräger-Anleitung zum Vista 120“ → derzeit **keine passende Fundstelle**. Der zuvor hinterlegte PDF-Direktlink war live nicht erreichbar; es gibt derzeit nur einen verlinkten Hersteller-Dokumentenfinder und kurze redaktionelle Fundstellen. Ein exaktes, für Version und Modell geprüftes PDF mit zitierbaren Seiten ist noch ein Release-Kriterium.

## Weitere Beobachtungen, keine Fehlermeldungen

- Die Homepage hat drei klare Testknöpfe. Das Lab zeigt über Register nur 7, 7 oder 3 Fälle gleichzeitig; das ist übersichtlicher als ein großer Funktionskatalog.
- Die Fehlermeldungen behandeln „nicht belegbar“ oft als korrekt. Produktseitig ist das zwar sicher, aber teilweise **unbefriedigend**. Ein Assistent sollte dann auch sagen, **welche präzise Information fehlt**, um weiterzukommen (Modell, Softwareversion, Geräte-ID oder Dokumenttyp).
- Die UI-Routen funktionieren, aber ein kurzer gemeinsam moderierter Test mit **zwei echten, unvorbereiteten Personen** steht noch aus.
- Die Dräger-Summaries sind bewusst nicht der Volltext und nicht dieselbe Qualität wie herstellerverifizierte, versionsgenaue RAG-Passagen.

## Nächster sinnvoller Produkt-Schritt

**Nur eine Sache zuerst:** Eine verständliche **„Was kann der Copilot sehen – und was nicht?“**-Information, für Suche und Voice erreichbar, samt Datenfluss-Skizze und ehrlichen Aussagen zum Datenschutz. Danach Hersteller-PDF-Referenzen prüfen. Keine weitere allgemeine visuelle Überarbeitung.

## Nachweise

- [GitHub Actions – vollständiger Browser- und Simulationstest](https://github.com/mikelninh/MEDTECH-COPILOT/actions/runs/44136066205)
- [Simulationsskript und 28 Fragestellungen](../tests/simulated_users.cjs)
- CI-Artefakt `medtech-fieldnotes-v07`: `simulated_user_report.json`, `simulated_user_report.md`, 7 Persona-Screenshots
- [Strict-Audit-Report](STRICT_AUDIT.md)

Die simulierten Rollen liefern **Testabdeckung**, keine echten persönlichen Präferenzen, Zufriedenheit oder objektiv gemessene Zeiteinsparung.
