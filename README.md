# Open-Prompts

AI-powered prompt generator — CLI tool and web app. Generate, refine, and optimize prompts using multiple AI models.

## Features

- **Multi-model pipeline**: DeepSeek drafts, Gemini alternatives, GLM refinement
- **CLI tool**: Generate prompts from your terminal
- **Web app**: Beautiful dark UI with streaming responses
- **Prompt templates**: 18+ templates across 6 categories
- **Interactive mode**: Refine and iterate in real-time

## CLI — Quick Start

```bash
npm install -g openprompts

# First run prompts for API key setup (recommends OpenRouter)
openprompts "customer service chatbot for SaaS"

# Or set key via environment
export OPENROUTER_API_KEY=sk-or-...
openprompts generate "code reviewer for Python projects"
```

### Commands

| Command | Description |
|---------|-------------|
| `openprompts <description>` | Generate a prompt |
| `openprompts refine <prompt>` | Refine with GLM quality pass |
| `openprompts interactive` | Interactive mode with refine/alt |
| `openprompts templates` | Browse prompt templates |
| `openprompts setup` | Configure API key |

### Models

| Model | Role | When Used |
|-------|------|-----------|
| DeepSeek V3 | Primary | Prompt drafting |
| Gemini Flash | Fallback | Alternative perspectives |
| GLM-4 Plus | Refinement | Quality polish |

## Web App

Live at [prompt.gbe-sa.tech](https://prompt.gbe-sa.tech)

### Self-host

```bash
cd web
npm install
cp .env.example .env  # Add your OpenRouter key
npm run build
node server/index.js
```

## API Key

Get your OpenRouter API key at [openrouter.ai/keys](https://openrouter.ai/keys)

OpenRouter provides access to multiple AI models through a single API key with pay-per-use pricing.

## Project Structure

```
├── cli/          # npm package (openprompts)
│   ├── bin/      # CLI entry point
│   └── src/      # API client, UI, templates
├── web/          # Web application
│   ├── src/      # React frontend
│   └── server/   # Express API backend
```

## License

MIT
