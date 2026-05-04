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

Principles:
1. Clear role assignment for the AI
2. Specific task instructions
3. Output format specification
4. Constraints and guardrails
5. Few-shot examples when helpful
6. Chain-of-thought guidance for complex tasks

Output the prompt directly in clean markdown. No preamble. Every word earns its place.`;

const REFINE_PROMPT = `You are a prompt quality specialist. Refine the given prompt:
1. Tighten language, remove redundancy
2. Strengthen constraints and guardrails
3. Add missing edge cases
4. Improve output format spec
5. Add chain-of-thought guidance where needed

Output ONLY the refined prompt. No commentary.`;

async function* callOpenRouter(messages, apiKey, modelKey = 'deepseek') {
  const modelId = MODELS[modelKey] || MODELS.deepseek;
  const models = [modelId, ...(MODEL_FALLBACKS[modelId] || [])];

  for (const model of models) {
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://prompt.gbe-sa.tech',
          'X-Title': 'OpenPrompts CLI',
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          max_tokens: 4096,
          temperature: 0.7,
        }),
      });

      if (!res.ok) continue;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) yield delta;
            } catch {}
          }
        }
      }
      return;
    } catch {
      continue;
    }
  }
  yield '\n[Error: All models failed. Check your API key and try again.]';
}

export async function* generatePrompt(description, apiKey, model = 'deepseek') {
  yield* callOpenRouter([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: description },
  ], apiKey, model);
}

export async function* refinePrompt(prompt, apiKey) {
  yield* callOpenRouter([
    { role: 'system', content: REFINE_PROMPT },
    { role: 'user', content: prompt },
  ], apiKey, 'glm');
}

export async function* getAlternative(description, apiKey) {
  yield* callOpenRouter([
    { role: 'system', content: SYSTEM_PROMPT + '\n\nGenerate a DIFFERENT approach. Use a contrasting style or structure.' },
    { role: 'user', content: description },
  ], apiKey, 'gemini');
}
