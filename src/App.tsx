import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar.tsx";
import DashboardView from "./components/DashboardView.tsx";
import TaskView from "./components/TaskView.tsx";
import CoachView from "./components/CoachView.tsx";
import { ITask, IChatMessage, IDashboardAnalytics, IDbStatus } from "./types";
import { ShieldAlert, RefreshCw } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Core telemetries
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [chats, setChats] = useState<IChatMessage[]>([]);
  const [analytics, setAnalytics] = useState<IDashboardAnalytics>({
    overallRiskIndex: 25,
    burnoutScore: 20,
    burnoutRiskLevel: "low",
    completionProbability: 90,
    delayProbability: 10,
    mostCriticalTaskId: "",
    availableCapacity: 30,
    dailyActionPlan: ["Booting tactical arrays... Waiting for registry logs."],
    recs: {
      priorities: ["Load database registry"],
      improvements: ["Connect telemetry links"],
      warnings: ["No warnings detected yet"],
      advice: ["Keep cognitive buffer ready"]
    },
    aiConfidenceScore: 92,
    commandBrief: {
      todayObjective: "Initialize task registry systems and run scheduling diagnostics.",
      currentRisk: "Nominal workload thresholds detected.",
      recommendedFocus: "Review pending deliverable queues and calibrate deadlines.",
      estimatedCompletion: "Awaiting scheduler inputs..."
    }
  });

  const [dbStatus, setDbStatus] = useState<IDbStatus>({
    mode: "Local JSON Storage",
    connected: false
  });

  // Action loaders
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Synchronous Fetch Handler
  const fetchAllTelemetry = async () => {
    try {
      setApiError(null);
      // Fetch DB status
      const dbRes = await fetch("/api/db-status");
      if (dbRes.ok) {
        const dbData = await dbRes.json();
        setDbStatus(dbData);
      }

      // Fetch Tasks
      const tasksRes = await fetch("/api/tasks");
      if (!tasksRes.ok) throw new Error("Failed to link with task telemetry.");
      const tasksData = await tasksRes.json();
      setTasks(tasksData);

      // Fetch Chats
      const chatsRes = await fetch("/api/chats");
      if (chatsRes.ok) {
        const chatsData = await chatsRes.json();
        setChats(chatsData);
      }

      // Fetch Analytics
      const analRes = await fetch("/api/analytics");
      if (!analRes.ok) throw new Error("Failed to fetch scheduling calculations.");
      const analData = await analRes.json();
      setAnalytics(analData);

    } catch (err: any) {
      console.error("Telemetry link offline:", err);
      setApiError(err.message || "Express API server connection failed. Make sure the backend server is online.");
    } finally {
      setIsLoading(false);
    }
  };

  // Run on mount
  useEffect(() => {
    fetchAllTelemetry();
  }, []);

  // Task: Add Deliverable (Natural or Manual)
  const handleAddTask = async (payload: { text?: string; title?: string; deadline?: string; priority?: string; estimatedHours?: number }) => {
    try {
      setIsAddingTask(true);
      setApiError(null);
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to dispatch task.");
      }
      // Re-fetch everything to sync state and update AI analytics
      await fetchAllTelemetry();
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "Could not register new task.");
    } finally {
      setIsAddingTask(false);
    }
  };

  // Task: Update properties (Toggle completion/risk indexes)
  const handleUpdateTask = async (id: string, updates: Partial<ITask>) => {
    try {
      setApiError(null);
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error("Failed to execute updates on task target.");
      await fetchAllTelemetry();
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "Failed to edit task properties.");
    }
  };

  // Task: Purge Deliverable
  const handleDeleteTask = async (id: string) => {
    try {
      setApiError(null);
      const res = await fetch(`/api/tasks/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to purge task.");
      await fetchAllTelemetry();
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "Failed to delete task.");
    }
  };

  // Coach: Ask questions
  const handleSendMessage = async (userMsg: string) => {
    try {
      setIsSendingChat(true);
      setApiError(null);
      
      // Instantly append user's typed message locally for lagless UX
      const localUserMsg: IChatMessage = {
        id: `chat-temp-user-${Date.now()}`,
        role: "user",
        text: userMsg,
        timestamp: new Date().toISOString()
      };
      setChats((prev) => [...prev, localUserMsg]);

      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg })
      });
      if (!res.ok) throw new Error("Failed to receive feedback from Coach.");
      const data = await res.json();
      
      // Replace temp with real server logs
      setChats((prev) => prev.filter(c => !c.id.startsWith("chat-temp-")).concat(data.modelMessage));
      
      // Update analytics recommendation state
      const analRes = await fetch("/api/analytics");
      if (analRes.ok) {
        const analData = await analRes.json();
        setAnalytics(analData);
      }
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "Chat transmission lost.");
    } finally {
      setIsSendingChat(false);
    }
  };

  // Coach: Clear History
  const handleClearChats = async () => {
    try {
      setApiError(null);
      const res = await fetch("/api/chats/clear", {
        method: "POST"
      });
      if (!res.ok) throw new Error("Failed to wipe chats.");
      await fetchAllTelemetry();
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "Failed to clean history files.");
    }
  };

  // Autonomous Smart Balancing Agent Trigger
  const handleReschedule = async () => {
    try {
      setIsRescheduling(true);
      setApiError(null);
      const res = await fetch("/api/reschedule", {
        method: "POST"
      });
      if (!res.ok) throw new Error("Scheduling Agent failed to execute calculations.");
      const data = await res.json();
      
      // Fetch full telemetry to show newly suggested dates
      await fetchAllTelemetry();
      
      // Log model explanation in Chat Coach for continuity
      if (data.explanation) {
        const coachMsg: IChatMessage = {
          id: `chat-agent-explain-${Date.now()}`,
          role: "model",
          text: `**AUTONOMOUS RESCHEDULE BALANCING RESOLVED:**\n${data.explanation}`,
          timestamp: new Date().toISOString()
        };
        setChats((prev) => [...prev, coachMsg]);
      }
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "Failed to align scheduling targets.");
    } finally {
      setIsRescheduling(false);
    }
  };

  return (
    <div className="w-screen h-screen flex bg-[#05070a] immersive-bg text-slate-100 font-sans antialiased overflow-hidden scanlines">
      {/* Background Glowing Vector Blobs */}
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-[#00f3ff]/2 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#ff00c8]/2 blur-[120px] rounded-full pointer-events-none" />

      {/* Main Sidebar Layout */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        dbStatus={dbStatus}
        onReschedule={handleReschedule}
        isRescheduling={isRescheduling}
        tasksCount={tasks.filter((t) => !t.completed).length}
      />

      {/* Central Command Workspace */}
      <main className="flex-1 h-full flex flex-col overflow-hidden relative">
        {/* Subtle top scan overlay */}
        <div className="absolute inset-0 cyber-dots opacity-10 pointer-events-none" />

        {/* Global API Error Alert Banner */}
        {apiError && (
          <div className="bg-pink-950/80 border-b border-pink-500/30 text-pink-300 px-6 py-3 flex items-center justify-between gap-4 font-mono text-xs z-30 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-pink-400 animate-pulse" />
              <span>COMMAND EXCEPTION DETECTED: {apiError}</span>
            </div>
            <button
              onClick={fetchAllTelemetry}
              className="px-3 py-1 bg-pink-500 text-slate-950 font-bold hover:bg-pink-400 transition-colors rounded uppercase text-[10px] cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Retry Sync
            </button>
          </div>
        )}

        {/* Workspace views router container */}
        <div className="flex-1 overflow-y-auto px-8 py-6 relative z-10">
          {isLoading ? (
            <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 rounded-xl border border-cyan-500/35 border-t-cyan-400 animate-spin flex items-center justify-center bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                <ShieldAlert className="w-5 h-5 text-cyan-400" />
              </div>
              <p className="font-mono text-xs text-cyan-400/80 uppercase tracking-widest animate-pulse">
                Synchronizing Command Center Telemetry...
              </p>
            </div>
          ) : (
            <>
              {activeTab === "dashboard" && (
                <DashboardView
                  tasks={tasks}
                  analytics={analytics}
                  onNavigateToTasks={() => setActiveTab("tasks")}
                  onNavigateToCoach={() => setActiveTab("coach")}
                  onReschedule={handleReschedule}
                  isRescheduling={isRescheduling}
                />
              )}

              {activeTab === "tasks" && (
                <TaskView
                  tasks={tasks}
                  onAddTask={handleAddTask}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                  isAddingTask={isAddingTask}
                />
              )}

              {activeTab === "coach" && (
                <CoachView
                  chats={chats}
                  tasks={tasks}
                  analytics={analytics}
                  onSendMessage={handleSendMessage}
                  onClearChats={handleClearChats}
                  isSendingChat={isSendingChat}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
