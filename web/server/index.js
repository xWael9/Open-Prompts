import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Model fallbacks
const MODEL_FALLBACKS = {
  'deepseek/deepseek-chat-v3-0324': ['deepseek/deepseek-chat', 'deepseek/deepseek-r1-0528:free'],
  'google/gemini-2.5-flash-preview': ['google/gemini-2.0-flash-001', 'google/gemini-flash-1.5'],
  'thudm/glm-4-plus': ['thudm/glm-4-long', 'thudm/glm-z1-rumination'],
};

async function callOpenRouter(model, messages, res) {
  const models = [model, ...(MODEL_FALLBACKS[model] || [])];

  for (const currentModel of models) {
    try {
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://prompts.gbe-sa.tech',
          'X-Title': 'GBE Prompt Generator',
        },
        body: JSON.stringify({
          model: currentModel,
          messages,
          stream: true,
          max_tokens: 4096,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`Model ${currentModel} failed: ${response.status} ${errText}`);
        continue;
      }

      // Stream SSE to client
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Model-Used', currentModel);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);
      }

      res.write('data: [DONE]\n\n');
      res.end();
      return;
    } catch (err) {
      console.error(`Model ${currentModel} error:`, err.message);
      continue;
    }
  }

  // All models failed
  res.status(502).json({ error: 'All models failed. Please try again.' });
}

// Generate prompt endpoint
app.post('/api/generate', async (req, res) => {
  const { message, systemPrompt, model, history } = req.body;

  if (!message && (!history || history.length === 0)) {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (!OPENROUTER_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  if (history && history.length > 0) {
    messages.push(...history);
  }
  if (message) {
    messages.push({ role: 'user', content: message });
  }

  await callOpenRouter(model || 'deepseek/deepseek-chat-v3-0324', messages, res);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', models: Object.keys(MODEL_FALLBACKS) });
});

// Serve static frontend
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3099;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Prompt Generator API running on port ${PORT}`);
});
