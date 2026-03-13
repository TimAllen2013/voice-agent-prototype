# Voice Agent Prototype: Zeemless Labs Redesign & ERP Cutover Use Case

This document tracks the tasks required to adapt the initial project configurator prototype into a "Zeemless Labs" (greybee) branded application, focusing on complex enterprise scenarios like SAP ERP carve-outs.

- [x] **Planning & Architecture**
  - [x] Define the logic: Internal static DB lists vs. External dynamic API sources.
  - [x] Draft a revised System Prompt that instructs the LLM on handling ERP, Greenfield/Brownfield, and Migration rules.
- [x] **UI Redesign (Zeemless Labs)**
  - [x] Create a light/bright design according to the "Zeemless Labs" brand identity.
  - [x] Design a new Landing Page (Entry Point) where users select clients (e.g., Deutsche Telekom, Bundesagentur für Arbeit) and choose to create a project manually or via Voice Agent.
- [x] **Voice Agent Interface Updates**
  - [x] Update `index.html` UI structure to support complex parameters (ERP Systems, Greenfield/Brownfield, Migration Coverage).
  - [x] Add visual states showing status of fulfillment (e.g., "Ready to generate plan", "Further questions").
- [x] **Logic Simulation Updates**
  - [x] Adapt `app.js` to simulate the SAP SAP R/3 to S/4HANA cutover dialogue.
- [x] **Documentation Updates**
  - [x] Update `architecture.html` to separate internal database lookups vs. external company context sources.
  - [x] Update `openai-api-specs.html` mit den technischen Schnittstellen, Security und Function Calling.
- [x] **UX & UI Data Pipeline Analysis**
  - [x] Analyze provided Zeemless UI screens (Dashboard, Formulare, Fragen) to derive Voice Agent Data Collection optimizations.
- [x] **Dynamic Voice Extraction Flow**
  - [x] Integrate "Implicit Data Checklist" UI in `index.html` and resolve styling.
  - [x] Implement simulation logic in `app.js` to demonstrate multiple fields filling from one utterance.
  - [x] Update `architecture.html` to reflect implicit vs explicit extraction paths.
- [x] **Project Setup & Knowledge Base**
  - [x] Initialize Git repository for the Voice Agent Prototype project.
  - [x] Add new `mcp-requirement.md` outlining the API access specifications for Zeemless project database.
  - [x] Create NotebookLM project "ZEEMLESS Voice Agent Prototype" and add all relevant project documents.
- [ ] **NotebookLM Artefakte Generierung**
  - [x] Management Summary erstellen
  - [x] Infografik (Schaubild) erstellen
  - [x] Slide Deck / Präsentation generieren lassen (Generierung läuft im Hintergrund)
  - [x] Videoübersicht generieren lassen (Generierung läuft im Hintergrund)
  - [x] Report für MCP Dienstleister erstellen
- [x] Überprüfung des Hauptverzeichnisses `c:\Softwareprojekte` auf uncommittete Änderungen und ggf. einchecken. (Änderungen in 'Lora erstellen' wurden committet)
- [x] Screenshots von Zeemless GUI (Limitation: Lokale Bilder können via MCP aktuell nicht zu NotebookLM hochgeladen werden, dies muss vom Nutzer manuell per Drag & Drop im Projektfenster erledigt werden).
