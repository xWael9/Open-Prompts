const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const MODELS = {
  deepseek: 'deepseek/deepseek-chat-v3-0324',
  gemini: 'google/gemini-2.5-flash-preview',
  glm: 'thudm/glm-4-plus',
};

const MODEL_FALLBACKS = {
  'deepseek/deepseek-chat-v3-0324': ['deepseek/deepseek-chat'],
  'google/gemini-2.5-flash-preview': ['google/gemini-2.0-flash-001'],
  'thudm/glm-4-plus': ['thudm/glm-4-long'],
};

const SYSTEM_PROMPT = `You are an elite prompt engineer. Generate a highly effective, production-ready prompt from the user's description.
Principles: clear role, specific instructions, output format, constraints, examples when helpful, chain-of-thought for complex tasks.
Output the prompt directly in clean markdown. No preamble. Every word earns its place.`;

const REFINE_PROMPT = `Refine this prompt: tighten language, strengthen constraints, add edge cases, improve format. Output ONLY the refined prompt.`;

function getBaseUrl(config) {
  if (config?.provider === 'openrouter' || !config?.provider) return OPENROUTER_URL;
  return (config.baseUrl || 'https://openrouter.ai/api/v1') + '/chat/completions';
}

function getHeaders(apiKey, config) {
  const headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
  if (!config?.provider || config.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://prompt.gbe-sa.tech';
    headers['X-Title'] = 'OpenPrompts CLI';
  }
  return headers;
}

function getModelId(modelKey, config) {
  if (config?.model) return config.model; // Custom model override
  return MODELS[modelKey] || MODELS.deepseek;
}

async function* callAPI(messages, apiKey, modelKey = 'deepseek', config = {}) {
  const modelId = getModelId(modelKey, config);
  const models = (config?.provider === 'openrouter' || !config?.provider)
    ? [modelId, ...(MODEL_FALLBACKS[modelId] || [])]
    : [modelId];

  for (const model of models) {
    try {
      const res = await fetch(getBaseUrl(config), {
        method: 'POST',
        headers: getHeaders(apiKey, config),
        body: JSON.stringify({ model, messages, stream: true, max_tokens: 4096, temperature: 0.7 }),
      });
      if (!res.ok) continue;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') return;
          try {
            const delta = JSON.parse(data).choices?.[0]?.delta?.content;
            if (delta) yield delta;
          } catch {}
        }
      }
      return;
    } catch { continue; }
  }
  yield '\n[Error: All models failed. Check your API key or run: OpenPrompts setup]';
}

export async function* generatePrompt(desc, apiKey, model = 'deepseek', config) {
  yield* callAPI([{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: desc }], apiKey, model, config);
}

export async function* refinePrompt(prompt, apiKey, config) {
  yield* callAPI([{ role: 'system', content: REFINE_PROMPT }, { role: 'user', content: prompt }], apiKey, 'glm', config);
}

export async function* getAlternative(desc, apiKey, config) {
  yield* callAPI([{ role: 'system', content: SYSTEM_PROMPT + '\n\nGenerate a DIFFERENT approach.' }, { role: 'user', content: desc }], apiKey, 'gemini', config);
}
