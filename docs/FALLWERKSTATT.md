# MEDTECH COPILOT · Fallwerkstatt

Die Fallwerkstatt führt eine Fachkraft von der ersten Beobachtung bis zur dokumentierten Übergabe. Einstieg unter **Fallwerkstatt** auf `upload.html`. Die Vorlagen decken STK und Prüffrist, Vorkommnis, Rückkehr aus der Instandhaltung und einen frei benannten Recherchefall ab.

1. **Aufnehmen.** Gerät oder Thema und beobachtete Fakten anonymisiert erfassen.
2. **Analysieren.** Eine Fallfrage starten oder frei fragen. Im MPBetreibV-Dialog beziehen sich unterstützte Rückfragen auf den vorherigen Gegenstand. Belege im Original-PDF prüfen und gezielt übernehmen. Für andere Rechtsquellen lässt sich die Recherche im selben Fall fortsetzen.
3. **Übergeben.** Fachliche Einschätzung, fehlende Nachweise, nächste Handlung und zuständige Rolle festhalten. Die Fallakte als Markdown herunterladen. Jeder übernommene Beleg enthält Quelle, PDF-Seite, Auszug und Fingerprint. Die Übergabe erfolgt durch die Fachkraft.
4. **Abschließen.** Übernahme und tatsächliches Ergebnis dokumentieren. Ein Fall kann erneut zur Analyse geöffnet werden.

Mehrere Fälle bleiben im Browserprofil verfügbar. Noch vorhandene PDF-Fassungen können aus der Akte erneut geöffnet werden. Bei einem abweichenden Fingerprint bleiben Auszug und Fingerprint erhalten. Die eingebauten PDF-Snapshots werden in CI überprüft. Die verlinkte amtliche Fassung ist für den Geltungsstand maßgebend. Eigene PDFs und Gesprächsverläufe bleiben im Tab. Falltexte und ausdrücklich gewählte öffentliche Belege liegen im lokalen Browserspeicher. Der Export dient zur Weitergabe außerhalb der Demo.

## Geführte Fallanalyse

In der Suche ist der AED-Übungsfall direkt erreichbar. AED, STK, Vorkommnis und Instandhaltung haben eigene Prüfpunkte. Der Copilot ordnet die Fallangaben anhand expliziter Eingaben und schlägt die nächste Klärung mit einer Begründung vor. Eine Angabe ohne Fundort, ein dokumentierter Nachweis und ein Widerspruch haben unterschiedliche Zustände. Unterlagen wie die Gebrauchsanweisung werden von der Fachkraft geprüft und mit einer Referenz hinterlegt.

Beim AED beeinflussen Zweckbestimmung, Selbsttest, Datum der Inbetriebnahme und Sichtprüfung die weiteren Prüfpunkte. Ein erfasster Selbsttestfehler oder ein gemeldeter schwerwiegender Verdacht wird hervorgehoben. Die dazugehörigen amtlichen Passagen werden im PDF angezeigt und anhand der ausgewählten Fassung geprüft. Fundstellen unterstützen die fachliche Entscheidung. Das Ergebnis ist ein bearbeitbarer Übergabeentwurf. Das Programm erteilt keine Freigaben und versendet keine Meldungen.

Übernommene Entwürfe behalten eigene Einträge. Neue Fallangaben oder Belege entziehen einer vorherigen Prüfung die Gültigkeit. Übernommene, überholte Felder müssen aktualisiert werden, bevor die Übergabe abgeschlossen werden kann. Die Fachkraft bestätigt die aktuelle Fassung und kann sie als lokale Akte herunterladen.

## Antworten und Prüfung

- **Dialog ohne Modell.** Für ausgewählte Fragen zu STK, AED, Instandhaltung, MTK und Medizinproduktebuch gleicht der Dialog kurze fachliche Einordnungen mit Fundstellen in der tatsächlich geöffneten amtlichen MPBetreibV-PDF ab. Die jeweilige Aussage führt zu ihrer PDF-Passage. Der dokumentgebundene Kontext wird bei Quellen- oder Fallwechsel zurückgesetzt.
- **Lokale KI.** Browser mit verfügbarer Prompt API bieten auf Wunsch eine Vertiefung zu belegten Recherchen in amtlichen PDFs. Die Generierung arbeitet mit Auszügen aus dem aktiven Dokument und dem bisherigen Fragekontext. Das Modell liefert pro Aussage ein wörtliches Zitat. Die Anwendung prüft das Zitat deterministisch. Eine neue, separate Sitzung desselben Modells liest alle Aussagen gegen ihre Passagen. Ohne erfolgreiches Gegenlesen bleibt die Fundstelle sichtbar. Die Fallnotizen und eigene PDFs gehen nicht in dieses Modell ein.
- **Quellenvergleich.** In einer Fallakte können Belege aus mehreren nacheinander bestätigten amtlichen Dokumenten zusammengeführt werden. Die Prüfung von Geltungsbereichen und historischen Fassungen liegt bei der Fachkraft.

## Abnahme für einen Pilot

Die CI prüft 15 intern geschriebene Dialogverläufe gegen die amtlichen PDF-Snapshots. Der Browsertest bearbeitet einen AED-Fall von der Aufnahme bis zum Abschluss und sammelt im Vorkommnis-Fall Belege aus zwei unterschiedlichen Verordnungen. Die Modelltests prüfen den Antwortvertrag mit einem Testmodell.

Für die externe Abnahme stellen Medizintechnik und Recht unabhängig vom Umsetzungsteam 30 unbekannte Praxisfragen und 15 unbekannte Dialoge zusammen. Je Fall bewerten sie die Angemessenheit der Abstention oder Antwort, jede wesentliche Aussage am Original, den Rechtsstand, den Geltungsbereich und die Qualität der Übergabe. Bewertungsmaßstab ist [die Qualitätsrubrik](../data/answer_quality_rubric.json). Kritische Fehler wie eine unbelegte Gerätefreigabe oder eine falsch angewandte Meldepflicht verhindern einen Pilotstart.

Im Pilot bearbeiten Fachkräfte anonymisierte Fälle jeweils mit ihrer bisherigen Recherche und mit der Fallwerkstatt. Gemessen werden Zeit bis zur **geprüften** nächsten Handlung, fehlende Pflichtangaben in der Übergabe, fachliche Korrekturen und Wiederverwendung im Arbeitsalltag. Ein Klinikpilot, die Prüfung mit einem realen Browsermodell und eine unabhängige fachliche Abnahme stehen noch aus.

### Was zur Alltagsreife noch zu messen ist

- **Tempo:** Zeit bis zur fachlich bestätigten nächsten Handlung, jeweils mit und ohne Fallwerkstatt am selben Falltyp. Messung getrennt nach Routinefall, fehlendem und widersprüchlichem Nachweis.
- **Qualität:** Eine unabhängige Fachkraft bewertet anonymisierte Übergaben auf fehlende kritische Punkte, unbelegte Schlussfolgerungen und die Klarheit der nächsten Handlung.
- **Nutzung:** Wiederholte Nutzung derselben Fachkräfte über mehrere Schichten beobachten. Die Fallakte ist derzeit an das Browserprofil gebunden, und eine Teamübergabe erfolgt über den Export.
