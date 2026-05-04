# OpenPrompts

AI-powered prompt generator that creates production-ready prompts using multiple models.

Generate, refine, and optimize prompts for any use case — from coding assistants to creative writing personas.

## Install

```bash
npm install -g openprompts
```

## Quick Start

```bash
# Set your OpenRouter API key
export OPENROUTER_API_KEY=sk-or-...

# Generate a prompt
openprompts generate "customer service chatbot for an e-commerce store"

# Refine an existing prompt
openprompts refine "You are a helpful assistant that answers questions"

# Interactive mode
openprompts interactive

# Shorthand
openprompts "code reviewer for Python projects"
```

## Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `generate <desc>` | `gen`, `g` | Generate a prompt from description |
| `refine <prompt>` | `ref`, `r` | Refine with quality pass (GLM) |
| `templates` | `tpl`, `t` | List prompt templates |
| `interactive` | `i` | Start interactive mode |
| `help` | `-h` | Show help |

## Interactive Mode

```
❯ customer service chatbot for SaaS product
→ Generated Prompt
...
[R]efine · [A]lternative · [C]opy · Enter to continue:
```

Interactive commands:
- `/refine <text>` — Refine a prompt using GLM
- `/alt <text>` — Get alternative using Gemini
- `templates` — Browse templates
- `exit` — Quit

## Models

| Model | Role | Use Case |
|-------|------|----------|
| DeepSeek V3 | Primary | Prompt drafting |
| Gemini Flash | Fallback | Alternative perspectives |
| GLM-4 Plus | Refinement | Quality polish |

## Options

```bash
--key <key>      # OpenRouter API key (or set OPENROUTER_API_KEY)
--model <model>  # Choose: deepseek, gemini, glm
```

## Web App

Try the web version at [prompt.gbe-sa.tech](https://prompt.gbe-sa.tech)

## API Key

Get your OpenRouter API key at [openrouter.ai/keys](https://openrouter.ai/keys)

## License

MIT
