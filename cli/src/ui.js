// ANSI color codes
export const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  purple: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

export const symbols = {
  arrow: '→',
  check: '✓',
  cross: '✗',
  bullet: '•',
  prompt: '❯',
  star: '★',
};

export const TEMPLATES = [
  { title: 'Linux Terminal', category: 'Coding', desc: 'Simulate a linux terminal' },
  { title: 'Code Reviewer', category: 'Coding', desc: 'Review code for bugs and improvements' },
  { title: 'SQL Expert', category: 'Coding', desc: 'Write and optimize SQL queries' },
  { title: 'API Designer', category: 'Coding', desc: 'Design RESTful API endpoints' },
  { title: 'English Translator', category: 'Writing', desc: 'Translate and improve text' },
  { title: 'Screenwriter', category: 'Writing', desc: 'Write engaging scripts' },
  { title: 'Technical Writer', category: 'Writing', desc: 'Create documentation' },
  { title: 'Copy Editor', category: 'Writing', desc: 'Edit for clarity and style' },
  { title: 'Job Interviewer', category: 'Business', desc: 'Conduct mock interviews' },
  { title: 'Advertiser', category: 'Business', desc: 'Create marketing campaigns' },
  { title: 'Business Analyst', category: 'Business', desc: 'Analyze business problems' },
  { title: 'Motivational Coach', category: 'Education', desc: 'Goal-setting strategies' },
  { title: 'Math Teacher', category: 'Education', desc: 'Explain math concepts' },
  { title: 'Philosophy Teacher', category: 'Education', desc: 'Discuss philosophical ideas' },
  { title: 'Storyteller', category: 'Creative', desc: 'Create engaging stories' },
  { title: 'Poet', category: 'Creative', desc: 'Write evocative poetry' },
  { title: 'Stand-up Comedian', category: 'Roleplay', desc: 'Create comedy routines' },
  { title: 'Travel Guide', category: 'Creative', desc: 'Suggest travel destinations' },
];

export function printBanner() {
  console.log(`
${c.purple}${c.bold}  ╔═══════════════════════════════════╗
  ║       ${c.white}OpenPrompts${c.purple}  v1.0.0        ║
  ║   ${c.dim}AI-Powered Prompt Generator${c.purple}${c.bold}     ║
  ╚═══════════════════════════════════╝${c.reset}

  ${c.dim}Models: ${c.green}DeepSeek${c.dim} · ${c.cyan}Gemini${c.dim} · ${c.yellow}GLM${c.reset}
  ${c.dim}Type ${c.white}help${c.dim} for commands, ${c.white}exit${c.dim} to quit${c.reset}
`);
}

export function printHelp() {
  console.log(`
${c.bold}${c.white}OpenPrompts${c.reset} — AI Prompt Generator

${c.bold}Usage:${c.reset}
  ${c.green}openprompts${c.reset} [command] [options]

${c.bold}Commands:${c.reset}
  ${c.cyan}generate${c.reset} <desc>    Generate a prompt from description
  ${c.cyan}refine${c.reset} <prompt>    Refine an existing prompt (GLM)
  ${c.cyan}templates${c.reset}          List prompt templates
  ${c.cyan}interactive${c.reset}        Start interactive mode
  ${c.cyan}help${c.reset}               Show this help

${c.bold}Interactive Commands:${c.reset}
  ${c.yellow}/refine${c.reset} <text>     Refine a prompt
  ${c.yellow}/alt${c.reset} <text>        Get alternative (Gemini)
  ${c.yellow}templates${c.reset}          List templates
  ${c.yellow}exit${c.reset}               Quit

${c.bold}Options:${c.reset}
  ${c.gray}--key${c.reset} <key>        OpenRouter API key
  ${c.gray}--model${c.reset} <model>    Model: deepseek|gemini|glm

${c.bold}Environment:${c.reset}
  ${c.gray}OPENROUTER_API_KEY${c.reset}  API key (alternative to --key)

${c.bold}Examples:${c.reset}
  ${c.dim}$ openprompts generate "customer service chatbot"
  $ openprompts refine "You are a helpful assistant..."
  $ openprompts interactive
  $ OPENROUTER_API_KEY=sk-... openprompts "code reviewer for Python"${c.reset}

${c.dim}https://prompt.gbe-sa.tech${c.reset}
`);
}

export function printTemplates() {
  const categories = {};
  for (const t of TEMPLATES) {
    if (!categories[t.category]) categories[t.category] = [];
    categories[t.category].push(t);
  }

  console.log(`\n${c.bold}${c.white}Prompt Templates${c.reset}\n`);

  for (const [cat, templates] of Object.entries(categories)) {
    console.log(`  ${c.purple}${c.bold}${cat}${c.reset}`);
    for (const t of templates) {
      console.log(`    ${c.dim}${symbols.bullet}${c.reset} ${c.white}${t.title}${c.reset} ${c.dim}— ${t.desc}${c.reset}`);
    }
    console.log();
  }
}
