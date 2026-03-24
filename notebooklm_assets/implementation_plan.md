# ZEEMLESS Voice Agent Redesign

Redesigning the dark-mode PM Voice Agent into a bright, modern "ZEEMLESS" web app layout, transitioning the use case to complex SAP ERP migrations for clients like Deutsche Telekom.

## Proposed Changes

### UI & Branding
- **Landing Page (`start.html`)**: A new entry page simulating the main PM application. Shows a client selector (Deutsche Telekom, Bundesagentur für Arbeit) and a "Create Project" action leading to either manual input or "Voice Agent (QR / Web)".
- **Color Scheme (`style.css`)**: Shift from dark mode (`#0f172a`) to a bright, clean, corporate look with plenty of white space, subtle shadows, and a strong primary accent color matching "ZEEMLESS" aesthetics.

### Agent Logic & Data Context separation
The agent needs more context than just "Company Name". It helps significantly if the AI has context *before* asking questions.

**Data Separation model:**
1.  **Dienstleister (Internal Platform DB)**: Provides rigid taxonomy directly via initial MCP context.
    - Expected Delivery Items (Liefergegenstände)
    - Project Types (e.g., "SAP Cutover", "Cloud Migration")
    - Implementation Approaches ("Greenfield", "Brownfield")
    - Quality Gates ("Setup", "Obermigration")
2.  **External Sources (Company & Ecosystem Context)**: The MCP Server implements dynamic search tools `search_company_context(company_name)` which queries external APIs (like Crunchbase, LinkedIn, or Web Search) to find industry info, size, and existing tech stacks (e.g., "Telekom uses SAP R/3").

By feeding the agent the *External Context* right after identifying the company, the agent can actively ask: *"Da ihr in der Telekom-Branche seid, betrifft das eure SAP R/3 Systeme?"* instead of passively waiting for the user to say it.

### Phase 2: Dynamic Voice Extraction (Implicit Data)
Based on the Zeemless UI analysis, the Voice Agent's superpower is "Implicit Extraction"—filling out tedious questionnaires (like Screen 3) automatically from natural conversation.

We will simulate this by:
1.  **Updating `index.html`**: Adding a secondary visual panel or a notification area that shows background checkmarks for "Implicit Attributes" (e.g., Cloud, Privacy, Migration) being filled out dynamically.
2.  **Updating `app.js`**: Changing the dialogue. When the user says *"Wir verlagern die Stammdaten komplett in die Cloud"*, the script will visually trigger multiple successful data extractions simultaneously, proving that the user doesn't need to answer 20 individual yes/no questions.

### Code Adjustments

#### [NEW] start.html (file:///c:/Softwareprojekte/Product%20Manager/voice-agent-prototype/start.html)
- Main ZEEMLESS dashboard.

#### [MODIFY] index.html (file:///c:/Softwareprojekte/Product%20Manager/voice-agent-prototype/index.html)
- Add specific fields for ERP: "System Landscape", "Approach (Greenfield/Brownfield)", "Migration Rules", and a new "Implicit Data Checklist" (Cloud, Privacy, Data Migration).

#### [MODIFY] style.css (file:///c:/Softwareprojekte/Product%20Manager/voice-agent-prototype/style.css)
- Implement light theme and Pulse-Green animations.

#### [MODIFY] app.js (file:///c:/Softwareprojekte/Product%20Manager/voice-agent-prototype/app.js)
- Simulate the Telekom / SAP Cutover dialogue.
- Implement the "Implicit Extraction" event where one user phrase turns three background status indicators green.

#### [MODIFY] architecture.html (file:///c:/Softwareprojekte/Product%20Manager/voice-agent-prototype/architecture.html)
- Document the two-tier MCP data loading process (Internal rigid DB vs. External fluid API).
