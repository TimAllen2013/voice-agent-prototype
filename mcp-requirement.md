# Anforderung an Dienstleister: MCP Server Umsetzung (Zeemless Projektdatenbank)

## 1. Zielsetzung
Entwicklung und Bereitstellung eines Model Context Protocol (MCP) Servers, der als sichere Schnittstelle zwischen dem LLM-basierten Voice Planungsagenten und der bestehenden ZEEMLESS Projektdatenbank fungiert. 

## 2. Funktionsumfang (Lese- und Schreibzugriff)
Der MCP Server muss den Standard-Spezifikationen folgen und LLMs Lese- sowie Schreibrechte auf projektspezifische Daten gewähren.

### Lesen (Read Operations)
* **Kunden- und Branchendaten:** Abruf von hinterlegten Kundeninformationen, Branchenstandards und Regulatorien (z.B. für Telekommunikation, SAP Cutover).
* **Blueprints und Quality Gates:** Bereitstellung von Templates, Checklisten und Phasenmodellen (z.B. Liefergegenstände, Setup-Karten, Mock-Cutover Phasen).
* **Projektstatus:** Lesen von bestehenden Projektparametern, falls es sich um eine Wiederaufnahme oder Modifikation eines bestehenden Projekts handelt.

### Schreiben (Write Operations)
* **Projektanlage:** Erstellung eines neuen Datensatzes in der Datenbank nach Abschluss des Voice-Interviews.
* **Parameter-Übergabe:** Speichern des vom Voice Agent generierten JSON-Payloads. Dies umfasst sowohl explizit abgefragte Daten (z.B. Greenfield vs. Brownfield) als auch implizit abgeleitete Daten (z.B. Cloud-Nutzung, Datenschutz-Relevanz).
* **Meilenstein-Updates:** Aktualisierung von Stati für Liefergegenstände und Quality Gates.

## 3. Technische Anforderungen
* **Protokoll:** Implementierung über Standard MCP Transport (stdio für lokale Integration oder SSE/HTTP für remote).
* **Technologie:** Bevorzugt Node.js (TypeScript) oder Python, passend zur bestehenden Zeemless Backend-Architektur.
* **Sicherheit:** 
  * Etablierung sicherer Authentifizierungs- und Autorisierungsmechanismen (z.B. API Keys, OAuth2) für den Datenbankzugriff.
  * SSL/TLS Verschlüsselung für alle Datenübertragungen.
* **Datenschutz:** Einhaltung der DSGVO-Richtlinien. Keine Speicherung sensibler Audit- oder Kundendaten in ungeschützten Logs.

## 4. Integration mit Voice Agent
Der erstellte MCP Server wird als Tool (z.B. `read_zeemless_db`, `write_zeemless_project`) an den LLM Router ("OpenAI Layer") angebunden, sodass der Agent während des Dialogs autonom Kontext abfragen und am Ende des Dialogs den Planungsentwurf persistieren kann.
