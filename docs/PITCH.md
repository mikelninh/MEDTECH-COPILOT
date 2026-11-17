# MEDTECH COPILOT V0.5 — Donnerstag-Demo

**Kontext:** Unabhängige, ausdrücklich fiktive Arbeitsprobe. Keine UKB-Zugehörigkeit, keine internen Unterlagen, keine reale Geräte- oder Patientenintegration. Keine klinischen oder gerätetechnischen Handlungsanweisungen.

## 30-Sekunden-Einstieg

„Stellen wir uns vor, es geht eine Störungsmeldung ein: *Eine Pumpe zeigt wiederholt einen Verschlussalarm.* Die richtige Information kann in einem Herstellerhandbuch, einer SOP oder einer älteren Version liegen. Ich habe einen Prototypen gebaut, der den Weg vom **gemeldeten Problem** zur **richtigen belegten Fundstelle** nachvollziehbar macht. Mich würde interessieren, ob Sie solche Suchprobleme im Alltag überhaupt haben.“

## 90-Sekunden-Demonstration

1. **Meldung — 15 Sekunden.** Öffne [Demo Lab](https://mikelninh.github.io/MEDTECH-COPILOT/?view=lab), Fall 01. Lies die fiktive Meldung #SIM-204 um 08:17. Nicht direkt von Alarm auf Defekt schließen.
2. **Gerät — 20 Sekunden.** Wähle Schritt 02. LUMEN P200 / DEMO-PUMP-02, freigegebene **fiktive** Lernkarte Version 2.3. Zeige die archivierte Version 1.0, die in der normalen Suche ausgeschlossen ist.
3. **Fundstelle — 25 Sekunden.** Schritt 03 zeigt eine echte, lokal durchsuchte Textpassage aus dem **fiktiven** Geräte-Dokument, mit Abschnitt und Version. Das ist BM25-Passagenretrieval, **kein LLM-RAG**.
4. **Nächster Schritt — 25 Sekunden.** Schritt 04 zeigt, was durch den Fund geklärt ist: klinisches Team beurteilt die Patientenversorgung; technische Fachpersonen nehmen Gerät und Fehlermeldung auf; keine Alarmumgehung oder eigenmächtige Freigabe.
5. **Teamfrage — 5 Sekunden.** „Wo entsteht bei Ihnen heute tatsächlich Suchaufwand?“

## Zwei alternative realistische Fälle
- **Fall 02:** Patientenmonitor zeigt nach Transport keinen SpO₂-Wert. Hier ist die Unterscheidung zwischen Beobachtung, technischen möglichen Ursachen und klinischer Beurteilung das Entscheidende.
- **Fall 03:** Gerät kommt nach einer Reparatur zurück; Prüf- und Freigabestatus ist unklar. Der Copilot weist auf die Notwendigkeit qualifizierter Prüfung und dokumentierter Freigabe hin, er kann das nicht selbst erledigen.

## Was die Demo bewusst nicht verspricht
- Kein echtes UKB-Gerät, kein Zugriff auf aktuelle Anlagen, Tickets oder Herstellerportale
- Keine echte RAG-Integration mit hochgeladenen internen PDFs, Embeddings oder LLM
- Keine Aussage über reale Zeitersparnis oder Zuverlässigkeit, bis das mit Mitarbeitern evaluiert wurde
- Keine gerätespezifische Diagnose, Reparaturanleitung oder automatische Freigabe
- Keine automatische Echtzeitprüfung der aktuellen Rechtslage; verlinkte amtliche Quellen müssen bei echtem Einsatz erneut geprüft werden

## Fragen ans Team
1. Wo finden Sie aktuell Herstellerhandbücher, SOPs und Servicehistorien?
2. Was ist häufiger: **Dokument nicht finden, falsche Version, fehlende Gerätezuordnung oder Erfahrungswissen nur im Kopf einer Person**?
3. Bei welcher alltäglichen Recherchefrage wäre die eingesparte Zeit wirklich relevant?
4. Gäbe es eine nichtvertrauliche Testfrage, an der wir den Nutzen gemeinsam messen könnten?

## Drei Maßstäbe für eine spätere Pilot-Entscheidung
- **Quelle:** Korrekte, aktuell freigegebene Fundstelle für mindestens 50 unabhängig bewertete reale Fragen, inklusive sicherer Abstention, wenn die Quelle fehlt.
- **Sicherheit:** Keine unberechtigte Offenlegung, keine riskante geräte- oder therapiebezogene Handlungsanweisung, keine autonome Gerätezulassung.
- **Nutzen:** Erfassung von Zeit bis zur Fundstelle und erfolgreichem Taskabschluss im Vergleich zum heutigen Workflow; keine erfundenen Prozentwerte.

Die aktuelle Live-Demo: https://mikelninh.github.io/MEDTECH-COPILOT/  
Quellcode und CI: https://github.com/mikelninh/MEDTECH-COPILOT
