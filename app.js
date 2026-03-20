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
    const voiceBtn = document.querySelector('.btn-voice');
    const chatHistory = document.getElementById('chatHistory');
    
    // Realtime API connection properties
    let pc = null;
    let dc = null;
    let audioEl = document.createElement("audio");
    audioEl.autoplay = true;
    document.body.appendChild(audioEl);

    // Initial State Setup
    setTimeout(() => initContextFetch(), 1500);

    function initContextFetch() {
        projectState.context_loaded = true;
        const contextTag = document.querySelector('.context-tag');
        if(contextTag) contextTag.innerHTML = `<i class="fa-solid fa-database"></i> Externer MCP-Kontext für '${projectState.client}' geladen (Telco, SAP ERP, 200k+ MA)`;
        
        // Wait for user to initiate voice
        addAiMessage(`Hallo! Ich habe den externen Kontext für ${projectState.client} geladen. Klicken Sie auf das Mikrofon, um das Voice-Interview zu starten.`, []);
    }

    async function toggleVoiceConnection() {
        if (pc) {
            disconnectVoice();
        } else {
            await connectVoice();
        }
    }

    async function connectVoice() {
        try {
            voiceBtn.classList.add('pulse');
            voiceBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

            // 1. Get Ephemeral Token from our Node Backend
            const tokenRes = await fetch('/api/realtime/token');
            if (!tokenRes.ok) throw new Error("Could not fetch ephemeral token");
            const data = await tokenRes.json();
            
            const EPHEMERAL_KEY = data.token;
            const baseUrl = data.endpoint;

            // 2. Setup RTCPeerConnection
            pc = new RTCPeerConnection();

            pc.ontrack = e => {
                audioEl.srcObject = e.streams[0];
            };

            // 3. Setup Data Channel for events / tool calling
            dc = pc.createDataChannel("oai-events");
            
            dc.onopen = () => {
                console.log("DataChannel opened!");
                // Configure instructions and tools
                const sessionUpdate = {
                    type: "session.update",
                    session: {
                        instructions: `You are the ZEEMLESS Voice Initiation Agent. You help users set up SAP ERP Cutover projects.
Your goal is to extract project parameters through conversation. 
Current Client: ${projectState.client}.
Identify both EXPLICIT and IMPLICIT data points from the user. 
Call the 'update_field' tool whenever you identify a parameter.
Available fields:
- ansatz (Greenfield, Brownfield, Bluefield)
- system (SAP R/3, S/4HANA, etc.)
- rules (Cutover rules)
- cloud (Boolean: Cloud migration?)
- privacy (Boolean: Data privacy relevant?)
- migration (Boolean: Complex data migration?)`,
                        tools: [{
                            type: "function",
                            name: "update_field",
                            description: "Updates a project field based on user input",
                            parameters: {
                                type: "object",
                                properties: {
                                    field_name: { type: "string", description: "The internal key of the field (ansatz, system, rules, cloud, privacy, migration)" },
                                    value: { type: "string", description: "The value detected (e.g. 'Greenfield', 'true', 'SAP S/4HANA')" }
                                },
                                required: ["field_name", "value"]
                            }
                        }],
                        tool_choice: "auto"
                    }
                };
                dc.send(JSON.stringify(sessionUpdate));
                
                voiceBtn.classList.remove('pulse');
                voiceBtn.classList.add('live');
                voiceBtn.innerHTML = '<i class="fa-solid fa-microphone-slash"></i>';
                document.querySelector('.voice-status').innerText = "Live Recording...";

                // Start the conversation proactively
                dc.send(JSON.stringify({
                    type: "response.create",
                    response: {
                        instructions: "Genaue Anweisung: Begrüße den Nutzer freundlich zum ERP Cutover Projekt für die Deutsche Telekom und frage direkt nach dem geplanten Migrations-Ansatz (Greenfield oder Brownfield)."
                    }
                }));
            };

            dc.onmessage = handleRealtimeEvent;

            // 4. Capture Microphone
            const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
            ms.getTracks().forEach(track => pc.addTrack(track, ms));

            // 5. Connect to Azure OpenAI Realtime Endpoint via WebRTC SDP Offer/Answer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            // Using api-version=2025-04-01-preview for WebRTC SDP endpoint on Azure
            const sdpResponse = await fetch(`${baseUrl}/openai/v1/realtime?api-version=2025-04-01-preview&deployment=${data.deployment}`, {
                method: "POST",
                body: offer.sdp,
                headers: {
                    "Authorization": `Bearer ${EPHEMERAL_KEY}`, // Using token we got from backend
                    "Content-Type": "application/sdp"
                }
            });

            if (!sdpResponse.ok) throw new Error("SDP Answer fetch failed");
            
            const answerSdp = await sdpResponse.text();
            await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

        } catch (err) {
            console.error(err);
            addAiMessage("Verbindung zur Realtime API fehlgeschlagen. Prüfe Logs.", []);
            disconnectVoice();
        }
    }

    function disconnectVoice() {
        if (pc) {
            pc.close();
            pc = null;
        }
        if (dc) {
            dc.close();
            dc = null;
        }
        voiceBtn.classList.remove('live', 'pulse');
        voiceBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
        document.querySelector('.voice-status').innerText = "Zuhören...";
    }

    function handleRealtimeEvent(e) {
        const msg = JSON.parse(e.data);
        
        switch (msg.type) {
            case "response.audio_transcript.done":
                // AI finished speaking
                addAiMessage(msg.transcript, []);
                break;
            case "conversation.item.input_audio_transcription.completed":
                // Display what the user just said
                addUserMessage(msg.transcript);
                break;
            case "response.function_call_arguments.done":
                // AI called our tool
                if (msg.name === "update_field") {
                    try {
                        const args = JSON.parse(msg.arguments);
                        applyFieldUpdate(args.field_name, args.value);
                    } catch (err) {
                        console.error("Failed to parse function args:", err);
                    }
                }
                break;
        }
    }

    function applyFieldUpdate(key, value) {
        if (projectState.fields[key]) {
            updateUIState(key, value);
        } else if (projectState.implicit[key]) {
            updateImplicitState(key);
        }
        updateDynamicProgress();
    }

    // Bind voice button
    if(voiceBtn) {
        voiceBtn.addEventListener('click', toggleVoiceConnection);
    }

    function addUserMessage(text) {
        const msg = document.createElement('div');
        msg.className = 'message user-message';
        msg.innerHTML = `<div class="message-content">${text}</div>`;
        chatHistory.appendChild(msg);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        if(textInput) textInput.value = '';
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

    async function processAiLogic(userText) {
        // Fallback for text input -> Send to DataChannel as user text item
        if (dc && dc.readyState === "open") {
             dc.send(JSON.stringify({
                type: "conversation.item.create",
                item: {
                    type: "message",
                    role: "user",
                    content: [{ type: "input_text", text: userText }]
                }
            }));
            dc.send(JSON.stringify({ type: "response.create" }));
        } else {
             addAiMessage("Bitte aktivieren Sie zuerst das Mikrofon für Echtzeit-Kommunikation.", []);
        }
    }

    function updateDynamicProgress() {
        // Calculate completion
        let totalFields = Object.keys(projectState.fields).length;
        let completedFields = Object.values(projectState.fields).filter(f => f.status === "green").length;
        let percentage = Math.round((completedFields / totalFields) * 100);
        
        const badge = document.getElementById('completionBadge');
        if (badge) {
            badge.innerText = `${percentage}% Erfasst`;
            if (percentage === 100) {
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
            }
        }

        // Auto-focus next yellow field if not all are green
        Object.keys(projectState.fields).forEach(key => {
            if (projectState.fields[key].status === "gray") {
                // Find first gray and make it yellow
                setNextActiveField(key);
                return; 
            }
        });
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
