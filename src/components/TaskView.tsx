import React, { useState } from "react";
import {
  ListTodo,
  Calendar,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Clock,
  Sliders,
  Play,
  CornerDownRight
} from "lucide-react";
import { ITask } from "../types";

interface TaskViewProps {
  tasks: ITask[];
  onAddTask: (taskPayload: any) => void;
  onUpdateTask: (id: string, updates: any) => void;
  onDeleteTask: (id: string) => void;
  isAddingTask: boolean;
}

export default function TaskView({
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  isAddingTask
}: TaskViewProps) {
  // Toggle between Natural Language vs Manual Entry
  const [entryMode, setEntryMode] = useState<"nl" | "manual">("nl");

  // NL input state
  const [nlInput, setNlInput] = useState("");

  // Manual input states
  const [manualTitle, setManualTitle] = useState("");
  const [manualDeadline, setManualDeadline] = useState("");
  const [manualPriority, setManualPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [manualHours, setManualHours] = useState("2");

  // Dynamic Gemini explanations states
  const [riskExplanations, setRiskExplanations] = useState<Record<string, string>>({});
  const [loadingExplanations, setLoadingExplanations] = useState<Record<string, boolean>>({});

  const handleExplainRisk = async (taskId: string) => {
    try {
      setLoadingExplanations(prev => ({ ...prev, [taskId]: true }));
      const res = await fetch(`/api/tasks/${taskId}/explain-risk`);
      if (res.ok) {
        const data = await res.json();
        setRiskExplanations(prev => ({ ...prev, [taskId]: data.explanation }));
      } else {
        setRiskExplanations(prev => ({ ...prev, [taskId]: "Failed to connect with Risk Predictor." }));
      }
    } catch (err) {
      console.error(err);
      setRiskExplanations(prev => ({ ...prev, [taskId]: "Network link offline." }));
    } finally {
      setLoadingExplanations(prev => ({ ...prev, [taskId]: false }));
    }
  };

  // Local validation and submit handler
  const handleNlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlInput.trim()) return;
    onAddTask({ text: nlInput });
    setNlInput("");
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim() || !manualDeadline) return;
    onAddTask({
      title: manualTitle,
      deadline: new Date(manualDeadline).toISOString(),
      priority: manualPriority,
      estimatedHours: Number(manualHours) || 2
    });
    // Reset manual form
    setManualTitle("");
    setManualDeadline("");
    setManualPriority("medium");
    setManualHours("2");
  };

  const activeTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  // Sorting active tasks by risk index to show priority alerts
  const priorityRankedTasks = [...activeTasks].sort((a, b) => b.riskIndex - a.riskIndex);

  // Formatting helpers
  const formatDeadline = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case "critical":
        return "text-pink-400 border-pink-500/35 bg-pink-500/10";
      case "high":
        return "text-orange-400 border-orange-500/35 bg-orange-500/10";
      case "medium":
        return "text-yellow-400 border-yellow-500/35 bg-yellow-500/10";
      default:
        return "text-cyan-400 border-cyan-500/35 bg-cyan-500/10";
    }
  };

  const getRiskLevelBadgeClass = (category: string) => {
    switch (category) {
      case "critical":
        return "text-pink-500 border-pink-500/20 bg-pink-500/10 shadow-[0_0_10px_rgba(236,72,153,0.15)]";
      case "high":
        return "text-orange-400 border-orange-400/20 bg-orange-400/10";
      case "medium":
        return "text-yellow-400 border-yellow-400/20 bg-yellow-400/10";
      default:
        return "text-cyan-400 border-cyan-500/20 bg-cyan-500/10";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-black tracking-tight text-white uppercase">
          Registry Command Panel
        </h1>
        <p className="text-[#94a3b8] text-xs mt-1">
          Deploy new tasks through AI parsing or standard manual console arrays.
        </p>
      </div>

      {/* Grid: Form Entry Panel */}
      <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
        {/* Decorative Grid background */}
        <div className="absolute inset-0 cyber-dots opacity-15 pointer-events-none" />

        {/* Form headers / Tab Switcher */}
        <div className="flex justify-between items-center border-b border-white/8 pb-4 mb-5 relative z-10">
          <div className="flex gap-2">
            <button
              id="entry-mode-nl-btn"
              onClick={() => setEntryMode("nl")}
              className={`px-4 py-2 rounded-xl font-display text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                entryMode === "nl"
                  ? "bg-white/4 border border-[#00f3ff]/20 text-[#00f3ff] shadow-[0_0_15px_rgba(0,243,255,0.05)]"
                  : "border border-transparent text-[#94a3b8] hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Natural Language Entry
            </button>
            <button
              id="entry-mode-manual-btn"
              onClick={() => setEntryMode("manual")}
              className={`px-4 py-2 rounded-xl font-display text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                entryMode === "manual"
                  ? "bg-white/4 border border-[#ff00c8]/20 text-[#ff00c8] shadow-[0_0_15px_rgba(255,0,200,0.05)]"
                  : "border border-transparent text-[#94a3b8] hover:text-white"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Manual Input Console
            </button>
          </div>
          <span className="font-mono text-[9px] text-[#00f3ff] tracking-widest hidden sm:inline uppercase">Entry_Module_Active</span>
        </div>

        {/* Natural Language Entry Screen */}
        {entryMode === "nl" && (
          <form onSubmit={handleNlSubmit} className="space-y-4 relative z-10">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[#94a3b8] uppercase tracking-widest block">
                Command Text Input (NL Extraction):
              </label>
              <p className="text-[11px] text-slate-400 leading-relaxed italic mb-2">
                Example: "Review design spec document tomorrow afternoon, high importance, 4 hours work"
              </p>
              <div className="relative group">
                <input
                  type="text"
                  id="nl-task-input"
                  value={nlInput}
                  onChange={(e) => setNlInput(e.target.value)}
                  placeholder="Finish AI project by Friday night, around 8 hours work..."
                  disabled={isAddingTask}
                  className="w-full bg-[#05070a]/90 border border-white/8 focus:border-[#00f3ff]/40 rounded-xl px-5 py-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all duration-300 focus:shadow-[0_0_15px_rgba(0,243,255,0.05)] font-sans"
                />
                <button
                  type="submit"
                  id="nl-task-submit-btn"
                  disabled={isAddingTask || !nlInput.trim()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg bg-[#00f3ff] text-slate-950 font-bold hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 text-xs tracking-wider uppercase font-display cursor-pointer shadow-[0_0_10px_rgba(0,243,255,0.2)]"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isAddingTask ? "Extracting..." : "Analyze"}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Manual Input Entry Screen */}
        {entryMode === "manual" && (
          <form onSubmit={handleManualSubmit} className="space-y-4 relative z-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[#94a3b8] uppercase tracking-widest block">Task Title</label>
                <input
                  type="text"
                  id="manual-title-input"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="Enter deliverable..."
                  required
                  className="w-full bg-[#05070a]/90 border border-white/8 focus:border-[#ff00c8]/40 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:shadow-[0_0_10px_rgba(255,0,200,0.05)] transition-all"
                />
              </div>

              {/* Deadline */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[#94a3b8] uppercase tracking-widest block">Target Deadline</label>
                <input
                  type="datetime-local"
                  id="manual-deadline-input"
                  value={manualDeadline}
                  onChange={(e) => setManualDeadline(e.target.value)}
                  required
                  className="w-full bg-[#05070a]/90 border border-white/8 focus:border-[#ff00c8]/40 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:shadow-[0_0_10px_rgba(255,0,200,0.05)] transition-all font-mono"
                />
              </div>

              {/* Priority */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[#94a3b8] uppercase tracking-widest block">Priority Rank</label>
                <select
                  id="manual-priority-input"
                  value={manualPriority}
                  onChange={(e) => setManualPriority(e.target.value as any)}
                  className="w-full bg-[#05070a]/90 border border-white/8 focus:border-[#ff00c8]/40 rounded-xl px-4 py-3 text-xs text-slate-100 focus:outline-none focus:shadow-[0_0_10px_rgba(255,0,200,0.05)] transition-all font-mono"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="critical">Critical Priority</option>
                </select>
              </div>

              {/* Estimated Hours */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[#94a3b8] uppercase tracking-widest block">Work Hours</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    id="manual-hours-input"
                    value={manualHours}
                    onChange={(e) => setManualHours(e.target.value)}
                    min="1"
                    max="100"
                    className="w-full bg-[#05070a]/90 border border-white/8 focus:border-[#ff00c8]/40 rounded-xl px-4 py-3 text-xs text-slate-100 focus:outline-none focus:shadow-[0_0_10px_rgba(255,0,200,0.05)] transition-all font-mono"
                  />
                  <button
                    type="submit"
                    id="manual-submit-btn"
                    disabled={isAddingTask || !manualTitle.trim() || !manualDeadline}
                    className="px-4 bg-[#ff00c8] text-slate-950 hover:brightness-110 font-bold font-display rounded-xl text-xs uppercase tracking-wider transition-all shrink-0 flex items-center justify-center cursor-pointer shadow-[0_0_10px_rgba(255,0,200,0.2)]"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Interactive AI Critical Path Highlight */}
      {priorityRankedTasks.length > 0 && (
        <div className="p-4 rounded-2xl border border-[#ff00c8]/20 bg-[#ff00c8]/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#ff00c8]/10 border border-[#ff00c8]/20 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-[#ff00c8] animate-bounce" />
            </div>
            <div>
              <p className="text-[#ff00c8] font-bold uppercase tracking-widest">TACTICAL INTERCEPT WARNING</p>
              <p className="text-[#94a3b8] mt-0.5 font-sans">
                Immediate path correction suggested: <strong className="text-white">"{priorityRankedTasks[0].title}"</strong> is trending at <strong className="text-[#ff00c8]">{priorityRankedTasks[0].riskIndex}%</strong> delay probability.
              </p>
            </div>
          </div>
          <button
            onClick={() => onUpdateTask(priorityRankedTasks[0].id, { completed: true })}
            className="px-3.5 py-1.5 rounded-lg border border-[#ff00c8]/30 text-[#ff00c8] bg-white/[0.02] hover:bg-[#ff00c8] hover:text-slate-950 font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer self-end md:self-auto text-[10px]"
          >
            Mark Handled
          </button>
        </div>
      )}

      {/* Task List Workspace */}
      <div className="grid grid-cols-1 gap-4">
        {/* Active Registry */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-white/8 pb-2">
            <ListTodo className="w-4 h-4 text-[#00f3ff]" />
            <h3 className="font-display font-bold text-white text-sm uppercase tracking-wider">Active Deliverable Queue</h3>
            <span className="ml-2 font-mono text-[10px] text-[#94a3b8]">({activeTasks.length} Targets)</span>
          </div>

          {activeTasks.length === 0 ? (
            <div className="text-center p-12 rounded-2xl border border-dashed border-white/8 bg-white/[0.01] text-[#94a3b8]">
              <CheckCircle className="w-10 h-10 text-teal-400 mx-auto mb-2.5 animate-pulse" />
              <p className="font-display font-bold text-slate-200">No active tasks in current database.</p>
              <p className="text-xs text-[#94a3b8] mt-1">Use the entry console above to dispatch new milestones.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeTasks.map((task) => (
                <div
                  key={task.id}
                  id={`task-item-${task.id}`}
                  className="glass-panel rounded-2xl p-5 border-l-4 border-l-[#00f3ff] transition-all duration-300 hover:border-l-[#ff00c8] relative group overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#00f3ff]/2 blur-3xl pointer-events-none" />

                  {/* Top line of task */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      {/* Checkbox */}
                      <button
                        id={`complete-task-${task.id}`}
                        onClick={() => onUpdateTask(task.id, { completed: true })}
                        className="w-5 h-5 rounded-full border border-[#00f3ff]/30 hover:border-[#ff00c8] bg-[#05070a] flex items-center justify-center shrink-0 cursor-pointer transition-colors mt-1 hover:bg-[#00f3ff]/10 group-hover:shadow-[0_0_8px_rgba(0,243,255,0.3)]"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-transparent hover:text-[#00f3ff] transition-colors" />
                      </button>

                      {/* Info block */}
                      <div className="space-y-1.5">
                        <h4 className="font-display text-sm font-bold text-white tracking-tight leading-tight">
                          {task.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                          <span className="text-[#94a3b8] uppercase">DUE:</span>
                          <span className="text-slate-200 border border-white/8 bg-[#05070a]/90 px-2 py-0.5 rounded flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#00f3ff]" />
                            {formatDeadline(task.deadline)}
                          </span>

                          <span className={`border px-2 py-0.5 rounded font-bold uppercase tracking-wider ${getPriorityBadgeClass(task.priority)}`}>
                            {task.priority} Priority
                          </span>

                          <span className="text-slate-300 border border-white/8 bg-[#05070a]/90 px-2 py-0.5 rounded">
                            {task.estimatedHours} Hours
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Threat indicator badging */}
                    <div className="text-right shrink-0">
                      <span className={`border px-2.5 py-1 rounded-xl text-[10px] font-mono font-extrabold flex items-center gap-1.5 uppercase ${getRiskLevelBadgeClass(task.riskCategory)}`}>
                        <Clock className="w-3 h-3 text-[#ff00c8] animate-pulse" />
                        <span>{task.riskIndex}% {task.riskCategory}</span>
                      </span>

                      <button
                        id={`delete-task-${task.id}`}
                        onClick={() => onDeleteTask(task.id)}
                        className="text-slate-500 hover:text-[#ff00c8] transition-colors p-1.5 mt-2 rounded-lg hover:bg-[#ff00c8]/10 cursor-pointer inline-block"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* AI Risk Mitigation Diagnostics */}
                  <div className="mt-4 border-t border-white/5 pt-3 flex flex-col sm:flex-row gap-3 font-mono text-[11px] leading-relaxed">
                    <div className="flex-1 bg-white/[0.01] p-2.5 rounded-xl border border-white/8 text-slate-400">
                      <div className="text-[#00f3ff]/80 font-bold mb-0.5 uppercase tracking-wider flex items-center gap-1">
                        <CornerDownRight className="w-3.5 h-3.5 text-[#00f3ff]" />
                        <span>AI Threat Analysis:</span>
                      </div>
                      <p className="font-sans text-[11px] text-[#94a3b8] leading-normal mt-1">{task.riskReason}</p>
                    </div>

                    <div className="flex-1 bg-white/[0.01] p-2.5 rounded-xl border border-white/8 text-slate-400">
                      <div className="text-[#ff00c8]/80 font-bold mb-0.5 uppercase tracking-wider flex items-center gap-1">
                        <CornerDownRight className="w-3.5 h-3.5 text-[#ff00c8]" />
                        <span>Mitigation Action:</span>
                      </div>
                      <p className="font-sans text-[11px] text-[#94a3b8] leading-normal mt-1">{task.recommendedAction}</p>
                    </div>
                  </div>

                  {/* Dynamic Risk Explanation Deep Dive Block */}
                  <div className="mt-3.5 pt-3 border-t border-white/5 flex flex-col gap-2">
                    <div className="flex items-center">
                      <button
                        onClick={() => handleExplainRisk(task.id)}
                        disabled={loadingExplanations[task.id]}
                        className="text-[10px] font-mono text-[#00f3ff] hover:text-[#ff00c8] flex items-center gap-1.5 transition-colors cursor-pointer border border-[#00f3ff]/20 bg-[#00f3ff]/5 px-2.5 py-1 rounded-lg disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#00f3ff] animate-pulse" />
                        <span>{loadingExplanations[task.id] ? "Analyzing Risk Factors..." : "Why Is This Task At Risk?"}</span>
                      </button>
                    </div>

                    {riskExplanations[task.id] && (
                      <div className="p-3 rounded-xl border border-[#00f3ff]/25 bg-[#00f3ff]/5 font-mono text-[11px] leading-relaxed animate-fade-in text-cyan-300">
                        <div className="text-[#00f3ff]/90 font-bold mb-1 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#00f3ff]" />
                          <span>AI Real-time Threat Analysis Deep Dive:</span>
                        </div>
                        <p className="font-sans text-[11px] text-[#94a3b8] leading-normal">{riskExplanations[task.id]}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Archive */}
        {completedTasks.length > 0 && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-2 border-b border-white/8 pb-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <h3 className="font-display font-bold text-slate-400 text-sm uppercase tracking-wider">Mission Archive</h3>
              <span className="ml-2 font-mono text-[10px] text-slate-600">({completedTasks.length} Completed)</span>
            </div>

            <div className="space-y-2 opacity-50 hover:opacity-80 transition-opacity">
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 rounded-xl border border-white/8 bg-[#05070a]/40 flex items-center justify-between gap-4 font-mono text-xs text-slate-400"
                >
                  <div className="flex items-center gap-3.5 truncate">
                    <button
                      id={`uncomplete-task-${task.id}`}
                      onClick={() => onUpdateTask(task.id, { completed: false })}
                      className="w-5 h-5 rounded-full border border-emerald-500 bg-emerald-500/10 flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    </button>
                    <div className="truncate">
                      <p className="font-display text-xs font-bold text-slate-300 line-through truncate leading-none">
                        {task.title}
                      </p>
                      <p className="text-[9px] text-slate-500 mt-1">
                        Completed at: {new Date(task.completedAt || "").toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <button
                    id={`delete-completed-task-${task.id}`}
                    onClick={() => onDeleteTask(task.id)}
                    className="text-slate-600 hover:text-[#ff00c8] transition-colors p-1 rounded cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
