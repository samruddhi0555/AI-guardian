import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  User,
  Send,
  Trash2,
  Sparkles,
  Zap,
  Activity,
  HeartPulse,
  Brain,
  CornerDownRight,
  ShieldCheck
} from "lucide-react";
import { IChatMessage, ITask, IDashboardAnalytics } from "../types";

interface CoachViewProps {
  chats: IChatMessage[];
  tasks: ITask[];
  analytics: IDashboardAnalytics;
  onSendMessage: (msg: string) => void;
  onClearChats: () => void;
  isSendingChat: boolean;
}

export default function CoachView({
  chats,
  tasks,
  analytics,
  onSendMessage,
  onClearChats,
  isSendingChat
}: CoachViewProps) {
  const [userInput, setUserInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, isSendingChat]);

  const presetQuestions = [
    { text: "What should I work on today?", label: "Daily Priority" },
    { text: "Which task is most critical?", label: "Critical Path Blockers" },
    { text: "Can I finish all tasks on time?", label: "Telemetry Verification" },
    { text: "How do I reduce deadline risk?", label: "Mitigation Strategy" }
  ];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isSendingChat) return;
    onSendMessage(userInput);
    setUserInput("");
  };

  const handlePresetClick = (qText: string) => {
    if (isSendingChat) return;
    onSendMessage(qText);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-140px)] min-h-[500px] animate-fade-in relative z-10 pb-4">
      {/* Left Chat Column (Span 3) */}
      <div className="lg:col-span-3 flex flex-col justify-between glass-panel rounded-2xl border border-white/8 overflow-hidden h-full bg-[#05070a]/80 backdrop-blur-xl">
        {/* Chat Title bar */}
        <div className="flex items-center justify-between border-b border-white/8 bg-[#05070a]/40 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-[#00f3ff]/10 border border-[#00f3ff]/20">
              <Bot className="w-5 h-5 text-[#00f3ff] animate-pulse" />
            </div>
            <div>
              <h3 className="font-display font-black text-xs text-white uppercase tracking-wider">AI Productivity Advisor</h3>
              <p className="text-[10px] font-mono text-[#00f3ff]/70 tracking-wider uppercase">Secure_Link // Direct_Coach_Comms</p>
            </div>
          </div>

          <button
            id="clear-chat-history-btn"
            onClick={onClearChats}
            className="p-2 text-slate-500 hover:text-[#ff00c8] hover:bg-[#ff00c8]/5 border border-transparent hover:border-[#ff00c8]/20 rounded-xl transition-all text-xs flex items-center gap-1.5 font-mono cursor-pointer"
            title="Clear Chat Log"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">RESET LOGS</span>
          </button>
        </div>

        {/* Preset Prompt Suggestions */}
        <div className="px-6 py-3 border-b border-white/8 bg-[#05070a]/20">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-1 shrink-0">
              <Sparkles className="w-3 h-3 text-[#00f3ff]" /> SUGGESTED DIALOGUES:
            </span>
            {presetQuestions.map((q, idx) => (
              <button
                key={idx}
                id={`preset-chat-${idx}`}
                onClick={() => handlePresetClick(q.text)}
                disabled={isSendingChat}
                className="text-[10px] font-mono border border-white/8 hover:border-[#00f3ff]/40 text-[#94a3b8] hover:text-white bg-white/4 hover:bg-[#00f3ff]/5 px-3 py-1.5 rounded-lg cursor-pointer transition-all disabled:opacity-40"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message Log Canvas */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {chats.map((chat) => {
            const isModel = chat.role === "model";
            return (
              <div
                key={chat.id}
                className={`flex gap-4 max-w-4xl ${isModel ? "mr-12" : "ml-auto flex-row-reverse pl-12"}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                  isModel
                    ? "bg-[#00f3ff]/10 border-[#00f3ff]/30 text-[#00f3ff]"
                    : "bg-[#ff00c8]/10 border-[#ff00c8]/30 text-[#ff00c8]"
                }`}>
                  {isModel ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                {/* Bubble content */}
                <div className="space-y-1">
                  <div className={`flex items-center gap-2 font-mono text-[9px] text-slate-500 ${!isModel && "justify-end"}`}>
                    <span className="uppercase font-bold tracking-widest text-[#94a3b8]">
                      {isModel ? "GUARDIAN_COACH" : "USER_COMMS"}
                    </span>
                    <span>•</span>
                    <span>{new Date(chat.timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>

                  <div className={`p-4 rounded-2xl border text-sm leading-relaxed ${
                    isModel
                      ? "bg-[#05070a]/90 border-white/8 text-slate-300 rounded-tl-none font-sans"
                      : "bg-[#ff00c8]/5 border-[#ff00c8]/10 text-slate-200 rounded-tr-none font-sans"
                  }`}>
                    {/* Render markdown text nicely with simple linebreaks / bullet support */}
                    <div className="space-y-2 whitespace-pre-wrap">
                      {chat.text.split("\n").map((line, lidx) => {
                        // Bold parsing **text**
                        let content: React.ReactNode = line;
                        const boldRegex = /\*\*(.*?)\*\*/g;
                        if (boldRegex.test(line)) {
                          const parts = line.split(boldRegex);
                          content = parts.map((part, pidx) => pidx % 2 === 1 ? <strong key={pidx} className="text-[#00f3ff] font-bold">{part}</strong> : part);
                        }

                        // Bullet items
                        if (line.trim().startsWith("-") || line.trim().startsWith("*")) {
                          return (
                            <div key={lidx} className="flex gap-2 pl-3.5 mt-1 text-slate-300">
                              <span className="text-[#00f3ff] shrink-0">•</span>
                              <p className="flex-1">{content}</p>
                            </div>
                          );
                        }

                        // Title headers
                        if (line.trim().startsWith("###")) {
                          return <h4 key={lidx} className="font-display font-bold text-white text-sm mt-3 uppercase tracking-wider">{content}</h4>;
                        }

                        return <p key={lidx} className="leading-relaxed">{content}</p>;
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isSendingChat && (
            <div className="flex gap-4 max-w-4xl mr-12 animate-pulse">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#00f3ff]/10 border border-[#00f3ff]/30 text-[#00f3ff]">
                <Bot className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <p className="font-mono text-[9px] text-slate-500 uppercase font-bold tracking-widest text-[#94a3b8]">
                  GUARDIAN_COACH // GENERATING_TELEMETRY...
                </p>
                <div className="p-4 rounded-2xl border bg-[#05070a]/90 border-white/8 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#00f3ff] animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-[#00f3ff] animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-[#00f3ff] animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Message Footer */}
        <form onSubmit={handleSend} className="p-4 border-t border-white/8 bg-[#05070a]/40 relative z-10 flex gap-3">
          <input
            type="text"
            id="chat-user-input"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Query tactical suggestions or scheduling block ideas..."
            disabled={isSendingChat}
            className="flex-1 bg-[#05070a]/95 border border-white/8 focus:border-[#00f3ff]/40 rounded-xl px-4 py-3.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition-all focus:shadow-[0_0_10px_rgba(0,243,255,0.05)] font-sans"
          />
          <button
            type="submit"
            id="chat-submit-btn"
            disabled={isSendingChat || !userInput.trim()}
            className="bg-[#00f3ff] hover:brightness-110 text-slate-950 p-3.5 rounded-xl transition-all font-bold flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_12px_rgba(0,243,255,0.2)]"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Right Telemetry Column (Span 1) - Diagnostics */}
      <div className="space-y-6 lg:col-span-1 h-full flex flex-col justify-between overflow-y-auto pr-1">
        {/* Active System Diagnoses Widget */}
        <div className="glass-panel rounded-2xl p-5 border border-white/8 flex-1 flex flex-col justify-between bg-[#05070a]/80 backdrop-blur-xl">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-white/8 pb-3">
              <Activity className="w-4 h-4 text-[#00f3ff]" />
              <h4 className="font-display font-black text-xs text-white uppercase tracking-wider">Tactical Stats</h4>
            </div>

            <div className="space-y-3 font-mono text-[11px] leading-relaxed">
              <div className="p-3 rounded-lg bg-[#05070a]/95 border border-white/8 flex justify-between items-center">
                <span className="text-[#94a3b8] flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-[#00f3ff]" /> Work Capacity:
                </span>
                <span className="text-white font-bold">{analytics.availableCapacity} Hours</span>
              </div>

              <div className="p-3 rounded-lg bg-[#05070a]/95 border border-white/8 flex justify-between items-center">
                <span className="text-[#94a3b8] flex items-center gap-1.5">
                  <HeartPulse className="w-3.5 h-3.5 text-[#ff00c8]" /> Burnout Score:
                </span>
                <span className="text-[#ff00c8] font-bold">{analytics.burnoutScore}%</span>
              </div>

              <div className="p-3 rounded-lg bg-[#05070a]/95 border border-white/8 flex justify-between items-center">
                <span className="text-[#94a3b8] flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-yellow-500" /> Overall Risk:
                </span>
                <span className="text-yellow-400 font-bold">{analytics.overallRiskIndex}%</span>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-white/8 pt-4 text-xs font-sans text-[#94a3b8] leading-normal space-y-3">
            <div className="p-3 bg-[#00f3ff]/5 rounded-xl border border-[#00f3ff]/10 flex gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#00f3ff] shrink-0" />
              <div>
                <p className="font-display font-black text-xs text-slate-200 uppercase leading-none">Guard Active</p>
                <p className="text-[10px] text-[#94a3b8] mt-1.5">Prompt memory captures recent context dynamically for continuous coordination.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
