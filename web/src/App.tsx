import { useState, useRef, useEffect, useCallback } from "react";
import { PromptInputBox } from "./components/PromptInputBox";
import { Snippet } from "./components/Snippet";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy, Check, RefreshCw, Sparkles, Zap, BookOpen, Code2,
  PenTool, Briefcase, GraduationCap, MessageSquare, ChevronDown,
  Wand2, X, Star, ArrowRight
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
  phase?: "draft" | "refined" | "alternative";
  isStreaming?: boolean;
}

interface PromptTemplate {
  title: string;
  prompt: string;
  category: string;
}

const MODELS = {
  primary: { id: "deepseek/deepseek-chat-v3-0324", label: "DeepSeek V3", color: "#10B981" },
  fallback: { id: "google/gemini-2.5-flash-preview", label: "Gemini Flash", color: "#1EAEDB" },
  refine: { id: "thudm/glm-4-plus", label: "GLM-4 Plus", color: "#F97316" },
};

const CATEGORIES = [
  { icon: Code2, label: "Coding", color: "#10B981", desc: "Code generation & debugging" },
  { icon: PenTool, label: "Writing", color: "#8B5CF6", desc: "Content & creative writing" },
  { icon: Briefcase, label: "Business", color: "#1EAEDB", desc: "Business & marketing" },
  { icon: GraduationCap, label: "Education", color: "#F97316", desc: "Teaching & learning" },
  { icon: MessageSquare, label: "Roleplay", color: "#EC4899", desc: "Characters & personas" },
  { icon: Sparkles, label: "Creative", color: "#FBBF24", desc: "Art, music & ideas" },
];

const TEMPLATES: PromptTemplate[] = [
  { title: "Linux Terminal", prompt: "I want you to act as a linux terminal. I will type commands and you will reply with what the terminal should show. I want you to only reply with the terminal output inside one unique code block, and nothing else.", category: "Coding" },
  { title: "JavaScript Console", prompt: "I want you to act as a javascript console. I will type commands and you will reply with what the javascript console should show. I want you to only reply with the terminal output inside one unique code block.", category: "Coding" },
  { title: "English Translator", prompt: "I want you to act as an English translator, spelling corrector and improver. I will speak to you in any language and you will detect the language, translate it and answer in the corrected and improved version of my text, in English.", category: "Writing" },
  { title: "Job Interviewer", prompt: "I want you to act as an interviewer. I will be the candidate and you will ask me the interview questions for the position. I want you to only reply as the interviewer.", category: "Business" },
  { title: "Travel Guide", prompt: "I want you to act as a travel guide. I will write you my location and you will suggest a place to visit near my location. In some cases, I will also give you the type of places I will visit.", category: "Creative" },
  { title: "Storyteller", prompt: "I want you to act as a storyteller. You will come up with entertaining stories that are engaging, imaginative and captivating for the audience. It can be fairy tales, educational stories or any other type of stories.", category: "Creative" },
  { title: "Motivational Coach", prompt: "I want you to act as a motivational coach. I will provide you with some information about someone's goals and challenges, and it will be your job to come up with strategies that can help this person achieve their goals.", category: "Education" },
  { title: "Advertiser", prompt: "I want you to act as an advertiser. You will create a campaign to promote a product or service of your choice. You will choose a target audience, develop key messages and slogans, select the media channels for promotion.", category: "Business" },
  { title: "Stand-up Comedian", prompt: "I want you to act as a stand-up comedian. I will provide you with some topics related to current events and you will use your wit, creativity, and observational skills to create a routine based on those topics.", category: "Roleplay" },
  { title: "Screenwriter", prompt: "I want you to act as a screenwriter. You will develop an engaging and creative script for either a feature length film, or a Web Series that can captivate its viewers.", category: "Writing" },
  { title: "Debater", prompt: "I want you to act as a debater. I will provide you with some topics related to current events and your task is to research both sides of the debates, present valid arguments for each side.", category: "Education" },
  { title: "Philosophy Teacher", prompt: "I want you to act as a philosophy teacher. I will provide some topics related to the study of philosophy, and it will be your job to explain these concepts in an easy-to-understand manner.", category: "Education" },
  { title: "AI Writing Tutor", prompt: "I want you to act as an AI writing tutor. I will provide you with a student who needs help improving their writing and your task is to use artificial intelligence tools to give the student feedback.", category: "Writing" },
  { title: "Excel Sheet", prompt: "I want you to act as a text based excel. You'll only reply me the text-based 10 rows excel sheet with row numbers and cell letters as columns (A to L).", category: "Coding" },
  { title: "Rapper", prompt: "I want you to act as a rapper. You will come up with powerful and meaningful lyrics, beats and rhythm that can 'wow' the audience. Your lyrics should have an intriguing meaning and message.", category: "Creative" },
  { title: "Poet", prompt: "I want you to act as a poet. You will create poems that evoke emotions and have the power to stir people's soul. Write on any topic or theme but make sure your words convey the feeling.", category: "Creative" },
  { title: "Movie Critic", prompt: "I want you to act as a movie critic. You will develop an engaging and creative movie review covering topics like plot, themes, acting, direction, cinematography, and more.", category: "Writing" },
  { title: "Relationship Coach", prompt: "I want you to act as a relationship coach. I will provide some details about the two people involved in a conflict, and it will be your job to come up with suggestions.", category: "Roleplay" },
];

const SYSTEM_PROMPT = `You are an elite prompt engineer. Your job is to take the user's description and generate a highly effective, production-ready prompt.

Follow these principles from the Prompt Engineering Guide:
1. **Role Assignment**: Start with a clear role/persona for the AI
2. **Task Clarity**: Be specific about what the AI should do
3. **Context**: Provide relevant background information
4. **Output Format**: Specify the desired format (markdown, JSON, list, etc.)
5. **Constraints**: Set clear boundaries and limitations
6. **Examples**: Include few-shot examples when helpful
7. **Chain-of-Thought**: Encourage step-by-step reasoning for complex tasks
8. **Guardrails**: Add safety and quality constraints

Output the generated prompt in a clean, copy-ready format. Use markdown formatting.
Start with the prompt directly - no preamble like "Here's a prompt for you".
Make the prompt comprehensive but concise. Every word should earn its place.`;

const REFINE_PROMPT = `You are a prompt quality specialist. Take the following prompt and refine it:
1. Tighten language - remove redundancy
2. Strengthen constraints and guardrails
3. Add missing context or edge cases
4. Improve output format specification
5. Ensure chain-of-thought guidance where needed
6. Make it more robust against misinterpretation

Output ONLY the refined prompt, no commentary. Start directly with the improved prompt.`;

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const generateId = () => Math.random().toString(36).substring(2, 10);

  const streamFromAPI = async (
    userMessage: string,
    systemPrompt: string,
    model: typeof MODELS.primary,
    phase: Message["phase"],
    existingMessages?: Message[]
  ) => {
    const assistantId = generateId();
    const newMsg: Message = { id: assistantId, role: "assistant", content: "", model: model.label, phase, isStreaming: true };

    setMessages((prev) => [...prev, newMsg]);
    setIsLoading(true);

    try {
      const apiMessages = [];
      if (existingMessages) {
        for (const m of existingMessages) {
          if (m.role === "user" || m.role === "assistant") {
            apiMessages.push({ role: m.role, content: m.content });
          }
        }
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          systemPrompt,
          model: model.id,
          history: apiMessages,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: `Error: ${err}`, isStreaming: false } : m));
        setIsLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  accumulated += delta;
                  setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: accumulated } : m));
                }
              } catch {}
            }
          }
        }
      }

      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, isStreaming: false } : m));
    } catch (err) {
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: `Network error: ${err}`, isStreaming: false } : m));
    }
    setIsLoading(false);
  };

  const handleSend = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMsg: Message = { id: generateId(), role: "user", content: message };
    setMessages((prev) => [...prev, userMsg]);

    const mode = message.startsWith("[think]") ? "think" : message.startsWith("[search]") ? "search" : "default";
    const cleanMessage = message.replace(/^\[(think|search|canvas)\]\s*/, "");

    let systemPrompt = SYSTEM_PROMPT;
    if (mode === "think") {
      systemPrompt += "\n\nIMPORTANT: Think step-by-step before generating the prompt. Show your reasoning process, then provide the final prompt in a clearly marked section.";
    }

    await streamFromAPI(cleanMessage, systemPrompt, MODELS.primary, "draft");
  };

  const handleRefine = async (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg || isLoading) return;
    await streamFromAPI(msg.content, REFINE_PROMPT, MODELS.refine, "refined");
  };

  const handleAlternative = async (messageId: string) => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser || isLoading) return;
    await streamFromAPI(lastUser.content, SYSTEM_PROMPT + "\n\nGenerate a DIFFERENT approach to this prompt. Use a contrasting style or structure.", MODELS.fallback, "alternative");
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTemplateSelect = (template: PromptTemplate) => {
    const userMsg: Message = { id: generateId(), role: "user", content: `Improve and expand this prompt template:\n\n"${template.prompt}"` };
    setMessages((prev) => [...prev, userMsg]);
    setShowTemplates(false);
    streamFromAPI(
      `Improve and expand this prompt template for "${template.title}":\n\n"${template.prompt}"`,
      SYSTEM_PROMPT + "\n\nThe user is providing an existing prompt template. Your job is to significantly improve it: make it more specific, add better constraints, improve the output format, and make it production-ready.",
      MODELS.primary,
      "draft"
    );
  };

  const filteredTemplates = selectedCategory
    ? TEMPLATES.filter((t) => t.category === selectedCategory)
    : TEMPLATES;

  const hasMessages = messages.length > 0;

  return (
    <div className="min-h-screen bg-[#0D0D0F] flex flex-col">
      {/* Header */}
      <header className="border-b border-[#1F2023] bg-[#0D0D0F]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-semibold text-white">Prompt Generator</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#333] bg-[#1F2023] text-sm text-gray-300 hover:bg-[#2E3033] hover:text-white transition-all"
            >
              <BookOpen className="w-4 h-4" />
              Templates
            </button>
            {hasMessages && (
              <button
                onClick={() => setMessages([])}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#333] bg-[#1F2023] text-sm text-gray-400 hover:bg-[#2E3033] hover:text-white transition-all"
              >
                New
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4">
        {!hasMessages ? (
          /* Welcome Screen */
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center mb-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center mx-auto mb-5 shadow-lg shadow-purple-500/20">
                <Wand2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">Generate Perfect Prompts</h2>
              <p className="text-gray-400 text-lg max-w-md mx-auto">
                Describe what you need and get production-ready prompts crafted by AI
              </p>
            </motion.div>

            {/* Category Cards */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-xl mb-10">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.label}
                  onClick={() => { setShowTemplates(true); setSelectedCategory(cat.label); }}
                  className="group flex flex-col items-start gap-2 p-4 rounded-xl border border-[#222] bg-[#141416] hover:bg-[#1A1A1E] hover:border-[#333] transition-all text-left"
                >
                  <cat.icon className="w-5 h-5" style={{ color: cat.color }} />
                  <span className="text-sm font-medium text-gray-200 group-hover:text-white">{cat.label}</span>
                  <span className="text-xs text-gray-500">{cat.desc}</span>
                </button>
              ))}
            </motion.div>

            {/* CLI Install Snippet */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="w-full max-w-md mb-6">
              <p className="text-xs text-gray-500 mb-2 text-center">Install the CLI</p>
              <Snippet text="npm install -g openprompts" dark type="success" />
            </motion.div>

            {/* Model badges */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="flex items-center gap-3 text-xs text-gray-500">
              <span>Powered by</span>
              {Object.values(MODELS).map((m) => (
                <span key={m.id} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#141416] border border-[#222]">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.color }} />
                  {m.label}
                </span>
              ))}
            </motion.div>
          </div>
        ) : (
          /* Chat Messages */
          <div className="flex-1 overflow-y-auto py-6 space-y-4 custom-scrollbar">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}
                >
                  {msg.role === "user" ? (
                    <div className="max-w-[85%] bg-[#2E3033] rounded-2xl rounded-br-md px-4 py-3">
                      <p className="text-gray-100 text-[15px] whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ) : (
                    <div className="max-w-full w-full">
                      {/* Model + Phase badge */}
                      <div className="flex items-center gap-2 mb-2">
                        {msg.model && (
                          <span className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-[#1F2023] border border-[#333]">
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{
                                background: msg.phase === "refined" ? MODELS.refine.color : msg.phase === "alternative" ? MODELS.fallback.color : MODELS.primary.color,
                              }}
                            />
                            <span className="text-gray-400">{msg.model}</span>
                          </span>
                        )}
                        {msg.phase && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            msg.phase === "draft" ? "bg-emerald-500/10 text-emerald-400" :
                            msg.phase === "refined" ? "bg-orange-500/10 text-orange-400" :
                            "bg-blue-500/10 text-blue-400"
                          }`}>
                            {msg.phase === "draft" ? "Draft" : msg.phase === "refined" ? "Refined" : "Alternative"}
                          </span>
                        )}
                        {msg.isStreaming && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <span className="w-1 h-1 rounded-full bg-purple-400 animate-pulse" />
                            Generating...
                          </span>
                        )}
                      </div>

                      {/* Content card */}
                      <div className="prompt-card bg-[#141416] border border-[#222] rounded-2xl px-5 py-4 overflow-hidden">
                        <div className="prose-prompt text-[15px] text-gray-200 leading-relaxed">
                          <ReactMarkdown>{msg.content || " "}</ReactMarkdown>
                        </div>

                        {/* Actions */}
                        {!msg.isStreaming && msg.content && (
                          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#222]">
                            <button
                              onClick={() => handleCopy(msg.content, msg.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-[#1F2023] transition-all"
                            >
                              {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiedId === msg.id ? "Copied" : "Copy"}
                            </button>
                            {msg.phase === "draft" && (
                              <>
                                <button
                                  onClick={() => handleRefine(msg.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 transition-all"
                                  disabled={isLoading}
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  Refine
                                </button>
                                <button
                                  onClick={() => handleAlternative(msg.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                                  disabled={isLoading}
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  Alternative
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input Area */}
        <div className="sticky bottom-0 pb-4 pt-2 bg-gradient-to-t from-[#0D0D0F] via-[#0D0D0F] to-transparent">
          <PromptInputBox
            onSend={(msg) => handleSend(msg)}
            isLoading={isLoading}
            placeholder="Describe the prompt you need..."
          />
          <p className="text-center text-xs text-gray-600 mt-2">
            DeepSeek drafts · Gemini alternatives · GLM refines
          </p>
        </div>
      </main>

      {/* Templates Drawer */}
      <AnimatePresence>
        {showTemplates && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => { setShowTemplates(false); setSelectedCategory(null); }}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#141416] border-l border-[#222] z-50 flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-[#222]">
                <h2 className="text-lg font-semibold text-white">Prompt Templates</h2>
                <button
                  onClick={() => { setShowTemplates(false); setSelectedCategory(null); }}
                  className="p-2 rounded-full hover:bg-[#1F2023] transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Category Filter */}
              <div className="flex gap-2 p-4 overflow-x-auto">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all ${
                    !selectedCategory ? "bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/30" : "bg-[#1F2023] text-gray-400 border border-[#333] hover:text-white"
                  }`}
                >
                  All
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.label}
                    onClick={() => setSelectedCategory(cat.label)}
                    className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all ${
                      selectedCategory === cat.label
                        ? "bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/30"
                        : "bg-[#1F2023] text-gray-400 border border-[#333] hover:text-white"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Template List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {filteredTemplates.map((template, i) => (
                  <button
                    key={i}
                    onClick={() => handleTemplateSelect(template)}
                    className="w-full text-left p-4 rounded-xl border border-[#222] bg-[#1A1A1E] hover:bg-[#1F2023] hover:border-[#333] transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Star className="w-3.5 h-3.5 text-[#8B5CF6] flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-200 group-hover:text-white">{template.title}</span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2">{template.prompt}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 flex-shrink-0 mt-1 transition-colors" />
                    </div>
                    <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-[#141416] text-gray-500 border border-[#222]">
                      {template.category}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
