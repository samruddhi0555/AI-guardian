import React from "react";
import {
  Shield,
  LayoutDashboard,
  ListTodo,
  Bot,
  Zap,
  Database,
  Activity
} from "lucide-react";
import { IDbStatus } from "../types";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  dbStatus: IDbStatus;
  onReschedule: () => void;
  isRescheduling: boolean;
  tasksCount: number;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  dbStatus,
  onReschedule,
  isRescheduling,
  tasksCount
}: SidebarProps) {
  const tabs = [
    { id: "dashboard", label: "Tactical Desk", icon: LayoutDashboard },
    { id: "tasks", label: "Registry Control", icon: ListTodo, badge: tasksCount },
    { id: "coach", label: "AI Tactical Coach", icon: Bot }
  ];

  return (
    <aside className="w-64 h-full border-r border-white/8 bg-[#05070a]/80 backdrop-blur-xl flex flex-col justify-between p-6 shrink-0 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-[#00f3ff]/3 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-[#ff00c8]/3 blur-3xl pointer-events-none rounded-full" />

      {/* Brand Header */}
      <div className="relative z-10">
        <div className="flex items-center gap-2.5 mb-10 mt-2">
          <div className="w-2.5 h-2.5 bg-[#00f3ff] rounded-[2px] shadow-[0_0_10px_#00f3ff] shrink-0" />
          <h1 className="font-display font-black text-xs tracking-[2px] text-[#00f3ff] leading-none uppercase">
            GUARDIAN AI
          </h1>
        </div>

        {/* System Telemetry Segment */}
        <div className="p-4 rounded-xl border border-white/8 bg-white/[0.02] mb-8 font-mono text-[10px] leading-relaxed relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00f3ff]/40 to-transparent" />
          <div className="flex justify-between mb-2">
            <span className="text-[#94a3b8]">SYSTEM STATE:</span>
            <span className="text-[#00f3ff] font-bold animate-pulse">OPTIMAL</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-[#94a3b8]">TELEMETRY SYNC:</span>
            <span className="text-[#ff00c8]">CONNECTED</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#94a3b8]">DEFENSE RANGE:</span>
            <span className="text-white">GUARDIAN_SECURE</span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-btn-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 group font-sans text-[13px] ${
                  isActive
                    ? "bg-white/4 border border-[#00f3ff]/20 text-[#00f3ff] shadow-[0_0_15px_rgba(0,243,255,0.05)]"
                    : "border border-transparent text-[#94a3b8] hover:text-white hover:bg-white/2"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-transform duration-300 group-hover:scale-105 ${
                      isActive ? "text-[#00f3ff]" : "text-[#94a3b8] group-hover:text-[#00f3ff]"
                    }`}
                  />
                  <span>{tab.label}</span>
                </div>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                    isActive ? "bg-[#00f3ff]/10 text-[#00f3ff]" : "bg-white/5 text-[#94a3b8]"
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Action Footer */}
      <div className="space-y-4 relative z-10">
        {/* Rescheduling Agent Trigger */}
        <button
          id="sidebar-reschedule-btn"
          disabled={isRescheduling}
          onClick={onReschedule}
          className="w-full relative group overflow-hidden py-3 px-4 rounded-xl font-display font-bold text-xs uppercase tracking-wider text-slate-950 bg-gradient-to-r from-[#00f3ff] to-[#ff00c8] hover:brightness-110 active:scale-98 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-[0_0_15px_rgba(0,243,255,0.25)]"
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="flex items-center justify-center gap-2">
            <Zap className={`w-4 h-4 ${isRescheduling ? "animate-spin" : "animate-pulse"}`} />
            <span>{isRescheduling ? "Aligning..." : "Deploy Smart Agent"}</span>
          </div>
        </button>

        {/* Connected Database Badge */}
        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded flex items-center justify-center ${
              dbStatus.connected ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-[#00f3ff]/10 border border-[#00f3ff]/20"
            }`}>
              <Database className={`w-3.5 h-3.5 ${dbStatus.connected ? "text-emerald-400" : "text-[#00f3ff]"}`} />
            </div>
            <div>
              <p className="text-[9px] font-mono text-[#94a3b8] leading-none">DB ENGINE</p>
              <p className="text-[10px] font-mono font-bold text-slate-300 mt-1">{dbStatus.mode}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${dbStatus.connected ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-[#00f3ff] animate-pulse shadow-[0_0_8px_rgba(0,243,255,0.5)]"}`} />
            <span className="text-[8px] font-mono font-bold text-slate-400 uppercase">{dbStatus.connected ? "SYNC" : "LOCAL"}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
