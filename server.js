const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname, { index: 'start.html' }));

const PORT = process.env.PORT || 3000;
const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
const deploymentId = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
const realtimeDeployment = process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT || 'gpt-realtime-15';

// ──────────────────────────────────────────────────────────────
// Realtime Token Endpoint – mints an ephemeral key for WebRTC
// Uses GA protocol: /openai/v1/realtime/client_secrets
// Docs: https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/realtime-audio-webrtc
// ──────────────────────────────────────────────────────────────
app.get('/api/realtime/token', async (req, res) => {
    try {
        const baseUrl = endpoint.replace(/\/+$/, '');
        const tokenUrl = `${baseUrl}/openai/v1/realtime/client_secrets`;

        const tokenResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'api-key': azureApiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session: {
                    type: 'realtime',
                    model: realtimeDeployment,
                    instructions: 'You are the ZEEMLESS Voice Initiation Agent for SAP ERP Cutover projects.',
                    audio: {
                        output: { voice: 'alloy' }
                    }
                }
            })
        });

        if (!tokenResponse.ok) {
            const errText = await tokenResponse.text();
            console.error('Token mint error:', tokenResponse.status, errText);
            return res.status(tokenResponse.status).json({ error: errText });
        }

        const tokenData = await tokenResponse.json();

        // Return token + connection info to the client
        res.json({
            token: tokenData.value || tokenData.client_secret?.value || tokenData.client_secret,
            endpoint: baseUrl,
            deployment: realtimeDeployment,
            expiresAt: tokenData.expires_at
        });

    } catch (error) {
        console.error('Ephemeral token error:', error);
        res.status(500).json({ error: 'Failed to mint ephemeral token.' });
    }
});

// ──────────────────────────────────────────────────────────────
// Existing text chat endpoint (fallback)
// ──────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
    try {
        const { messages, context } = req.body;

        const systemPrompt = `
You are the ZEEMLESS Voice Initiation Agent. You help users set up SAP ERP Cutover projects.
Your goal is to extract project parameters through conversation.
Current Context/Data: ${JSON.stringify(context || {})}
You must always respond in JSON format with two fields:
1. "reply": Your spoken response message to the user.
2. "updates": An object containing field updates (e.g., {"ansatz": "Greenfield", "cloud": true}).

Available fields:
- ansatz (Greenfield, Brownfield, Bluefield)
- system (SAP R/3, S/4HANA, etc.)
- rules (Cutover rules)
- cloud (Boolean: Cloud migration?)
- privacy (Boolean: Data privacy relevant?)
- migration (Boolean: Complex data migration?)

Identify both EXPLICIT and IMPLICIT data points from the user.
If they say "AWS Cloud", mark cloud=true.
If they say "SAP S/4HANA", mark system="S/4HANA".
Be professional and pro-active.
        `;

        const chatMessages = [
            { role: "system", content: systemPrompt },
            ...messages
        ];

        const baseUrl = endpoint.replace(/\/+$/, '');
        const chatUrl = `${baseUrl}/openai/deployments/${deploymentId}/chat/completions?api-version=2024-06-01`;

        const chatResponse = await fetch(chatUrl, {
            method: 'POST',
            headers: {
                'api-key': azureApiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: chatMessages,
                response_format: { type: "json_object" }
            })
        });

        if (!chatResponse.ok) {
            const errText = await chatResponse.text();
            console.error('Chat API error:', chatResponse.status, errText);
            return res.status(chatResponse.status).json({ error: errText });
        }

        const result = await chatResponse.json();
        const responseContent = JSON.parse(result.choices[0].message.content);
        res.json(responseContent);

    } catch (error) {
        console.error("Azure OpenAI Error:", error);
        res.status(500).json({ error: "Failed to communicate with Azure OpenAI." });
    }
});

app.listen(PORT, () => {
    console.log(`ZEEMLESS Backend running on http://localhost:${PORT}`);
});
