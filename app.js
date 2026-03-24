// ZEEMLESS Voice Agent — SAP ERP Cutover Initiation
// Supports both Voice (WebRTC Realtime API) and Text (/api/chat) modes

// Client configuration from URL parameters
const CLIENT_MAP = {
    dt: { name: "Deutsche Telekom AG", industry: "Telecommunications", context: "Telco, SAP ERP, 200k+ MA" },
    ba: { name: "Bundesagentur für Arbeit", industry: "Public Sector", context: "Behörde, SAP HCM, 100k+ MA" }
};

function getClientFromURL() {
    const params = new URLSearchParams(window.location.search);
    const clientKey = params.get('client') || 'dt';
    return CLIENT_MAP[clientKey] || CLIENT_MAP.dt;
}

const clientInfo = getClientFromURL();
const projectState = {
    client: clientInfo.name,
    industry: clientInfo.industry,
    context_loaded: false,
    fields: {
        ansatz: { id: "field-ansatz", value: null, required: true, status: "yellow" },
        system: { id: "field-system", value: null, required: true, status: "gray" },
        rules:  { id: "field-rules", value: null, required: true, status: "gray" }
    },
    implicit: {
        cloud:     { id: "implicit-cloud", value: null, status: "gray" },
        privacy:   { id: "implicit-privacy", value: null, status: "gray" },
        migration: { id: "implicit-migration", value: null, status: "gray" }
    },
    chatHistory: [] // Track messages for /api/chat context
};

document.addEventListener('DOMContentLoaded', () => {

    // ── DOM References ──────────────────────────────────────────
    const qrBtn = document.getElementById('qrButton');
    const qrModal = document.getElementById('qrModal');
    const closeQr = document.getElementById('closeQr');
    const textInput = document.getElementById('textInput');
    const sendBtn = document.querySelector('.btn-send');
    const voiceBtn = document.querySelector('.btn-voice');
    const chatHistory = document.getElementById('chatHistory');
    const bars = document.querySelectorAll('.voice-indicator .bar');

    // ── QR Modal ────────────────────────────────────────────────
    if (qrBtn) qrBtn.addEventListener('click', () => qrModal.classList.add('open'));
    if (closeQr) closeQr.addEventListener('click', () => qrModal.classList.remove('open'));

    // ── Voice Indicator (only animate when connected) ───────────
    let voiceAnimInterval = null;
    function startVoiceAnimation() {
        if (voiceAnimInterval) return;
        voiceAnimInterval = setInterval(() => {
            bars.forEach(bar => {
                bar.style.height = `${Math.floor(Math.random() * 25) + 10}px`;
            });
        }, 100);
    }
    function stopVoiceAnimation() {
        if (voiceAnimInterval) {
            clearInterval(voiceAnimInterval);
            voiceAnimInterval = null;
        }
        bars.forEach(bar => { bar.style.height = '4px'; });
    }

    // ── Realtime API Connection ─────────────────────────────────
    let pc = null;
    let dc = null;
    let audioEl = document.createElement("audio");
    audioEl.autoplay = true;
    document.body.appendChild(audioEl);

    // ── Dynamic UI Setup ────────────────────────────────────────
    function initUI() {
        // Update client name in UI
        const clientNameEl = document.getElementById('client-name-display');
        if (clientNameEl) clientNameEl.innerText = projectState.client;

        // Update session badge
        const sessionBadge = document.querySelector('.session-badge');
        if (sessionBadge) {
            const clientKey = new URLSearchParams(window.location.search).get('client') || 'dt';
            sessionBadge.innerText = `Session: #99Z-${clientKey.toUpperCase()}`;
        }
    }

    // ── Context Loading (simulated MCP) ─────────────────────────
    function initContextFetch() {
        projectState.context_loaded = true;
        const contextTag = document.querySelector('.context-tag');
        if (contextTag) {
            contextTag.innerHTML = `<i class="fa-solid fa-database"></i> Externer MCP-Kontext für '${projectState.client}' geladen (${clientInfo.context})`;
        }

        addAiMessage(
            `Hallo! Ich bin der ZEEMLESS Voice Initiation Agent. Ich habe den externen Kontext für <strong>${projectState.client}</strong> geladen. ` +
            `Sie können mir per Text oder Sprache antworten.`,
            ["Ja, lass uns starten", "Eher allgemeine Daten zuerst"]
        );
    }

    initUI();
    setTimeout(initContextFetch, 1200);

    // ── Voice Connection ────────────────────────────────────────
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

            const tokenRes = await fetch('/api/realtime/token');
            if (!tokenRes.ok) throw new Error("Could not fetch ephemeral token");
            const data = await tokenRes.json();

            const EPHEMERAL_KEY = data.token;
            const baseUrl = data.endpoint;

            pc = new RTCPeerConnection();
            pc.ontrack = e => { audioEl.srcObject = e.streams[0]; };

            dc = pc.createDataChannel("oai-events");

            dc.onopen = () => {
                console.log("DataChannel opened!");
                dc.send(JSON.stringify({
                    type: "session.update",
                    session: {
                        instructions: `You are the ZEEMLESS Voice Initiation Agent. You help users set up SAP ERP Cutover projects.
Your goal is to extract project parameters through natural conversation.
Current Client: ${projectState.client} (${projectState.industry}).
Speak German. Be professional, concise and proactive.
Identify both EXPLICIT and IMPLICIT data points from the user.
Call the 'update_field' tool whenever you identify a parameter.
Available fields:
- ansatz (Greenfield, Brownfield, Bluefield)
- system (SAP R/3, S/4HANA, etc.)
- rules (Cutover rules like Autosupplisten, Carve-Outs)
- cloud (Boolean: Cloud migration? Set true if user mentions AWS, Azure, GCP, Cloud)
- privacy (Boolean: Data privacy relevant? Set true if DSGVO, GDPR, personenbezogene Daten mentioned)
- migration (Boolean: Complex data migration? Set true if Stammdaten, Bewegungsdaten, legacy migration mentioned)
IMPORTANT: Extract implicit data aggressively. If user says "S/4HANA in der AWS Cloud", set system="S/4HANA", cloud=true AND migration=true simultaneously.`,
                        tools: [{
                            type: "function",
                            name: "update_field",
                            description: "Updates a project field based on user input. Call this for EVERY identified parameter, including implicit ones.",
                            parameters: {
                                type: "object",
                                properties: {
                                    field_name: { type: "string", description: "The internal key: ansatz, system, rules, cloud, privacy, migration" },
                                    value: { type: "string", description: "The detected value (e.g. 'Greenfield', 'true', 'SAP S/4HANA')" }
                                },
                                required: ["field_name", "value"]
                            }
                        }],
                        tool_choice: "auto",
                        input_audio_transcription: { model: "whisper-1" }
                    }
                }));

                voiceBtn.classList.remove('pulse');
                voiceBtn.classList.add('live');
                voiceBtn.innerHTML = '<i class="fa-solid fa-microphone-slash"></i>';
                document.querySelector('.voice-status').innerText = "Live Recording...";
                startVoiceAnimation();

                dc.send(JSON.stringify({
                    type: "response.create",
                    response: {
                        instructions: `Begrüße den Nutzer freundlich zum ERP Cutover Projekt für ${projectState.client} und frage direkt nach dem geplanten Migrations-Ansatz (Greenfield, Brownfield oder Bluefield).`
                    }
                }));
            };

            dc.onmessage = handleRealtimeEvent;

            const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
            ms.getTracks().forEach(track => pc.addTrack(track, ms));

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            const sdpResponse = await fetch(`${baseUrl}/openai/v1/realtime/calls`, {
                method: "POST",
                body: offer.sdp,
                headers: {
                    "Authorization": `Bearer ${EPHEMERAL_KEY}`,
                    "Content-Type": "application/sdp"
                }
            });

            if (!sdpResponse.ok) throw new Error(`SDP failed: ${sdpResponse.status}`);
            await pc.setRemoteDescription({ type: "answer", sdp: await sdpResponse.text() });

        } catch (err) {
            console.error("Voice connection error:", err);
            addAiMessage(`Verbindung zur Realtime API fehlgeschlagen: ${err.message}. Sie können weiterhin per Text kommunizieren.`, []);
            disconnectVoice();
        }
    }

    function disconnectVoice() {
        if (pc) { pc.close(); pc = null; }
        if (dc) { dc.close(); dc = null; }
        voiceBtn.classList.remove('live', 'pulse');
        voiceBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
        document.querySelector('.voice-status').innerText = "Zuhören...";
        stopVoiceAnimation();
    }

    // ── Realtime Event Handler ──────────────────────────────────
    function handleRealtimeEvent(e) {
        const msg = JSON.parse(e.data);
        switch (msg.type) {
            case "response.audio_transcript.done":
                addAiMessage(msg.transcript, []);
                break;
            case "conversation.item.input_audio_transcription.completed":
                addUserMessage(msg.transcript, false); // false = don't send to AI (already processing)
                break;
            case "response.function_call_arguments.done":
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

    // ── Field Updates ───────────────────────────────────────────
    function applyFieldUpdate(key, value) {
        if (projectState.fields[key]) {
            updateUIState(key, value);
        } else if (projectState.implicit[key]) {
            updateImplicitState(key);
        }
        updateDynamicProgress();
    }

    function updateUIState(fieldKey, valueText) {
        const fieldData = projectState.fields[fieldKey];
        fieldData.value = valueText;
        fieldData.status = "green";

        const item = document.getElementById(fieldData.id);
        if (!item) return;

        item.classList.remove('status-yellow', 'status-gray', 'active-field');
        item.classList.add('status-green', 'pulse-green');
        setTimeout(() => item.classList.remove('pulse-green'), 500);

        item.querySelector('.field-icon').innerHTML = '<i class="fa-solid fa-check"></i>';
        const val = item.querySelector('.field-value');
        val.innerText = valueText;
        val.classList.remove('empty');
    }

    function updateImplicitState(fieldKey) {
        const fieldData = projectState.implicit[fieldKey];
        if (!fieldData) return;

        fieldData.status = "green";
        fieldData.value = true;

        const item = document.getElementById(fieldData.id);
        if (!item) return;

        item.classList.remove('status-gray');
        item.classList.add('status-green', 'pulse-green');
        item.querySelector('.field-icon').innerHTML = '<i class="fa-solid fa-check"></i>';
        setTimeout(() => item.classList.remove('pulse-green'), 500);
    }

    function setNextActiveField(fieldKey) {
        const fieldData = projectState.fields[fieldKey];
        fieldData.status = "yellow";

        const item = document.getElementById(fieldData.id);
        if (!item) return;

        item.classList.remove('status-gray');
        item.classList.add('status-yellow', 'active-field');
        item.querySelector('.field-icon').innerHTML = '<i class="fa-solid fa-circle-exclamation"></i>';
    }

    function updateDynamicProgress() {
        const totalFields = Object.keys(projectState.fields).length;
        const completedFields = Object.values(projectState.fields).filter(f => f.status === "green").length;
        const percentage = Math.round((completedFields / totalFields) * 100);

        const badge = document.getElementById('completionBadge');
        if (badge) {
            badge.innerText = `${percentage}% Erfasst`;
            if (percentage === 100) {
                badge.style.backgroundColor = '#d1fae5';
                badge.style.color = '#059669';
                badge.style.borderColor = '#10b981';

                const lockedItem = document.querySelector('.locked');
                if (lockedItem) {
                    lockedItem.classList.remove('locked', 'status-gray');
                    lockedItem.classList.add('status-green', 'pulse-green');
                    lockedItem.querySelector('.field-icon').innerHTML = '<i class="fa-solid fa-check-double"></i>';
                    lockedItem.querySelector('.field-value').innerText = 'Wird in Plan generiert';
                    lockedItem.querySelector('.field-value').classList.remove('empty');
                }

                const btn = document.getElementById('generatePlanBtn');
                if (btn) btn.disabled = false;
            }
        }

        // Auto-focus next gray field
        for (const key of Object.keys(projectState.fields)) {
            if (projectState.fields[key].status === "gray") {
                setNextActiveField(key);
                break;
            }
        }
    }

    // ── Chat Messages ───────────────────────────────────────────
    function addUserMessage(text, sendToAI = true) {
        const msg = document.createElement('div');
        msg.className = 'message user-message';
        msg.innerHTML = `<div class="message-content">${escapeHtml(text)}</div>`;
        chatHistory.appendChild(msg);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        if (textInput) textInput.value = '';

        projectState.chatHistory.push({ role: "user", content: text });

        if (sendToAI) {
            processAiLogic(text);
        }
    }

    function addAiMessage(text, chips = []) {
        const msg = document.createElement('div');
        msg.className = 'message ai-message';
        msg.innerHTML = `<div class="message-content">${text}</div>`;
        chatHistory.appendChild(msg);
        chatHistory.scrollTop = chatHistory.scrollHeight;

        if (textInput) {
            textInput.disabled = false;
            textInput.focus();
        }

        projectState.chatHistory.push({ role: "assistant", content: text });

        // Update quick-reply chips
        const qrContainer = document.getElementById('quickReplies');
        if (qrContainer) {
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

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ── AI Processing (Voice DataChannel OR Text /api/chat) ─────
    async function processAiLogic(userText) {
        // Route 1: Voice DataChannel is open → send via Realtime API
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
            return;
        }

        // Route 2: No voice → use /api/chat text fallback
        try {
            if (textInput) textInput.disabled = true;

            const context = {};
            Object.entries(projectState.fields).forEach(([k, v]) => {
                if (v.value) context[k] = v.value;
            });
            Object.entries(projectState.implicit).forEach(([k, v]) => {
                if (v.value) context[k] = v.value;
            });

            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: projectState.chatHistory,
                    context: context
                })
            });

            if (!res.ok) throw new Error(`Chat API: ${res.status}`);
            const data = await res.json();

            // Apply field updates from AI response
            if (data.updates) {
                Object.entries(data.updates).forEach(([key, value]) => {
                    applyFieldUpdate(key, String(value));
                });
            }

            // Show AI reply
            if (data.reply) {
                addAiMessage(data.reply, []);
            }

        } catch (err) {
            console.error("Chat API error:", err);
            addAiMessage("Fehler bei der Kommunikation mit der AI. Bitte versuchen Sie es erneut.", []);
        } finally {
            if (textInput) textInput.disabled = false;
        }
    }

    // ── Event Listeners ─────────────────────────────────────────
    if (voiceBtn) {
        voiceBtn.addEventListener('click', toggleVoiceConnection);
    }

    if (sendBtn && textInput) {
        sendBtn.addEventListener('click', () => {
            const text = textInput.value.trim();
            if (text) addUserMessage(text);
        });

        textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const text = textInput.value.trim();
                if (text) addUserMessage(text);
            }
        });
    }

    // Chips are handled via addAiMessage → addEventListener('click', () => addUserMessage(c))

    // ── Auto-connect voice if ?mode=voice ───────────────────────
    const urlMode = new URLSearchParams(window.location.search).get('mode');
    if (urlMode === 'voice') {
        setTimeout(() => {
            addAiMessage("Voice-Modus aktiviert. Verbinde mit Realtime API...", []);
            connectVoice();
        }, 2000);
    }
});
