const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 1. Gemini REST API
async function getGeminiResponse(prompt) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return "GEMINI_API_KEY kiritilmagan.";
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await response.json();
    return data.error ? "Gemini Xatosi: " + data.error.message : data.candidates[0].content.parts[0].text;
}

// 2. ChatGPT REST API
async function getChatGPTResponse(prompt) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return "OPENAI_API_KEY kiritilmagan.";

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }]
        })
    });
    const data = await response.json();
    return data.error ? "ChatGPT Xatosi: " + data.error.message : data.choices[0].message.content;
}

// 3. Claude REST API
async function getClaudeResponse(prompt) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return "ANTHROPIC_API_KEY kiritilmagan.";

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: "claude-3-5-sonnet-20240620",
            max_tokens: 300,
            messages: [{ role: "user", content: prompt }]
        })
    });
    const data = await response.json();
    return data.error ? "Claude Xatosi: " + data.error.message : data.content[0].text;
}

io.on('connection', (socket) => {
    socket.on('ask_agent', async (data) => {
        const { agentId, model, prompt } = data;
        io.emit('agent_status', { agentId, status: 'O`ylanmoqda...' });

        try {
            let responseText = "";
            if (model === 'gemini') responseText = await getGeminiResponse(prompt);
            else if (model === 'chatgpt') responseText = await getChatGPTResponse(prompt);
            else if (model === 'claude') responseText = await getClaudeResponse(prompt);

            io.emit('agent_response', { agentId, text: responseText });
        } catch (error) {
            io.emit('agent_response', { agentId, text: "Ulanishda xatolik yuz berdi." });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
