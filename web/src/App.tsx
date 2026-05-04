import { useState, useRef, useEffect, useCallback } from "react";
import { Snippet } from "./components/Snippet";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy, Check, RefreshCw, Sparkles, BookOpen, Code2, PenTool,
  Briefcase, GraduationCap, MessageSquare, Wand2, X, ArrowRight,
  Plus, Search, Home, Clock, Paperclip, ArrowUp, ChevronDown,
  Menu, Settings, Globe, FileText, Languages, ToggleLeft, ToggleRight,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model?: string;
  phase?: "draft" | "refined" | "alternative";
  isStreaming?: boolean;
}

interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

interface ClarifyState {
  questions: string[];
  answers: string[];
  originalInput: string;
}

// ─── Constants ───────────────────────────────────────────────
const MODELS = {
  primary: { id: "deepseek/deepseek-chat-v3-0324", label: "DeepSeek V3", color: "#10B981" },
  fallback: { id: "google/gemini-2.5-flash-preview", label: "Gemini Flash", color: "#3B82F6" },
  refine: { id: "thudm/glm-4-plus", label: "GLM-4 Plus", color: "#F59E0B" },
};

const SUGGESTIONS = [
  "Customer service chatbot",
  "Code review assistant",
  "Blog post writer",
  "Data analysis prompt",
  "Marketing copywriter",
  "Technical documentation",
];

const SYSTEM_PROMPT = `You are an elite prompt engineer. Generate a highly effective, production-ready prompt from the user's description.

Principles:
1. Clear role assignment
2. Specific task instructions
3. Output format specification
4. Constraints and guardrails
5. Few-shot examples when helpful
6. Chain-of-thought guidance for complex tasks

Output the prompt directly in clean markdown. No preamble. Every word earns its place.`;

const SYSTEM_PROMPT_SIMPLE = SYSTEM_PROMPT + `\n\nIMPORTANT: Keep the generated prompt concise — under 300 words. Focus on clarity and essentials.`;

const REFINE_PROMPT = `You are a prompt quality specialist. Refine the given prompt:
1. Tighten language, remove redundancy
2. Strengthen constraints
3. Add missing edge cases
4. Improve output format
Output ONLY the refined prompt. No commentary.`;

// ─── Utilities ───────────────────────────────────────────────
const genId = () => Math.random().toString(36).slice(2, 10);
const isArabic = (t: string) => /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(t);

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function getGreetingAr() {
  const h = new Date().getHours();
  if (h < 12) return "صباح الخير";
  if (h < 17) return "مساء الخير";
  return "مساء الخير";
}

// Session persistence
const SESSIONS_KEY = "openprompts-sessions";
const loadSessions = (): Session[] => {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]"); } catch { return []; }
};
const saveSessions = (s: Session[]) => localStorage.setItem(SESSIONS_KEY, JSON.stringify(s));

function groupByDate(sessions: Session[]) {
  const now = Date.now();
  const day = 86400000;
  const groups: Record<string, Session[]> = {};
  for (const s of sessions.sort((a, b) => b.updatedAt - a.updatedAt)) {
    const diff = now - s.updatedAt;
    const label = diff < day ? "Today" : diff < 2 * day ? "Yesterday" : diff < 7 * day ? "Previous 7 Days" : "Older";
    (groups[label] ??= []).push(s);
  }
  return groups;
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  const [sessions, setSessions] = useState<Session[]>(loadSessions);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [clarify, setClarify] = useState<ClarifyState | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [arabicNotice, setArabicNotice] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; text: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const greeting = getGreeting();

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { saveSessions(sessions); }, [sessions]);

  // Auto-resize textarea
  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.style.height = "auto";
    inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + "px";
  }, [input]);

  // ─── Session Management ──────────────────────────────────
  const createSession = (firstMessage: string) => {
    const session: Session = {
      id: genId(),
      title: firstMessage.slice(0, 60) + (firstMessage.length > 60 ? "..." : ""),
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    return session.id;
  };

  const updateSessionMessages = (sessionId: string, msgs: Message[]) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, messages: msgs, updatedAt: Date.now() } : s))
    );
  };

  const startNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setClarify(null);
    setUploadedFile(null);
    setInput("");
  };

  const loadSession = (session: Session) => {
    setActiveSessionId(session.id);
    setMessages(session.messages);
    setClarify(null);
  };

  const deleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) startNewChat();
  };

  // ─── API Calls ───────────────────────────────────────────
  const streamFromAPI = async (userMessage: string, systemPrompt: string, model: typeof MODELS.primary, phase: Message["phase"]) => {
    const assistantId = genId();
    const newMsg: Message = { id: assistantId, role: "assistant", content: "", model: model.label, phase, isStreaming: true };
    setMessages((prev) => [...prev, newMsg]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, systemPrompt, model: model.id }),
      });

      if (!res.ok) {
        const err = await res.text();
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: `Error: ${err}`, isStreaming: false } : m)));
        setIsLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of decoder.decode(value, { stream: true }).split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const delta = JSON.parse(data).choices?.[0]?.delta?.content;
              if (delta) { acc += delta; setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: acc } : m))); }
            } catch {}
          }
        }
      }
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m)));
    } catch (err) {
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: `Error: ${err}`, isStreaming: false } : m)));
    }
    setIsLoading(false);
  };

  // ─── Prompt Flow ─────────────────────────────────────────
  const handleSend = async () => {
    let text = input.trim();
    if (!text && !uploadedFile) return;
    if (isLoading) return;

    // Attach file context
    if (uploadedFile) {
      text = `${text}\n\n[Attached file: ${uploadedFile.name}]\n${uploadedFile.text.slice(0, 5000)}`;
      setUploadedFile(null);
    }

    const hasArabic = isArabic(text);
    if (hasArabic && !arabicNotice) {
      setArabicNotice(true);
    }

    const userMsg: Message = { id: genId(), role: "user", content: text };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");

    let sessionId = activeSessionId;
    if (!sessionId) sessionId = createSession(text);

    // Translate Arabic if needed
    let promptText = text;
    if (hasArabic) {
      try {
        const tRes = await fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
        const tData = await tRes.json();
        if (tData.translated) promptText = tData.translated;
      } catch {}
    }

    if (isAdvanced) {
      // Classify and possibly ask questions
      try {
        const cRes = await fetch("/api/classify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: promptText, lang: hasArabic ? "ar" : "en" }) });
        const cData = await cRes.json();
        if (cData.type === "advanced" && cData.questions?.length) {
          setClarify({ questions: cData.questions, answers: Array(cData.questions.length).fill(""), originalInput: promptText });
          return;
        }
      } catch {}
    }

    await streamFromAPI(promptText, isAdvanced ? SYSTEM_PROMPT : SYSTEM_PROMPT_SIMPLE, MODELS.primary, "draft");
    setMessages((prev) => { updateSessionMessages(sessionId!, prev); return prev; });
  };

  const handleClarifySubmit = async () => {
    if (!clarify) return;
    const context = `Original request: ${clarify.originalInput}\n\nClarifications:\n${clarify.questions.map((q, i) => `Q: ${q}\nA: ${clarify.answers[i]}`).join("\n\n")}`;
    const userMsg: Message = { id: genId(), role: "user", content: context };
    setMessages((prev) => [...prev, userMsg]);
    setClarify(null);
    await streamFromAPI(context, SYSTEM_PROMPT, MODELS.primary, "draft");
    setMessages((prev) => { if (activeSessionId) updateSessionMessages(activeSessionId, prev); return prev; });
  };

  const handleRefine = async (id: string) => {
    const msg = messages.find((m) => m.id === id);
    if (!msg || isLoading) return;
    await streamFromAPI(msg.content, REFINE_PROMPT, MODELS.refine, "refined");
  };

  const handleAlternative = async () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser || isLoading) return;
    await streamFromAPI(lastUser.content, SYSTEM_PROMPT + "\n\nGenerate a DIFFERENT approach.", MODELS.fallback, "alternative");
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      setUploadedFile({ name: data.filename, text: data.text });
    } catch { setUploadedFile({ name: file.name, text: "[Failed to process file]" }); }
    if (e.target) e.target.value = "";
  };

  const handleSuggestion = (text: string) => {
    setInput(text);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const hasMessages = messages.length > 0;
  const grouped = groupByDate(sessions);

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className="flex h-screen w-full overflow-hidden bg-white">
      {/* ── Sidebar ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full bg-[#F9FAFB] border-r border-gray-200 flex flex-col overflow-hidden flex-shrink-0"
          >
            {/* Logo + New */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                  <Wand2 className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-[15px] text-gray-900">OpenPrompts</span>
              </div>
              <button onClick={startNewChat} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors" title="New chat">
                <Plus className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Nav */}
            <nav className="px-3 space-y-0.5">
              <button onClick={startNewChat} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-200/60 transition-colors">
                <Home className="w-4 h-4" /> Home
              </button>
              <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-200/60 transition-colors">
                <Clock className="w-4 h-4" /> History
              </button>
            </nav>

            {/* Session History */}
            <div className="flex-1 overflow-y-auto mt-4 px-3">
              {Object.entries(grouped).map(([label, items]) => (
                <div key={label} className="mb-4">
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider px-3 mb-1.5">{label}</p>
                  {items.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => loadSession(s)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-[13px] truncate transition-colors group ${
                        activeSessionId === s.id ? "bg-white shadow-sm text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-200/60"
                      }`}
                    >
                      <span className="truncate block">{s.title}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* CLI snippet */}
            <div className="p-3 border-t border-gray-200">
              <Snippet text="npm i -g openprompts" width="100%" />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-4 h-12 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <Menu className="w-4 h-4 text-gray-500" />
            </button>
            {/* Model indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs text-gray-600">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {MODELS.primary.label}
              <ChevronDown className="w-3 h-3" />
            </div>
          </div>
          {/* Mode toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAdvanced(!isAdvanced)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                isAdvanced ? "bg-accent text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {isAdvanced ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
              {isAdvanced ? "Advanced" : "Simple"}
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!hasMessages && !clarify ? (
            /* ── Welcome ── */
            <div className="flex flex-col items-center justify-center h-full px-4 relative">
              {/* Subtle gradient blob */}
              <div className="gradient-blob bg-indigo-300 -top-20 right-1/4" />
              <div className="gradient-blob bg-blue-200 bottom-40 left-1/3" />

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center z-10 max-w-lg">
                <h1 className="text-3xl font-bold text-gray-900 mb-1">{greeting}</h1>
                <h2 className="text-3xl font-bold">
                  <span className="text-gray-400">What prompt shall we </span>
                  <span className="text-accent">craft?</span>
                </h2>
              </motion.div>

              {/* Suggestions */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="flex flex-wrap justify-center gap-2 mt-8 z-10 max-w-lg"
              >
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSuggestion(s)}
                    className="px-3.5 py-2 rounded-full border border-gray-200 bg-white text-[13px] text-gray-600 hover:border-accent hover:text-accent hover:shadow-sm transition-all"
                  >
                    {s}
                  </button>
                ))}
              </motion.div>
            </div>
          ) : (
            /* ── Messages ── */
            <div className="max-w-3xl mx-auto w-full px-4 py-6 space-y-5">
              {/* Arabic notice */}
              {arabicNotice && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-sm">
                  <Languages className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <p className="text-amber-800" dir="rtl">البرومبتات تكون أكثر دقة بالإنجليزية وتعطي نتائج أفضل</p>
                  <button onClick={() => setArabicNotice(false)} className="ml-auto p-1 hover:bg-amber-100 rounded"><X className="w-3 h-3 text-amber-600" /></button>
                </motion.div>
              )}

              <AnimatePresence>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    dir={isArabic(msg.content) ? "rtl" : "ltr"}
                  >
                    {msg.role === "user" ? (
                      <div className="flex justify-end">
                        <div className="max-w-[80%] bg-accent text-white rounded-2xl rounded-br-md px-4 py-3">
                          <p className="text-[14px] whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-full">
                        {/* Badge */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-gray-500">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: msg.phase === "refined" ? MODELS.refine.color : msg.phase === "alternative" ? MODELS.fallback.color : MODELS.primary.color }} />
                            {msg.model}
                          </span>
                          {msg.phase && (
                            <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                              msg.phase === "draft" ? "bg-emerald-50 text-emerald-600" : msg.phase === "refined" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                            }`}>
                              {msg.phase === "draft" ? "Draft" : msg.phase === "refined" ? "Refined" : "Alternative"}
                            </span>
                          )}
                          {msg.isStreaming && <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />}
                        </div>
                        {/* Content */}
                        <div className="bg-[#F9FAFB] border border-gray-200 rounded-2xl px-5 py-4">
                          <div className="prose-prompt text-[14px] text-gray-800">
                            <ReactMarkdown>{msg.content || " "}</ReactMarkdown>
                          </div>
                          {!msg.isStreaming && msg.content && (
                            <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-gray-100">
                              <button onClick={() => handleCopy(msg.content, msg.id)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
                                {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                {copiedId === msg.id ? "Copied" : "Copy"}
                              </button>
                              {msg.phase === "draft" && (
                                <>
                                  <button onClick={() => handleRefine(msg.id)} disabled={isLoading} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-all">
                                    <Sparkles className="w-3 h-3" /> Refine
                                  </button>
                                  <button onClick={handleAlternative} disabled={isLoading} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                                    <RefreshCw className="w-3 h-3" /> Alternative
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

              {/* Clarify Questions */}
              {clarify && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-accent/5 border border-accent/20 rounded-2xl p-5 space-y-4">
                  <p className="text-sm font-medium text-accent">A few questions to craft a better prompt:</p>
                  {clarify.questions.map((q, i) => (
                    <div key={i}>
                      <label className="text-[13px] text-gray-700 font-medium mb-1 block" dir={isArabic(q) ? "rtl" : "ltr"}>{q}</label>
                      <input
                        type="text"
                        value={clarify.answers[i]}
                        onChange={(e) => { const a = [...clarify.answers]; a[i] = e.target.value; setClarify({ ...clarify, answers: a }); }}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 bg-white"
                        dir={isArabic(q) ? "rtl" : "ltr"}
                      />
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <button onClick={handleClarifySubmit} className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-dark transition-colors">Generate Prompt</button>
                    <button onClick={() => setClarify(null)} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm hover:bg-gray-200 transition-colors">Skip</button>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ── Input Area ── */}
        <div className="flex-shrink-0 px-4 pb-4 pt-2 max-w-3xl mx-auto w-full">
          {/* Uploaded file badge */}
          {uploadedFile && (
            <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-600 w-fit">
              <FileText className="w-3 h-3" />
              {uploadedFile.name}
              <button onClick={() => setUploadedFile(null)} className="p-0.5 hover:bg-gray-200 rounded"><X className="w-3 h-3" /></button>
            </div>
          )}

          <div className="relative input-focus rounded-2xl border border-gray-200 bg-white shadow-sm transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={isAdvanced ? "Describe your complex prompt need..." : "What prompt do you need?"}
              className="w-full px-4 pt-3 pb-2 text-[14px] text-gray-900 placeholder:text-gray-400 bg-transparent resize-none focus:outline-none min-h-[44px] max-h-[200px]"
              rows={1}
              disabled={isLoading}
              dir={isArabic(input) ? "rtl" : "ltr"}
            />
            <div className="flex items-center justify-between px-3 pb-2.5">
              <div className="flex items-center gap-1">
                <button onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="Attach file">
                  <Paperclip className="w-4 h-4" />
                </button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept="image/*,.pdf,.doc,.docx,.md,.txt,audio/*" />
              </div>
              <button
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && !uploadedFile)}
                className={`p-2 rounded-xl transition-all ${
                  input.trim() || uploadedFile ? "bg-accent text-white hover:bg-accent-dark shadow-sm" : "bg-gray-100 text-gray-400"
                }`}
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-center text-[11px] text-gray-400 mt-2">
            {isAdvanced ? "Advanced mode — AI will ask clarifying questions" : "Simple mode — concise prompts under 300 words"}
          </p>
        </div>
      </main>
    </div>
  );
}
