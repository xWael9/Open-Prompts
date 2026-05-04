import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import multer from 'multer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const MODELS = {
  primary: 'deepseek/deepseek-chat-v3-0324',
  fallback: 'google/gemini-2.5-flash-preview',
  refine: 'thudm/glm-4-plus',
  cheap: 'meta-llama/llama-3.2-3b-instruct:free',
};

const MODEL_FALLBACKS = {
  'deepseek/deepseek-chat-v3-0324': ['deepseek/deepseek-chat'],
  'google/gemini-2.5-flash-preview': ['google/gemini-2.0-flash-001'],
  'thudm/glm-4-plus': ['thudm/glm-4-long'],
  'meta-llama/llama-3.2-3b-instruct:free': ['meta-llama/llama-3.1-8b-instruct:free', 'qwen/qwen3-0.6b:free'],
};

// Stream response from OpenRouter
async function streamOpenRouter(model, messages, res) {
  const models = [model, ...(MODEL_FALLBACKS[model] || [])];
  for (const m of models) {
    try {
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://prompt.gbe-sa.tech',
          'X-Title': 'OpenPrompts',
        },
        body: JSON.stringify({ model: m, messages, stream: true, max_tokens: 4096, temperature: 0.7 }),
      });
      if (!response.ok) continue;

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Model-Used', m);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    } catch { continue; }
  }
  res.status(502).json({ error: 'All models failed' });
}

// Non-streaming call for classify/translate
async function callOpenRouter(model, messages) {
  const models = [model, ...(MODEL_FALLBACKS[model] || [])];
  for (const m of models) {
    try {
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://prompt.gbe-sa.tech',
          'X-Title': 'OpenPrompts',
        },
        body: JSON.stringify({ model: m, messages, max_tokens: 1024, temperature: 0.3 }),
      });
      if (!response.ok) continue;
      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } catch { continue; }
  }
  return null;
}

// Classify prompt as simple/advanced
app.post('/api/classify', async (req, res) => {
  const { message, lang } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  const langInstruction = lang === 'ar'
    ? 'The user wrote in Arabic. Write your clarifying questions in Arabic.'
    : 'Write clarifying questions in English.';

  const result = await callOpenRouter(MODELS.cheap, [
    { role: 'system', content: `You classify user requests for an AI prompt generator.
Determine if the request is simple (clear, single-purpose) or advanced (multi-faceted, needs clarification).
${langInstruction}
Respond ONLY with valid JSON: {"type":"simple"} or {"type":"advanced","questions":["q1","q2","q3"]}
Maximum 4 questions. Keep questions concise.` },
    { role: 'user', content: message },
  ]);

  try {
    const parsed = JSON.parse(result.replace(/```json\n?|\n?```/g, '').trim());
    res.json(parsed);
  } catch {
    res.json({ type: 'simple' });
  }
});

// Translate Arabic to English
app.post('/api/translate', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text required' });

  const result = await callOpenRouter(MODELS.cheap, [
    { role: 'system', content: 'Translate the following Arabic text to English. Return ONLY the English translation, nothing else.' },
    { role: 'user', content: text },
  ]);
  res.json({ translated: result || text });
});

// File upload and text extraction
app.post('/api/upload', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file' });

  let text = '';
  const mime = file.mimetype;

  try {
    if (mime === 'application/pdf') {
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(file.buffer);
      text = data.text;
    } else if (mime.includes('word') || file.originalname.endsWith('.docx')) {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      text = result.value;
    } else if (mime.startsWith('text/') || mime === 'application/json' || file.originalname.endsWith('.md')) {
      text = file.buffer.toString('utf-8');
    } else if (mime.startsWith('image/')) {
      text = `[Image: ${file.originalname}]`;
    } else if (mime.startsWith('audio/')) {
      text = `[Audio: ${file.originalname}]`;
    } else {
      text = file.buffer.toString('utf-8');
    }
  } catch (err) {
    return res.status(500).json({ error: 'Failed to process file', detail: err.message });
  }

  res.json({ text: text.slice(0, 10000), filename: file.originalname, type: mime });
});

// Generate prompt (streaming)
app.post('/api/generate', async (req, res) => {
  const { message, systemPrompt, model, history } = req.body;
  if (!message && (!history || !history.length)) return res.status(400).json({ error: 'Message required' });
  if (!OPENROUTER_KEY) return res.status(500).json({ error: 'API key not configured' });

  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  if (history?.length) messages.push(...history);
  if (message) messages.push({ role: 'user', content: message });

  const modelId = model || MODELS.primary;
  await streamOpenRouter(modelId, messages, res);
});

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '2.0.0' }));

// Static frontend
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

const PORT = process.env.PORT || 3099;
app.listen(PORT, '127.0.0.1', () => console.log(`OpenPrompts API on port ${PORT}`));
