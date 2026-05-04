#!/usr/bin/env node

import { generatePrompt, refinePrompt, getAlternative } from '../src/api.js';
import { TEMPLATES, printTemplates, printHelp, printBanner, c, symbols } from '../src/ui.js';
import readline from 'readline';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const CONFIG_DIR = join(homedir(), '.openprompts');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

function loadConfig() {
  try {
    if (existsSync(CONFIG_FILE)) {
      return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch {}
  return {};
}

function saveConfig(config) {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

async function setupApiKey() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log(`
${c.bold}${c.white}Welcome to OpenPrompts!${c.reset}

${c.dim}To generate prompts, you need an API key from an AI provider.${c.reset}

${c.cyan}${symbols.star} Recommended: OpenRouter${c.reset}
  ${c.dim}OpenRouter gives you access to multiple AI models (DeepSeek, Gemini, GLM)
  through a single API key with pay-per-use pricing — no subscriptions.${c.reset}

  ${c.bold}Get your key:${c.reset} ${c.cyan}https://openrouter.ai/keys${c.reset}
  ${c.dim}Free tier available with rate limits.${c.reset}
`);

  return new Promise((resolve) => {
    rl.question(`${c.purple}${symbols.prompt}${c.reset} Paste your OpenRouter API key: `, (key) => {
      key = key.trim();
      if (!key) {
        console.log(`${c.yellow}No key provided. Set OPENROUTER_API_KEY env var later.${c.reset}`);
        rl.close();
        resolve(null);
        return;
      }
      const config = loadConfig();
      config.apiKey = key;
      saveConfig(config);
      console.log(`${c.green}${symbols.check} API key saved to ~/.openprompts/config.json${c.reset}`);
      console.log(`${c.dim}You can also set OPENROUTER_API_KEY environment variable.${c.reset}\n`);
      rl.close();
      resolve(key);
    });
  });
}

// Resolve API key: flag > env > config > prompt setup
const args = process.argv.slice(2);
const command = args[0];

const flags = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].slice(2);
    flags[key] = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
    if (flags[key] !== true) i++;
  }
}

let apiKey = flags.key || process.env.OPENROUTER_API_KEY || loadConfig().apiKey;

// If setup command, force key setup
if (command === 'setup' || command === 'config') {
  apiKey = await setupApiKey();
  if (!apiKey) process.exit(0);
  console.log(`${c.green}Setup complete! Try: ${c.white}openprompts "customer service chatbot"${c.reset}`);
  process.exit(0);
}

// If no key and not help/version/templates, prompt for setup
if (!apiKey && !['help', '-h', '--help', 'version', '-v', '--version', 'templates', 'tpl', 't'].includes(command)) {
  console.log(`${c.yellow}${symbols.arrow} No API key found.${c.reset}\n`);
  apiKey = await setupApiKey();
  if (!apiKey) process.exit(1);
}

async function streamToConsole(stream, label, color) {
  process.stdout.write(`\n${color}${symbols.arrow} ${label}${c.reset}\n\n`);
  let full = '';
  for await (const chunk of stream) {
    process.stdout.write(chunk);
    full += chunk;
  }
  process.stdout.write('\n');
  return full;
}

async function runGenerate(input) {
  if (!input) {
    console.error(`${c.red}${symbols.cross} Please provide a description${c.reset}`);
    process.exit(1);
  }
  const model = flags.model || 'deepseek';
  console.log(`${c.dim}Model: ${model === 'deepseek' ? 'DeepSeek V3' : model === 'gemini' ? 'Gemini Flash' : 'GLM-4 Plus'}${c.reset}`);
  const stream = generatePrompt(input, apiKey, model);
  return await streamToConsole(stream, 'Generated Prompt', c.green);
}

async function runRefine(input) {
  const stream = refinePrompt(input, apiKey);
  return await streamToConsole(stream, 'Refined Prompt', c.yellow);
}

async function runInteractive() {
  printBanner();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const prompt = () => {
    rl.question(`\n${c.purple}${symbols.prompt} ${c.reset}`, async (input) => {
      input = input.trim();
      if (!input || input === 'exit' || input === 'quit') {
        console.log(`${c.dim}Goodbye!${c.reset}`);
        rl.close();
        return;
      }
      if (input === 'templates') { printTemplates(); prompt(); return; }
      if (input === 'help') { printHelp(); prompt(); return; }
      if (input.startsWith('/refine ')) {
        await runRefine(input.slice(8));
        prompt();
        return;
      }
      if (input.startsWith('/alt ')) {
        const stream = getAlternative(input.slice(5), apiKey);
        await streamToConsole(stream, 'Alternative Prompt', c.blue);
        prompt();
        return;
      }

      const result = await runGenerate(input);

      rl.question(`\n${c.dim}[R]efine · [A]lternative · [C]opy · Enter to continue: ${c.reset}`, async (action) => {
        action = action.trim().toLowerCase();
        if (action === 'r') {
          await runRefine(result);
        } else if (action === 'a') {
          const stream = getAlternative(input, apiKey);
          await streamToConsole(stream, 'Alternative Prompt', c.blue);
        } else if (action === 'c') {
          try {
            const { execSync } = await import('child_process');
            const cmd = process.platform === 'darwin' ? 'pbcopy' : 'xclip -selection clipboard';
            execSync(cmd, { input: result });
            console.log(`${c.green}${symbols.check} Copied to clipboard${c.reset}`);
          } catch {
            console.log(`${c.dim}Clipboard not available in this environment.${c.reset}`);
          }
        }
        prompt();
      });
    });
  };
  prompt();
}

// Route commands
switch (command) {
  case 'generate': case 'gen': case 'g': {
    const input = args.slice(1).filter(a => !a.startsWith('--')).join(' ');
    await runGenerate(input);
    break;
  }
  case 'refine': case 'ref': case 'r': {
    const input = args.slice(1).filter(a => !a.startsWith('--')).join(' ');
    await runRefine(input);
    break;
  }
  case 'templates': case 'tpl': case 't':
    printTemplates();
    break;
  case 'interactive': case 'i':
    await runInteractive();
    break;
  case 'help': case '-h': case '--help':
    printHelp();
    break;
  case 'version': case '-v': case '--version':
    console.log('openprompts v1.0.0');
    break;
  default:
    if (command && !command.startsWith('-')) {
      const input = args.filter(a => !a.startsWith('--')).join(' ');
      await runGenerate(input);
    } else {
      await runInteractive();
    }
}
