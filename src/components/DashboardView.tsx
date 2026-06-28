import React from "react";
import {
  AlertTriangle,
  Zap,
  CheckCircle,
  Calendar,
  Flame,
  Gauge,
  Lightbulb,
  Clock,
  ArrowRight,
  Activity,
  Sparkles
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
  Cell
} from "recharts";
import { ITask, IDashboardAnalytics } from "../types";

interface DashboardViewProps {
  tasks: ITask[];
  analytics: IDashboardAnalytics;
  onNavigateToTasks: () => void;
  onNavigateToCoach: () => void;
  onReschedule: () => void;
  isRescheduling: boolean;
}

export default function DashboardView({
  tasks,
  analytics,
  onNavigateToTasks,
  onNavigateToCoach,
  onReschedule,
  isRescheduling
}: DashboardViewProps) {
  const activeTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  // 1. Calculate dynamic chart data: Workload hours per day for the next 7 days
  const getWorkloadData = () => {
    const data = [];
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const now = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toDateString();
      const dayName = days[date.getDay()];

      // Filter tasks due on this day
      const dailyTasks = activeTasks.filter((t) => {
        const tDate = new Date(t.deadline);
        return tDate.toDateString() === dateStr;
      });

      const totalHours = dailyTasks.reduce((sum, t) => sum + t.estimatedHours, 0);

      data.push({
        name: i === 0 ? "Today" : `${dayName} ${date.getDate()}`,
        hours: totalHours,
        taskCount: dailyTasks.length,
      });
    }
    return data;
  };

  // 2. Calculate dynamic chart data: Deadline Proximity vs. Risk Index
  const getRiskTrendData = () => {
    const sorted = [...activeTasks]
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 6);

    return sorted.map((t) => {
      const due = new Date(t.deadline);
      return {
        taskName: t.title.length > 20 ? t.title.slice(0, 18) + "..." : t.title,
        risk: t.riskIndex,
        hours: t.estimatedHours,
      };
    });
  };

  const workloadData = getWorkloadData();
  const riskTrendData = getRiskTrendData();

  // Find most critical task
  const criticalTask = activeTasks.find((t) => t.id === analytics.mostCriticalTaskId);

  // Helper for color categorization
  const getRiskColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "critical":
        return "text-pink-500 border-pink-500/20 bg-pink-500/10";
      case "high":
        return "text-orange-400 border-orange-400/20 bg-orange-400/10";
      case "medium":
        return "text-yellow-400 border-yellow-400/20 bg-yellow-400/10";
      default:
        return "text-cyan-400 border-cyan-500/20 bg-cyan-500/10";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative z-10 pb-12">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight text-white uppercase">
            Systems Overview
          </h1>
          <p className="text-[#94a3b8] text-xs mt-1">
            Operational status: <span className="text-[#00f3ff] font-bold">Optimal</span> • Tracking {activeTasks.length} active cognitive targets
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="user-badge flex items-center gap-2.5 bg-white/4 px-4 py-2 rounded-full border border-white/8 text-xs font-mono font-bold text-white">
            <div className="w-5 h-5 bg-[#ff00c8] rounded-full shadow-[0_0_8px_#ff00c8] shrink-0" />
            <span>ARCHITECT_01</span>
          </div>
          <span className="font-mono text-xs text-[#00f3ff] border border-white/8 bg-white/[0.02] px-3.5 py-2 rounded-xl flex items-center gap-2 shadow-[0_0_10px_rgba(0,243,255,0.05)]">
            <Clock className="w-3.5 h-3.5 text-[#ff00c8]" />
            {new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          </span>
        </div>
      </div>

      {/* AI Command Brief Widget */}
      {analytics.commandBrief && (
        <div className="glass-panel rounded-2xl p-5 border-l-4 border-l-[#ff00c8] relative overflow-hidden">
          <div className="absolute inset-0 cyber-dots opacity-15 pointer-events-none" />
          <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2.5 relative z-10">
            <Sparkles className="w-4 h-4 text-[#ff00c8] animate-pulse" />
            <h3 className="font-display font-bold text-xs text-white tracking-widest uppercase">AI COMMAND BRIEF</h3>
            <span className="ml-auto font-mono text-[9px] text-[#00f3ff] border border-[#00f3ff]/25 bg-[#00f3ff]/10 px-2.5 py-0.5 rounded-full">SECURE_INTEL</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10 text-xs font-mono">
            <div className="p-3 bg-white/[0.01] rounded-xl border border-white/5">
              <span className="text-[#94a3b8] text-[9px] uppercase tracking-widest block mb-1">Today's Objective</span>
              <span className="font-sans text-xs font-bold text-white leading-relaxed block">{analytics.commandBrief.todayObjective}</span>
            </div>

            <div className="p-3 bg-white/[0.01] rounded-xl border border-white/5">
              <span className="text-[#94a3b8] text-[9px] uppercase tracking-widest block mb-1">Current Risk</span>
              <span className="font-sans text-xs font-bold text-[#ff00c8] leading-relaxed block">{analytics.commandBrief.currentRisk}</span>
            </div>

            <div className="p-3 bg-white/[0.01] rounded-xl border border-white/5">
              <span className="text-[#94a3b8] text-[9px] uppercase tracking-widest block mb-1">Recommended Focus</span>
              <span className="font-sans text-xs font-bold text-[#00f3ff] leading-relaxed block">{analytics.commandBrief.recommendedFocus}</span>
            </div>

            <div className="p-3 bg-white/[0.01] rounded-xl border border-white/5">
              <span className="text-[#94a3b8] text-[9px] uppercase tracking-widest block mb-1">Estimated Completion</span>
              <span className="font-sans text-xs font-bold text-white leading-relaxed block">{analytics.commandBrief.estimatedCompletion}</span>
            </div>
          </div>
        </div>
      )}

      {/* Row 1: Core Gauges (Bento Style) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Deadline Risk Index */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between relative group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#00f3ff]/5 blur-2xl rounded-full pointer-events-none group-hover:bg-[#00f3ff]/10 transition-colors" />
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-[11px] text-[#94a3b8] tracking-widest uppercase">Risk Index</span>
            <Gauge className="w-4 h-4 text-[#00f3ff] animate-pulse" />
          </div>

          <div className="text-center my-4">
            <div className="text-5xl font-black text-[#00f3ff] text-shadow-neon font-display tracking-tight">
              {analytics.overallRiskIndex}%
            </div>
            <div className={`text-[10px] font-mono font-bold mt-2.5 uppercase tracking-widest ${
              analytics.overallRiskIndex > 75 ? "text-[#ff00c8] animate-pulse" : "text-[#94a3b8]"
            }`}>
              {analytics.overallRiskIndex > 75 ? "CRITICAL THRESHOLD" : "OPERATIONAL STATUS"}
            </div>
          </div>

          <div className="border-t border-white/5 pt-3 mt-4 text-xs">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-[#94a3b8]">Core Blocker:</span>
              <button
                onClick={onNavigateToTasks}
                className="text-[#00f3ff] font-bold hover:underline flex items-center gap-1 cursor-pointer truncate max-w-[140px]"
              >
                {criticalTask ? criticalTask.title : "None Active"}
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Burnout Forecaster */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between relative group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#ff00c8]/5 blur-2xl rounded-full pointer-events-none group-hover:bg-[#ff00c8]/10 transition-colors" />
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-[11px] text-[#94a3b8] tracking-widest uppercase">Burnout Level</span>
            <Flame className="w-4 h-4 text-[#ff00c8]" />
          </div>

          <div className="my-2">
            <div className="text-2xl font-bold font-display text-white mt-1 capitalize leading-none">
              {analytics.burnoutRiskLevel === "low" ? "Minimal" : analytics.burnoutRiskLevel === "medium" ? "Moderate" : "Critical"}
            </div>
            
            {/* Horizontal Burnout Meter from design */}
            <div className="h-2 bg-white/10 rounded-full mt-4 overflow-hidden relative">
              <div
                className="h-full bg-[#ff00c8] rounded-full transition-all duration-1000 shadow-[0_0_12px_#ff00c8]"
                style={{ width: `${analytics.burnoutScore}%` }}
              />
            </div>

            <div className="mt-3.5 font-mono text-[10px] text-[#94a3b8] flex justify-between">
              <span>SCORE: {analytics.burnoutScore}%</span>
              <span>WORKLOAD: {activeTasks.reduce((s, t) => s + t.estimatedHours, 0)}h QUEUED</span>
            </div>
          </div>

          <div className="border-t border-white/5 pt-3 mt-4 text-xs">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-[#94a3b8]">Break Plan:</span>
              <span className="text-[#ff00c8] font-mono font-bold">
                {analytics.burnoutScore > 60 ? "EMERGENCY BUFFER" : "50/10 POMODORO"}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Task Velocity */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between relative group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/3 blur-2xl rounded-full pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-[11px] text-[#94a3b8] tracking-widest uppercase">Task Velocity</span>
            <CheckCircle className="w-4 h-4 text-[#00f3ff]" />
          </div>

          <div className="my-2">
            <div className="flex justify-between items-center mt-3">
              <div className="text-center">
                <div className="text-2xl font-bold font-display text-[#00f3ff]">
                  {completedTasks.length.toString().padStart(2, "0")}
                </div>
                <div className="text-[9px] font-mono font-bold text-[#94a3b8] tracking-widest mt-1">DONE</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold font-display text-[#ff00c8]">
                  {activeTasks.filter((t) => t.riskIndex > 50).length.toString().padStart(2, "0")}
                </div>
                <div className="text-[9px] font-mono font-bold text-[#94a3b8] tracking-widest mt-1">RISK</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold font-display text-white">
                  {activeTasks.length.toString().padStart(2, "0")}
                </div>
                <div className="text-[9px] font-mono font-bold text-[#94a3b8] tracking-widest mt-1">QUEUE</div>
              </div>
            </div>

            {/* Capacity status line */}
            <div className="mt-4 h-10 bg-white/[0.01] border border-dashed border-white/8 rounded-lg flex items-center justify-center font-mono text-[10px] text-[#94a3b8]">
              PIPELINE CAPACITY: {analytics.availableCapacity} HOURS AVAILABLE
            </div>
          </div>

          <div className="border-t border-white/5 pt-3 mt-4 text-xs">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-[#94a3b8]">Reschedule:</span>
              <button
                id="dashboard-optimize-btn"
                disabled={isRescheduling}
                onClick={onReschedule}
                className="text-[#00f3ff] font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                {isRescheduling ? "Aligning..." : "Run Balancing"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Row 1.5: Dynamic AI Diagnostics Bento */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Card 1: AI Confidence Score */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between relative group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 blur-2xl rounded-full pointer-events-none group-hover:bg-teal-500/10 transition-colors" />
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-[11px] text-[#94a3b8] tracking-widest uppercase">Confidence Score</span>
            <span className="text-[10px] font-mono text-teal-400 border border-teal-500/20 bg-teal-500/5 px-2 py-0.5 rounded-full">REALTIME_AI</span>
          </div>
          <div className="text-center my-2">
            <div className="text-4xl font-black text-teal-400 text-shadow-neon font-display tracking-tight">
              {analytics.aiConfidenceScore}%
            </div>
            <div className="text-[10px] font-mono font-bold mt-2 text-[#94a3b8] uppercase tracking-widest">
              MODEL CERTAINTY
            </div>
          </div>
          <div className="border-t border-white/5 pt-2 text-[10px] text-[#94a3b8] font-mono">
            Optimized workload calibration
          </div>
        </div>

        {/* Card 2: Completion Probability */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between relative group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#00f3ff]/5 blur-2xl rounded-full pointer-events-none group-hover:bg-[#00f3ff]/10 transition-colors" />
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-[11px] text-[#94a3b8] tracking-widest uppercase">Completion Prob</span>
            <span className="text-[10px] font-mono text-[#00f3ff] border border-[#00f3ff]/20 bg-[#00f3ff]/5 px-2 py-0.5 rounded-full">SUCCESS_RATE</span>
          </div>
          <div className="text-center my-2">
            <div className="text-4xl font-black text-[#00f3ff] text-shadow-neon font-display tracking-tight">
              {analytics.completionProbability}%
            </div>
            <div className="text-[10px] font-mono font-bold mt-2 text-[#94a3b8] uppercase tracking-widest">
              ON-TIME FORECAST
            </div>
          </div>
          <div className="border-t border-white/5 pt-2 text-[10px] text-[#94a3b8] font-mono">
            Deliverable completion index
          </div>
        </div>

        {/* Card 3: Delay Probability */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between relative group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#ff00c8]/5 blur-2xl rounded-full pointer-events-none group-hover:bg-[#ff00c8]/10 transition-colors" />
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-[11px] text-[#94a3b8] tracking-widest uppercase">Delay Prob</span>
            <span className="text-[10px] font-mono text-[#ff00c8] border border-[#ff00c8]/20 bg-[#ff00c8]/5 px-2 py-0.5 rounded-full">RISK_RATING</span>
          </div>
          <div className="text-center my-2">
            <div className="text-4xl font-black text-[#ff00c8] text-shadow-neon font-display tracking-tight">
              {analytics.delayProbability}%
            </div>
            <div className="text-[10px] font-mono font-bold mt-2 text-[#94a3b8] uppercase tracking-widest">
              SLIPPAGE RATIO
            </div>
          </div>
          <div className="border-t border-white/5 pt-2 text-[10px] text-[#94a3b8] font-mono">
            Schedule variance factor
          </div>
        </div>

        {/* Card 4: Most Critical Task */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between relative group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 blur-2xl rounded-full pointer-events-none group-hover:bg-yellow-500/10 transition-colors" />
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-[11px] text-[#94a3b8] tracking-widest uppercase">Most Critical Task</span>
            <span className="text-[10px] font-mono text-yellow-400 border border-yellow-500/20 bg-yellow-500/5 px-2 py-0.5 rounded-full">BLOCKER_01</span>
          </div>
          <div className="my-1.5 min-h-[50px] flex flex-col justify-center">
            {criticalTask ? (
              <button
                onClick={onNavigateToTasks}
                className="font-sans text-xs font-bold text-yellow-400 hover:underline leading-tight text-left cursor-pointer transition-colors block mb-1 truncate"
              >
                {criticalTask.title}
              </button>
            ) : (
              <span className="font-mono text-xs text-[#94a3b8]">No Active Threat</span>
            )}
            <div className="text-[9px] font-mono text-[#94a3b8] uppercase mt-1">
              RISK RANKING: {criticalTask ? `${criticalTask.riskIndex}% ${criticalTask.riskCategory}` : "N/A"}
            </div>
          </div>
          <div className="border-t border-white/5 pt-2 text-[10px] text-[#94a3b8] font-mono">
            Requires immediate scheduling focus
          </div>
        </div>
      </div>

      {/* Row 2: AI Recommended Panel (Detailed Custom Segment with left borders from design) */}
      <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
        {/* Glowing cyber grid decoration */}
        <div className="absolute inset-0 cyber-dots opacity-25 pointer-events-none" />
        <div className="absolute top-0 right-0 w-80 h-40 bg-[#ff00c8]/2 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-40 bg-[#00f3ff]/2 blur-3xl rounded-full pointer-events-none" />

        <div className="flex items-center gap-2 mb-6 border-b border-white/8 pb-4 relative z-10">
          <Lightbulb className="w-4 h-4 text-[#00f3ff] animate-pulse" />
          <h3 className="font-display font-bold text-sm text-white tracking-wider uppercase">AI Recommendations</h3>
          <span className="ml-auto font-mono text-[9px] text-[#ff00c8] border border-[#ff00c8]/20 bg-[#ff00c8]/10 px-2.5 py-0.5 rounded-full">REAL_TIME_AI_STREAM</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
          {/* Priorities */}
          <div className="space-y-3">
            <h4 className="font-mono text-[10px] font-bold text-[#00f3ff] uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00f3ff] shadow-[0_0_8px_#00f3ff]" />
              TOP PRIORITIES
            </h4>
            <div className="space-y-3">
              {analytics.recs.priorities.map((item, idx) => (
                <div key={idx} className="rec-item border-l-2 border-l-[#00f3ff] pl-3.5 py-0.5 text-xs text-[#94a3b8] leading-relaxed">
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Schedule Optimizations */}
          <div className="space-y-3">
            <h4 className="font-mono text-[10px] font-bold text-teal-400 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
              SCHEDULING GAINS
            </h4>
            <div className="space-y-3">
              {analytics.recs.improvements.map((item, idx) => (
                <div key={idx} className="rec-item border-l-2 border-l-teal-400 pl-3.5 py-0.5 text-xs text-[#94a3b8] leading-relaxed">
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Risk Alerts */}
          <div className="space-y-3">
            <h4 className="font-mono text-[10px] font-bold text-[#ff00c8] uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff00c8] shadow-[0_0_8px_#ff00c8]" />
              RISK ALERTS
            </h4>
            <div className="space-y-3">
              {analytics.recs.warnings.map((item, idx) => (
                <div key={idx} className="rec-item border-l-2 border-l-[#ff00c8] pl-3.5 py-0.5 text-xs text-[#94a3b8] leading-relaxed">
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Work Pace & Mental Health */}
          <div className="space-y-3">
            <h4 className="font-mono text-[10px] font-bold text-yellow-400 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
              PACING & WELLNESS
            </h4>
            <div className="space-y-3">
              {analytics.recs.advice.map((item, idx) => (
                <div key={idx} className="rec-item border-l-2 border-l-yellow-400 pl-3.5 py-0.5 text-xs text-[#94a3b8] leading-relaxed">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Recharts Analytical Sprints (Workload and Line charts) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Workload hours per day chart */}
        <div className="glass-panel rounded-2xl p-6 relative group overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display font-bold text-white text-sm uppercase tracking-wider">Workload Distribution</h3>
              <p className="text-[#94a3b8] text-xs mt-0.5">Sum of task estimated hours scheduled per day</p>
            </div>
            <Calendar className="w-4 h-4 text-[#00f3ff]" />
          </div>

          <div className="w-full h-64 font-mono text-[10px]">
            {activeTasks.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-white/8 rounded-xl bg-white/[0.01] text-[#94a3b8]">
                <CheckCircle className="w-8 h-8 text-[#00f3ff] mb-2 animate-pulse" />
                <span>Zero hours allocated for the next 7 days</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workloadData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "#05070a", borderColor: "rgba(255,255,255,0.08)", borderRadius: "8px" }}
                    itemStyle={{ color: "#00f3ff" }}
                    labelStyle={{ color: "#94a3b8", fontWeight: "bold" }}
                  />
                  <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                    {workloadData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.hours > 8 ? "url(#pinkGradient)" : "url(#cyanGradient)"}
                      />
                    ))}
                  </Bar>
                  <defs>
                    <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00f3ff" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#00f3ff" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="pinkGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff00c8" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#ff00c8" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Proximity Risk Level Chart */}
        <div className="glass-panel rounded-2xl p-6 relative group overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display font-bold text-white text-sm uppercase tracking-wider">Critical Path Threat Map</h3>
              <p className="text-[#94a3b8] text-xs mt-0.5">Calculated risk profile for nearest milestones</p>
            </div>
            <Activity className="w-4 h-4 text-[#ff00c8]" />
          </div>

          <div className="w-full h-64 font-mono text-[10px]">
            {activeTasks.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-white/8 rounded-xl bg-white/[0.01] text-[#94a3b8]">
                <CheckCircle className="w-8 h-8 text-[#ff00c8] mb-2 animate-pulse" />
                <span>All pipelines clear. Active risk is zero.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={riskTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="taskName" stroke="#64748b" fontSize={9} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ background: "#05070a", borderColor: "rgba(255,255,255,0.08)", borderRadius: "8px" }}
                    itemStyle={{ color: "#ff00c8" }}
                    labelStyle={{ color: "#94a3b8", fontWeight: "bold" }}
                  />
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                  <Line
                    type="monotone"
                    dataKey="risk"
                    stroke="#ff00c8"
                    strokeWidth={3}
                    dot={{ fill: "#ff00c8", stroke: "#fff", strokeWidth: 1.5, r: 3.5 }}
                    activeDot={{ r: 5, fill: "#ff00c8" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Row 4: Action Plan Board */}
      <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 border-b border-white/8 pb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#00f3ff] animate-pulse" />
            <h3 className="font-display font-bold text-white text-sm uppercase tracking-wider">AI Generated Tactical Action Plan</h3>
          </div>
          <button
            onClick={onNavigateToCoach}
            className="text-xs font-mono text-[#00f3ff] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer border border-[#00f3ff]/25 bg-[#00f3ff]/5 px-3 py-1.5 rounded-lg"
          >
            <span>Consult AI Coach</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#ff00c8]" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {analytics.dailyActionPlan.map((action, index) => (
            <div
              key={index}
              className="p-4 rounded-xl border border-white/8 bg-white/[0.01] relative group flex gap-3.5 hover:border-[#00f3ff]/30 transition-all duration-200"
            >
              <div className="w-7 h-7 rounded-lg font-mono text-xs font-bold text-[#00f3ff] border border-[#00f3ff]/20 bg-[#00f3ff]/10 flex items-center justify-center shrink-0">
                0{index + 1}
              </div>
              <p className="text-xs text-[#94a3b8] leading-relaxed mt-0.5">{action}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
