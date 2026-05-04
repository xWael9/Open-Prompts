#!/usr/bin/env node

import { generatePrompt, refinePrompt, getAlternative } from '../src/api.js';
import { printBanner, printHelp, printTemplates, c, symbols, statusBar, spinner } from '../src/ui.js';
import readline from 'readline';
import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// ─── Config ──────────────────────────────────────────────
const CONFIG_DIR = join(homedir(), '.openprompts');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const HISTORY_FILE = join(CONFIG_DIR, 'history.jsonl');

function loadConfig() {
  try { return existsSync(CONFIG_FILE) ? JSON.parse(readFileSync(CONFIG_FILE, 'utf-8')) : {}; } catch { return {}; }
}

function saveConfig(config) {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function saveHistory(entry) {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
  appendFileSync(HISTORY_FILE, JSON.stringify({ ...entry, timestamp: Date.now() }) + '\n');
}

function loadHistory() {
  try {
    if (!existsSync(HISTORY_FILE)) return [];
    return readFileSync(HISTORY_FILE, 'utf-8').trim().split('\n').map(l => JSON.parse(l)).slice(-50);
  } catch { return []; }
}

// ─── Setup Wizard ────────────────────────────────────────
async function setupWizard() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise(r => rl.question(q, r));

  console.log(`\n${c.bold}${c.white}  Welcome to OpenPrompts Setup${c.reset}\n`);
  console.log(`  ${c.dim}Configure your AI provider to get started.${c.reset}\n`);

  console.log(`  ${c.cyan}1.${c.reset} OpenRouter ${c.green}(Recommended)${c.reset}`);
  console.log(`     ${c.dim}Access DeepSeek, Gemini, GLM & 200+ models with one key${c.reset}`);
  console.log(`     ${c.dim}Pay-per-use · Free tier available · ${c.cyan}openrouter.ai/keys${c.reset}\n`);
  console.log(`  ${c.cyan}2.${c.reset} OpenAI`);
  console.log(`  ${c.cyan}3.${c.reset} Anthropic`);
  console.log(`  ${c.cyan}4.${c.reset} Other (custom base URL)\n`);

  const choice = await ask(`  ${c.purple}${symbols.prompt}${c.reset} Select provider [1-4]: `);
  const config = loadConfig();

  if (choice === '1' || choice === '') {
    config.provider = 'openrouter';
    config.baseUrl = 'https://openrouter.ai/api/v1';
    console.log(`\n  ${c.dim}Get your key at: ${c.cyan}https://openrouter.ai/keys${c.reset}\n`);
    const key = await ask(`  ${c.purple}${symbols.prompt}${c.reset} OpenRouter API key: `);
    config.apiKey = key.trim();
  } else if (choice === '2') {
    config.provider = 'openai';
    config.baseUrl = 'https://api.openai.com/v1';
    console.log(`\n  ${c.yellow}${symbols.warning} Note: For the best experience, OpenRouter is recommended.${c.reset}`);
    console.log(`  ${c.yellow}  With OpenAI, you'll only have access to GPT models.${c.reset}\n`);
    const key = await ask(`  ${c.purple}${symbols.prompt}${c.reset} OpenAI API key: `);
    config.apiKey = key.trim();
    config.model = 'gpt-4o-mini';
  } else if (choice === '3') {
    config.provider = 'anthropic';
    config.baseUrl = 'https://api.anthropic.com/v1';
    console.log(`\n  ${c.yellow}${symbols.warning} Note: For the best experience, OpenRouter is recommended.${c.reset}`);
    console.log(`  ${c.yellow}  With Anthropic, the multi-model pipeline won't be available.${c.reset}\n`);
    const key = await ask(`  ${c.purple}${symbols.prompt}${c.reset} Anthropic API key: `);
    config.apiKey = key.trim();
    config.model = 'claude-sonnet-4-20250514';
  } else {
    config.provider = 'custom';
    const url = await ask(`  ${c.purple}${symbols.prompt}${c.reset} Base URL (OpenAI-compatible): `);
    config.baseUrl = url.trim();
    const key = await ask(`  ${c.purple}${symbols.prompt}${c.reset} API key: `);
    config.apiKey = key.trim();
    const model = await ask(`  ${c.purple}${symbols.prompt}${c.reset} Model ID: `);
    config.model = model.trim();
  }

  saveConfig(config);
  console.log(`\n  ${c.green}${symbols.check} Configuration saved to ~/.openprompts/config.json${c.reset}`);
  if (config.provider !== 'openrouter') {
    console.log(`  ${c.yellow}${symbols.warning} Multi-model pipeline (Draft→Refine→Alternative) requires OpenRouter.${c.reset}`);
  }
  console.log(`  ${c.dim}Run ${c.white}OpenPrompts${c.dim} to start generating prompts.${c.reset}\n`);
  rl.close();
  return config;
}

// ─── Stream Output ───────────────────────────────────────
async function streamToConsole(stream, label, color) {
  process.stdout.write(`\n  ${color}${symbols.arrow} ${label}${c.reset}\n\n  `);
  let full = '';
  let col = 2;
  for await (const chunk of stream) {
    for (const ch of chunk) {
      if (ch === '\n') { process.stdout.write('\n  '); col = 2; }
      else { process.stdout.write(ch); col++; }
      full += ch;
    }
  }
  process.stdout.write('\n');
  return full;
}

// ─── Interactive Mode ────────────────────────────────────
async function interactive(config) {
  printBanner();
  statusBar(config);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const apiKey = config.apiKey;

  const prompt = () => {
    rl.question(`\n  ${c.green}>${c.reset} `, async (input) => {
      input = input.trim();
      if (!input || input === 'exit' || input === 'quit' || input === '/exit') {
        console.log(`\n  ${c.dim}Goodbye!${c.reset}\n`);
        rl.close();
        return;
      }
      if (input === '/help' || input === 'help') { printHelp(); prompt(); return; }
      if (input === '/templates' || input === 'templates') { printTemplates(); prompt(); return; }
      if (input === '/history') {
        const h = loadHistory();
        if (!h.length) { console.log(`  ${c.dim}No history yet.${c.reset}`); prompt(); return; }
        console.log(`\n  ${c.bold}Recent Sessions${c.reset}\n`);
        h.slice(-10).forEach((e, i) => {
          const d = new Date(e.timestamp).toLocaleDateString();
          console.log(`  ${c.dim}${d}${c.reset}  ${e.input.slice(0, 60)}`);
        });
        prompt();
        return;
      }
      if (input === '/config' || input === '/setup') {
        rl.close();
        await setupWizard();
        return;
      }

      if (input.startsWith('/refine ')) {
        const result = await streamToConsole(refinePrompt(input.slice(8), apiKey, config), 'Refined', c.yellow);
        saveHistory({ type: 'refine', input: input.slice(8), output: result });
        prompt(); return;
      }
      if (input.startsWith('/alt ')) {
        const result = await streamToConsole(getAlternative(input.slice(5), apiKey, config), 'Alternative', c.blue);
        saveHistory({ type: 'alt', input: input.slice(5), output: result });
        prompt(); return;
      }

      // Generate
      const result = await streamToConsole(generatePrompt(input, apiKey, 'deepseek', config), 'Generated Prompt', c.green);
      saveHistory({ type: 'generate', input, output: result });

      rl.question(`\n  ${c.dim}[R]efine · [A]lt · [C]opy · Enter to continue: ${c.reset}`, async (action) => {
        action = action.trim().toLowerCase();
        if (action === 'r') {
          const refined = await streamToConsole(refinePrompt(result, apiKey, config), 'Refined', c.yellow);
          saveHistory({ type: 'refine', input: result, output: refined });
        } else if (action === 'a') {
          const alt = await streamToConsole(getAlternative(input, apiKey, config), 'Alternative', c.blue);
          saveHistory({ type: 'alt', input, output: alt });
        } else if (action === 'c') {
          try {
            const { execSync } = await import('child_process');
            execSync(process.platform === 'darwin' ? 'pbcopy' : 'xclip -selection clipboard', { input: result });
            console.log(`  ${c.green}${symbols.check} Copied to clipboard${c.reset}`);
          } catch { console.log(`  ${c.dim}Clipboard not available.${c.reset}`); }
        }
        prompt();
      });
    });
  };
  prompt();
}

// ─── Main ────────────────────────────────────────────────
const args = process.argv.slice(2);
const command = args[0];
const flags = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const k = args[i].slice(2);
    flags[k] = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
    if (flags[k] !== true) i++;
  }
}

let config = loadConfig();
const apiKey = flags.key || process.env.OPENROUTER_API_KEY || config.apiKey;
if (apiKey) config.apiKey = apiKey;

// Route
if (command === 'setup' || command === 'config') {
  await setupWizard();
} else if (['help', '-h', '--help'].includes(command)) {
  printHelp();
} else if (['version', '-v', '--version'].includes(command)) {
  console.log('openprompts v1.0.0');
} else if (['templates', 'tpl'].includes(command)) {
  printTemplates();
} else if (['history'].includes(command)) {
  const h = loadHistory();
  if (!h.length) { console.log(`  ${c.dim}No history.${c.reset}`); }
  else { h.slice(-20).forEach(e => { console.log(`  ${c.dim}${new Date(e.timestamp).toLocaleString()}${c.reset}  [${e.type}] ${e.input.slice(0, 60)}`); }); }
} else if (!config.apiKey && !['help', '-h', '--help', 'version', '-v', '--version', 'templates', 'tpl'].includes(command)) {
  // First run — setup
  config = await setupWizard();
  if (config.apiKey) await interactive(config);
} else if (command === 'generate' || command === 'gen' || command === 'g') {
  const input = args.slice(1).filter(a => !a.startsWith('--')).join(' ');
  if (!input) { console.error(`  ${c.red}Provide a description.${c.reset}`); process.exit(1); }
  const result = await streamToConsole(generatePrompt(input, config.apiKey, flags.model || 'deepseek', config), 'Generated', c.green);
  saveHistory({ type: 'generate', input, output: result });
} else if (command === 'refine' || command === 'ref') {
  const input = args.slice(1).filter(a => !a.startsWith('--')).join(' ');
  const result = await streamToConsole(refinePrompt(input, config.apiKey, config), 'Refined', c.yellow);
  saveHistory({ type: 'refine', input, output: result });
} else if (command && !command.startsWith('-')) {
  // Shorthand: treat as generate
  const input = args.filter(a => !a.startsWith('--')).join(' ');
  const result = await streamToConsole(generatePrompt(input, config.apiKey, flags.model || 'deepseek', config), 'Generated', c.green);
  saveHistory({ type: 'generate', input, output: result });
} else {
  await interactive(config);
}
