// Simulate ZEEMLESS Voice Agent interactions for SAP ERP Cutover

// Strict JSON data schema representation for the Data Pipeline
const projectState = {
    client: "Deutsche Telekom AG",
    industry: "Telecommunications",
    context_loaded: false,
    fields: {
        ansatz: { id: "field-ansatz", value: null, required: true, status: "yellow" },
        system: { id: "field-system", value: null, required: true, status: "gray" },
        rules:  { id: "field-rules", value: null, required: true, status: "gray" }
    },
    implicit: {
        cloud: { id: "implicit-cloud", value: null, status: "gray" },
        privacy: { id: "implicit-privacy", value: null, status: "gray" },
        migration: { id: "implicit-migration", value: null, status: "gray" }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    
    // QR Modal
    const qrBtn = document.getElementById('qrButton');
    const qrModal = document.getElementById('qrModal');
    const closeQr = document.getElementById('closeQr');

    if(qrBtn) qrBtn.addEventListener('click', () => qrModal.classList.add('open'));
    if(closeQr) closeQr.addEventListener('click', () => qrModal.classList.remove('open'));

    // Simulation of Voice Activity Animation
    const bars = document.querySelectorAll('.voice-indicator .bar');
    setInterval(() => {
        bars.forEach(bar => {
            const height = Math.floor(Math.random() * 25) + 10;
            bar.style.height = `${height}px`;
        });
    }, 100);

    const textInput = document.getElementById('textInput');
    const sendBtn = document.querySelector('.btn-send');
    const chatHistory = document.getElementById('chatHistory');
    
    let conversationStep = 0;

    // Simulate MCP fetching external context BEFORE the actual chat starts
    setTimeout(() => simulateMCPContextFetch(), 1500);

    function simulateMCPContextFetch() {
        // Pre-fill some state based on "database / news"
        projectState.context_loaded = true;
        
        const contextTag = document.querySelector('.context-tag');
        if(contextTag) contextTag.innerHTML = `<i class="fa-solid fa-database"></i> Externer MCP-Kontext für '${projectState.client}' geladen (Telco, SAP ERP, 200k+ MA)`;
        
        // Let AI speak
        addAiMessage(`Hallo! Ich habe den externen Kontext für ${projectState.client} geladen. Meinen Daten zufolge steht dort oft eine Migation von SAP R/3 auf S/4HANA an. Sollen wir direkt mit den spezifischen ERP-Parametern starten?`, ['Ja, lass uns starten', 'Worum geht es genau?']);
    }

    function addUserMessage(text) {
        const msg = document.createElement('div');
        msg.className = 'message user-message';
        msg.innerHTML = `<div class="message-content">${text}</div>`;
        chatHistory.appendChild(msg);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        if(textInput) textInput.value = '';
        
        // Disable input during AI processing
        if(textInput) textInput.disabled = true;
        const qrContainer = document.getElementById('quickReplies');
        if(qrContainer) qrContainer.innerHTML = ''; // clear chips
        
        setTimeout(() => processAiLogic(text), 1200);
    }

    function addAiMessage(text, chips = []) {
        const msg = document.createElement('div');
        msg.className = 'message ai-message';
        msg.innerHTML = `<div class="message-content">${text}</div>`;
        chatHistory.appendChild(msg);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        
        // Re-enable input
        if(textInput) {
            textInput.disabled = false;
            textInput.focus();
        }
        
        // Add chips
        const qrContainer = document.getElementById('quickReplies');
        if(qrContainer) {
            qrContainer.innerHTML = '';
            chips.forEach(c => {
                const btn = document.createElement('button');
                btn.className = 'chip';
                btn.innerText = c;
                btn.addEventListener('click', () => addUserMessage(c));
                qrContainer.appendChild(btn);
            });
        }
    }

    // Function to apply JSON state changes to the UI visually
    function updateUIState(fieldKey, valueText) {
        const fieldData = projectState.fields[fieldKey];
        fieldData.value = valueText;
        fieldData.status = "green";

        const item = document.getElementById(fieldData.id);
        if(!item) return;

        item.classList.remove('status-yellow', 'status-gray', 'active-field');
        item.classList.add('status-green');
        
        // Add Pulse Animation
        item.classList.add('pulse-green');
        setTimeout(() => item.classList.remove('pulse-green'), 500);

        item.querySelector('.field-icon').innerHTML = '<i class="fa-solid fa-check"></i>';
        
        const val = item.querySelector('.field-value');
        val.innerText = valueText;
        val.classList.remove('empty');
    }

    // Apply JSON implicit changes visually
    function updateImplicitState(fieldKey) {
        const fieldData = projectState.implicit[fieldKey];
        if (!fieldData) return;
        
        fieldData.status = "green";
        fieldData.value = true;

        const item = document.getElementById(fieldData.id);
        if(!item) return;

        item.classList.remove('status-gray');
        item.classList.add('status-green', 'pulse-green');
        
        // Add a checkmark icon to the implicit block
        item.querySelector('.field-icon').innerHTML = '<i class="fa-solid fa-check"></i>';
        
        setTimeout(() => item.classList.remove('pulse-green'), 500);
    }
    
    function setNextActiveField(fieldKey) {
        const fieldData = projectState.fields[fieldKey];
        fieldData.status = "yellow";

        const item = document.getElementById(fieldData.id);
        if(!item) return;

        item.classList.remove('status-gray');
        item.classList.add('status-yellow', 'active-field');
        item.querySelector('.field-icon').innerHTML = '<i class="fa-solid fa-circle-exclamation"></i>';
    }

    // Agent Logic Router
    function processAiLogic(userText) {
        const lowerText = userText.toLowerCase();
        
        if (conversationStep === 0) {
            addAiMessage("Super. Bevorzugt die Telekom bei dieser Migration eher den Greenfield- (Neu-Implementierung) oder den Brownfield-Ansatz (System-Konvertierung)?", ['Greenfield', 'Brownfield', 'Das wissen wir noch nicht']);
            conversationStep = 1;
        } 
        else if (conversationStep === 1) {
            let approach = lowerText.includes('green') ? 'Greenfield' : 'Brownfield';
            updateUIState('ansatz', approach);
            setNextActiveField('system');
            document.getElementById('completionBadge').innerText = '40% Erfasst';
            
            addAiMessage(`Verstanden, wir planen den ${approach}-Ansatz. Bestätigst du, dass die Migration konkret von SAP R/3 zu S/4HANA in eine Cloudumgebung stattfindet?`, ['Ja, R/3 zu S/4 in die AWS Cloud.', 'Nein, On-Premise.']);
            conversationStep = 2;
        }
        else if (conversationStep === 2) {
            updateUIState('system', 'SAP R/3 -> S/4HANA');
            setNextActiveField('rules');
            
            // Simulate the Implicit Data Extraction (Agent infers multi-parameters from one phrase)
            if (lowerText.includes('aws') || lowerText.includes('cloud')) {
                setTimeout(() => {
                    updateImplicitState('cloud');
                    updateImplicitState('privacy');
                    updateImplicitState('migration');
                }, 400); // Slight delay to make it feel like an AI "aha" moment
            }
            
            document.getElementById('completionBadge').innerText = '70% Erfasst';
            
            addAiMessage("Die Systeme sind eingeloggt. Da du die AWS Cloud erwähnt hast, habe ich im Hintergrund direkt 'Datenschutz', 'Cloud' und 'Migration' als relevant markiert! Letzte Frage: Gibt es spezielle Cutover-Sonderregeln, zum Beispiel einen Carve-Out oder Autosupplisten, die fachlich getrennt werden müssen?", ['Ja, Carve-Out', 'Ja, Autosupplisten', 'Beides']);
            conversationStep = 3;
        }
        else if (conversationStep === 3) {
            updateUIState('rules', 'Zusätzlicher Carve-Out');
            
            const badge = document.getElementById('completionBadge');
            badge.innerText = '100% Erfasst';
            badge.style.backgroundColor = '#d1fae5';
            badge.style.color = '#059669';
            badge.style.borderColor = '#10b981';
            
            // Unlock Phase 3
            const lockedItem = document.querySelector('.locked');
            if(lockedItem) {
                lockedItem.classList.remove('locked', 'status-gray');
                lockedItem.classList.add('status-green', 'pulse-green');
                lockedItem.querySelector('.field-icon').innerHTML = '<i class="fa-solid fa-check-double"></i>';
                lockedItem.querySelector('.field-value').innerText = 'Wird in Plan generiert';
                lockedItem.querySelector('.field-value').classList.remove('empty');
            }
            
            // Enable Button
            const btn = document.getElementById('generatePlanBtn');
            if(btn) btn.disabled = false;
            
            addAiMessage("Perfekt. Der Datensatz ist vollständig. Basierend darauf habe ich interne Quality Gates wie die 'Setup-Karte Obermigration' freigeschaltet. Soll ich den JSON Payload speichern und den Projektplan erzeugen?", ['Ja, Plan erzeugen']);
            conversationStep = 4;
        }
        else if (conversationStep === 4) {
            console.log("FINAL JSON PAYLOAD:", JSON.stringify(projectState, null, 2));
            addAiMessage("Der saubere JSON-Datensatz wurde über MCP_Write an die Persistenzschicht übergeben. Der Projektplan wird initialisiert. Bis zum nächsten Mal!");
            const btn = document.getElementById('generatePlanBtn');
            if(btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Erzeuge Plan...';
        }
    }

    // Event Listeners
    if(sendBtn && textInput) {
        sendBtn.addEventListener('click', () => {
            if(textInput.value.trim()) addUserMessage(textInput.value);
        });

        textInput.addEventListener('keypress', (e) => {
            if(e.key === 'Enter' && textInput.value.trim()) addUserMessage(textInput.value);
        });
    }

    // Initial Chips Action
    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            addUserMessage(e.target.innerText);
        });
    });
});
