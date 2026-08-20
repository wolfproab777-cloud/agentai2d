const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Statik fayllarni (index.html) asosiy katalogdan o'qish
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// AI SDK-larni sozlash
const aiClients = {
    gemini: process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null,
    openai: process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null,
    claude: process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null
};

// WebSocket ulanishi
io.on('connection', (socket) => {
    console.log('Foydalanuvchi ulandi:', socket.id);

    socket.on('ask_agent', async (data) => {
        const { agentId, model, prompt } = data;
        
        io.emit('agent_status', { agentId, status: 'O`ylanmoqda...' });

        try {
            let responseText = "";
        
            if (model === 'gemini' && aiClients.gemini) {
                // gemini-1.5-flash o'rniga gemini-2.5-flash ishlatamiz
                const geminiModel = aiClients.gemini.getGenerativeModel({ model: "gemini-2.5-flash" });
                const res = await geminiModel.generateContent(prompt);
                responseText = res.response.text();
            }
            } 
            else if (model === 'chatgpt' && aiClients.openai) {
                const res = await aiClients.openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [{ role: "user", content: prompt }]
                });
                responseText = res.choices[0].message.content;
            } 
            else if (model === 'claude' && aiClients.claude) {
                const res = await aiClients.claude.messages.create({
                    model: "claude-3-5-sonnet-20240620",
                    max_tokens: 300,
                    messages: [{ role: "user", content: prompt }]
                });
                responseText = res.content[0].text;
            } 
            else {
                responseText = "API kalit kiritilmagan yoki model sozlanmagan.";
            }

            io.emit('agent_response', {
                agentId: agentId,
                text: responseText
            });

        } catch (error) {
            console.error("Xatolik:", error);
            io.emit('agent_response', {
                agentId: agentId,
                text: "Xatolik yuz berdi: AI bilan ulanishda muammo bo'ldi."
            });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
