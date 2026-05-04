export const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m', italic: '\x1b[3m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m',
  purple: '\x1b[35m', cyan: '\x1b[36m', white: '\x1b[37m', gray: '\x1b[90m',
  bgBlue: '\x1b[44m', bgPurple: '\x1b[45m', bgCyan: '\x1b[46m',
};

export const symbols = {
  arrow: '→', check: '✓', cross: '✗', bullet: '•', prompt: '❯',
  star: '★', warning: '⚠', dot: '·',
};

const BANNER = `
${c.blue}  ╔══════════════════════════════════════════════════════╗
  ║${c.reset}                                                      ${c.blue}║
  ║${c.reset}    ${c.bold}${c.cyan}█▀█ █▀█ █▀▀ █▄░█   █▀█ █▀█ █▀█ █▀▄▀█ █▀█ ▀█▀ █▀${c.reset}   ${c.blue}║
  ║${c.reset}    ${c.bold}${c.purple}█▄█ █▀▀ ██▄ █░▀█   █▀▀ █▀▄ █▄█ █░▀░█ █▀▀ ░█░ ▄█${c.reset}   ${c.blue}║
  ║${c.reset}                                                      ${c.blue}║
  ║${c.reset}    ${c.dim}AI-Powered Prompt Generator           v1.0.0${c.reset}    ${c.blue}║
  ╚══════════════════════════════════════════════════════╝${c.reset}
`;

export function printBanner() {
  console.log(BANNER);
  console.log(`  ${c.bold}Tips for getting started:${c.reset}`);
  console.log(`  ${c.dim}1.${c.reset} Describe the prompt you need in plain language.`);
  console.log(`  ${c.dim}2.${c.reset} Be specific for better results.`);
  console.log(`  ${c.dim}3.${c.reset} Use ${c.cyan}/refine${c.reset} to polish generated prompts.`);
  console.log(`  ${c.dim}4.${c.reset} ${c.cyan}/help${c.reset} for more commands.\n`);
}

export function statusBar(config) {
  const provider = config?.provider || 'openrouter';
  const model = config?.model || 'deepseek-v3';
  const providerLabel = {
    openrouter: `${c.green}OpenRouter${c.reset}`,
    openai: `${c.cyan}OpenAI${c.reset}`,
    anthropic: `${c.yellow}Anthropic${c.reset}`,
    custom: `${c.purple}Custom${c.reset}`,
  }[provider] || provider;

  console.log(`  ${c.dim}─────────────────────────────────────────────────────${c.reset}`);
  console.log(`  ${c.dim}Provider: ${providerLabel}${c.dim}     Model: ${c.white}${model}${c.reset}`);
  console.log(`  ${c.dim}─────────────────────────────────────────────────────${c.reset}\n`);
}

export function printHelp() {
  console.log(`
  ${c.bold}${c.white}OpenPrompts${c.reset} — AI Prompt Generator

  ${c.bold}Usage:${c.reset}
    ${c.green}OpenPrompts${c.reset}                    Interactive mode
    ${c.green}OpenPrompts${c.reset} <description>      Quick generate
    ${c.green}OpenPrompts${c.reset} setup               Configure API provider

  ${c.bold}Commands:${c.reset}
    ${c.cyan}generate${c.reset} <desc>     Generate prompt (alias: gen, g)
    ${c.cyan}refine${c.reset} <prompt>     Refine with GLM (alias: ref)
    ${c.cyan}templates${c.reset}           Browse templates
    ${c.cyan}history${c.reset}             View past sessions
    ${c.cyan}setup${c.reset}               Configure API provider
    ${c.cyan}help${c.reset}                Show this help

  ${c.bold}Interactive:${c.reset}
    ${c.yellow}/refine${c.reset} <text>     Refine a prompt
    ${c.yellow}/alt${c.reset} <text>        Alternative (Gemini)
    ${c.yellow}/history${c.reset}           View history
    ${c.yellow}/config${c.reset}            Reconfigure
    ${c.yellow}exit${c.reset}               Quit

  ${c.bold}Options:${c.reset}
    ${c.gray}--key${c.reset} <key>         API key override
    ${c.gray}--model${c.reset} <model>     Model: deepseek|gemini|glm

  ${c.bold}Providers:${c.reset}
    ${c.green}OpenRouter${c.reset}  ${c.dim}(recommended)${c.reset} — 200+ models, pay-per-use
    ${c.white}OpenAI${c.reset}      — GPT models only
    ${c.yellow}Anthropic${c.reset}   — Claude models only
    ${c.purple}Custom${c.reset}      — Any OpenAI-compatible API

  ${c.dim}Web: https://prompt.gbe-sa.tech${c.reset}
`);
}

export const TEMPLATES = [
  { title: 'Linux Terminal', category: 'Coding', desc: 'Simulate a linux terminal' },
  { title: 'Code Reviewer', category: 'Coding', desc: 'Review code for bugs' },
  { title: 'SQL Expert', category: 'Coding', desc: 'Write and optimize queries' },
  { title: 'English Translator', category: 'Writing', desc: 'Translate and improve text' },
  { title: 'Technical Writer', category: 'Writing', desc: 'Create documentation' },
  { title: 'Job Interviewer', category: 'Business', desc: 'Conduct mock interviews' },
  { title: 'Advertiser', category: 'Business', desc: 'Create campaigns' },
  { title: 'Motivational Coach', category: 'Education', desc: 'Goal strategies' },
  { title: 'Math Teacher', category: 'Education', desc: 'Explain concepts' },
  { title: 'Storyteller', category: 'Creative', desc: 'Engaging stories' },
  { title: 'Poet', category: 'Creative', desc: 'Evocative poetry' },
  { title: 'Stand-up Comedian', category: 'Roleplay', desc: 'Comedy routines' },
];

export function printTemplates() {
  const cats = {};
  for (const t of TEMPLATES) (cats[t.category] ??= []).push(t);
  console.log(`\n  ${c.bold}Prompt Templates${c.reset}\n`);
  for (const [cat, items] of Object.entries(cats)) {
    console.log(`  ${c.purple}${c.bold}${cat}${c.reset}`);
    for (const t of items) console.log(`    ${c.dim}${symbols.bullet}${c.reset} ${c.white}${t.title}${c.reset} ${c.dim}— ${t.desc}${c.reset}`);
    console.log();
  }
}

export function spinner(text) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  const id = setInterval(() => {
    process.stdout.write(`\r  ${c.cyan}${frames[i++ % frames.length]}${c.reset} ${text}`);
  }, 80);
  return () => { clearInterval(id); process.stdout.write('\r' + ' '.repeat(text.length + 6) + '\r'); };
}
