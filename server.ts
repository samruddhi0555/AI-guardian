import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import {
  getTasks,
  saveTask,
  deleteTask,
  getChats,
  saveChat,
  clearChats,
  getDbStatus,
  ITask,
  IChatMessage
} from "./src/server/db.js";
import {
  extractTaskFromNL,
  analyzeTaskRisk,
  analyzeBurnoutAndRecs,
  rescheduleTasks,
  askCoach,
  explainTaskRisk
} from "./src/server/gemini.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // --------------------------------------------------
  // 1. API Endpoints
  // --------------------------------------------------

  // DB Connection and Fallback Status
  app.get("/api/db-status", async (req, res) => {
    try {
      const status = await getDbStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Fetch Tasks
  app.get("/api/tasks", async (req, res) => {
    try {
      const tasks = await getTasks();
      res.json(tasks);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create Task (Standard or Natural Language Entry)
  app.post("/api/tasks", async (req, res) => {
    try {
      const { text, title, deadline, priority, estimatedHours } = req.body;
      let newTaskData: Partial<ITask> = {};

      if (text) {
        // Natural Language Extraction
        console.log(`Processing Natural Language Input: "${text}"`);
        const extracted = await extractTaskFromNL(text);
        newTaskData = {
          id: `task-${Date.now()}`,
          title: extracted.title,
          deadline: extracted.deadline,
          priority: extracted.priority,
          estimatedHours: extracted.estimatedHours,
          completed: false,
          createdAt: new Date().toISOString()
        };
      } else {
        // Standard manual task entry
        newTaskData = {
          id: `task-${Date.now()}`,
          title,
          deadline,
          priority: priority || "medium",
          estimatedHours: Number(estimatedHours) || 2,
          completed: false,
          createdAt: new Date().toISOString()
        };
      }

      // Pre-calculate risk parameters via Gemini or backup heuristics
      const allTasks = await getTasks();
      const activeTasks = allTasks.filter(t => !t.completed);
      const overdueTasks = activeTasks.filter(t => new Date(t.deadline).getTime() < Date.now());

      console.log(`Analyzing risk category for new task: "${newTaskData.title}"`);
      const riskAnalysis = await analyzeTaskRisk(
        {
          title: newTaskData.title!,
          deadline: newTaskData.deadline!,
          priority: newTaskData.priority!,
          estimatedHours: newTaskData.estimatedHours!
        },
        activeTasks.length + 1,
        overdueTasks.length
      );

      const finalizedTask: ITask = {
        ...(newTaskData as ITask),
        riskIndex: riskAnalysis.riskIndex,
        riskCategory: riskAnalysis.riskCategory,
        riskReason: riskAnalysis.riskReason,
        recommendedAction: riskAnalysis.recommendedAction
      };

      const saved = await saveTask(finalizedTask);
      res.status(201).json(saved);
    } catch (err: any) {
      console.error("Error creating task:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Update Task (Completion or general details)
  app.put("/api/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const allTasks = await getTasks();
      const match = allTasks.find(t => t.id === id);

      if (!match) {
        return res.status(404).json({ error: "Task not found in active telemetry." });
      }

      const updatedTask: ITask = {
        ...match,
        ...updates
      };

      // Recalculate risk if priority or deadline changed, and task is not completed
      if (!updatedTask.completed && (updates.priority || updates.deadline || updates.estimatedHours)) {
        const activeTasks = allTasks.filter(t => !t.completed && t.id !== id);
        const overdueTasks = activeTasks.filter(t => new Date(t.deadline).getTime() < Date.now());
        const riskAnalysis = await analyzeTaskRisk(
          {
            title: updatedTask.title,
            deadline: updatedTask.deadline,
            priority: updatedTask.priority,
            estimatedHours: updatedTask.estimatedHours
          },
          activeTasks.length + 1,
          overdueTasks.length
        );
        updatedTask.riskIndex = riskAnalysis.riskIndex;
        updatedTask.riskCategory = riskAnalysis.riskCategory;
        updatedTask.riskReason = riskAnalysis.riskReason;
        updatedTask.recommendedAction = riskAnalysis.recommendedAction;
      }

      if (updatedTask.completed && !match.completed) {
        updatedTask.completedAt = new Date().toISOString();
        updatedTask.riskIndex = 0;
        updatedTask.riskCategory = "low";
        updatedTask.riskReason = "Task successfully completed.";
        updatedTask.recommendedAction = "Archive or log progress.";
      }

      const saved = await saveTask(updatedTask);
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete Task
  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await deleteTask(id);
      if (deleted) {
        res.json({ success: true, message: "Task successfully purged from active queue." });
      } else {
        res.status(404).json({ error: "Task not found." });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get dynamic AI explanation for task risk
  app.get("/api/tasks/:id/explain-risk", async (req, res) => {
    try {
      const { id } = req.params;
      const allTasks = await getTasks();
      const match = allTasks.find(t => t.id === id);
      if (!match) {
        return res.status(404).json({ error: "Task not found." });
      }
      const explanation = await explainTaskRisk(match, allTasks);
      res.json({ explanation });
    } catch (err: any) {
      console.error("Error explaining task risk:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get Burnout and Dashboard Analytics Recommendations
  app.get("/api/analytics", async (req, res) => {
    try {
      const tasks = await getTasks();
      const analytics = await analyzeBurnoutAndRecs(tasks);
      res.json(analytics);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Autonomous Rescheduling Agent Trigger
  app.post("/api/reschedule", async (req, res) => {
    try {
      const allTasks = await getTasks();
      const result = await rescheduleTasks(allTasks);

      // Persist the updates suggested by the AI agent
      for (const update of result.taskUpdates) {
        const task = allTasks.find(t => t.id === update.id);
        if (task) {
          task.deadline = update.newDeadline;
          task.riskReason = `Rescheduled by Guardian AI: ${update.reason}`;
          // Re-estimate risk for this new deadline
          const activeTasks = allTasks.filter(t => !t.completed && t.id !== task.id);
          const overdueTasks = activeTasks.filter(t => new Date(t.deadline).getTime() < Date.now());
          const riskAnalysis = await analyzeTaskRisk(task, activeTasks.length + 1, overdueTasks.length);
          task.riskIndex = riskAnalysis.riskIndex;
          task.riskCategory = riskAnalysis.riskCategory;
          task.recommendedAction = riskAnalysis.recommendedAction;
          await saveTask(task);
        }
      }

      res.json({
        success: true,
        updatesCount: result.taskUpdates.length,
        taskUpdates: result.taskUpdates,
        explanation: result.explanation
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Fetch Chat History
  app.get("/api/chats", async (req, res) => {
    try {
      const chats = await getChats();
      res.json(chats);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Post User Chat message & get Coach response
  app.post("/api/chats", async (req, res) => {
    try {
      const { message } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "A non-empty string message body is required." });
      }

      // 1. Save user message
      const userMsg: IChatMessage = {
        id: `chat-${Date.now()}-user`,
        role: "user",
        text: message,
        timestamp: new Date().toISOString()
      };
      await saveChat(userMsg);

      // 2. Fetch context
      const allTasks = await getTasks();
      const history = await getChats();
      const stats = await analyzeBurnoutAndRecs(allTasks);

      // 3. Ask Gemini Coach
      console.log(`Invoking AI Coach Chat with User Message: "${message}"`);
      const coachReply = await askCoach(history, message, allTasks, stats);

      // 4. Save Coach message
      const modelMsg: IChatMessage = {
        id: `chat-${Date.now()}-model`,
        role: "model",
        text: coachReply,
        timestamp: new Date().toISOString()
      };
      await saveChat(modelMsg);

      // Return the updated conversation block
      res.status(201).json({
        userMessage: userMsg,
        modelMessage: modelMsg
      });
    } catch (err: any) {
      console.error("AI Coach Chat error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Clear Chats
  app.post("/api/chats/clear", async (req, res) => {
    try {
      await clearChats();
      const systemWelcome: IChatMessage = {
        id: "chat-welcome-reset",
        role: "model",
        text: "System Telemetry Cleared. Ready to diagnose new scheduler parameters. Ask me any scheduling questions or type a task naturally.",
        timestamp: new Date().toISOString()
      };
      await saveChat(systemWelcome);
      res.json({ success: true, message: "Chat logs purged." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });


  // --------------------------------------------------
  // 2. Client Routing & Asset Serving (Vite integration)
  // --------------------------------------------------
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Start Listener
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`----------------------------------------------------------------`);
    console.log(`Deadline Guardian AI Server successfully deployed.`);
    console.log(`Access endpoint inside container routing: http://localhost:${PORT}`);
    console.log(`----------------------------------------------------------------`);
  });
}

startServer().catch((error) => {
  console.error("Critical failure during Express Server startup bootstrapping:", error);
});
