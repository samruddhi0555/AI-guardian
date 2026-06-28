import { GoogleGenAI, Type } from "@google/genai";
import { ITask, IChatMessage } from "./db.js";

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;
if (apiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("Gemini API Client initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Gemini API Client:", err);
  }
} else {
  console.warn("GEMINI_API_KEY is not defined. Initializing with intelligent fallback heuristics.");
}

// Helper: Ensure we have a valid client or fall back
function getAiClient(): GoogleGenAI {
  if (!ai) {
    throw new Error("Gemini AI API Key is missing. Please add your GEMINI_API_KEY in the Settings > Secrets panel.");
  }
  return ai;
}

// ------------------------------------------------------------------
// 1. Natural Language Task Extraction
// ------------------------------------------------------------------
export async function extractTaskFromNL(
  text: string,
  referenceDate: string = new Date().toISOString()
): Promise<{ title: string; deadline: string; priority: "low" | "medium" | "high" | "critical"; estimatedHours: number }> {
  const prompt = `Analyze this task input phrase: "${text}"
Current Local Time/Date is: ${referenceDate} (use this as the anchor date to figure out words like 'tomorrow', 'Friday', 'next week', 'by evening', etc.).

Extract the following information:
- Task Title (clear, action-oriented)
- Deadline (as an ISO-8601 string)
- Priority Level (choose strictly from: "low", "medium", "high", "critical")
- Estimated workload hours (as a number, default to 2 if not mentioned).

Return the output as a valid JSON object matching this schema.`;

  try {
    const client = getAiClient();
    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Actionable name of the task" },
            deadline: { type: Type.STRING, description: "ISO-8601 format date-time string representing when this task is due" },
            priority: { type: Type.STRING, description: "Priority level: low, medium, high, or critical" },
            estimatedHours: { type: Type.NUMBER, description: "Estimated number of hours required to complete" },
          },
          required: ["title", "deadline", "priority", "estimatedHours"],
        },
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text.trim());
      // Sanitize priority
      let priority: "low" | "medium" | "high" | "critical" = "medium";
      if (["low", "medium", "high", "critical"].includes(data.priority?.toLowerCase())) {
        priority = data.priority.toLowerCase();
      }
      return {
        title: data.title || text,
        deadline: data.deadline || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        priority,
        estimatedHours: Number(data.estimatedHours) || 2,
      };
    }
    throw new Error("No text returned from Gemini model.");
  } catch (error) {
    console.error("Gemini Task Extraction failed, falling back to heuristics:", error);
    // Simple Heuristic Fallback
    const now = new Date(referenceDate);
    let hours = 3;
    let priority: "low" | "medium" | "high" | "critical" = "medium";
    let deadline = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // default 2 days

    const lowerText = text.toLowerCase();
    if (lowerText.includes("hour")) {
      const match = lowerText.match(/(\d+)\s*hour/);
      if (match) hours = parseInt(match[1]) || 3;
    }
    if (lowerText.includes("critical") || lowerText.includes("asap") || lowerText.includes("urgent")) {
      priority = "critical";
    } else if (lowerText.includes("high") || lowerText.includes("important")) {
      priority = "high";
    } else if (lowerText.includes("low") || lowerText.includes("easy")) {
      priority = "low";
    }

    if (lowerText.includes("tomorrow")) {
      deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    } else if (lowerText.includes("friday")) {
      const currentDay = now.getDay();
      const daysUntilFriday = (5 - currentDay + 7) % 7 || 7;
      deadline = new Date(now.getTime() + daysUntilFriday * 24 * 60 * 60 * 1000);
    } else if (lowerText.includes("monday")) {
      const currentDay = now.getDay();
      const daysUntilMonday = (1 - currentDay + 7) % 7 || 7;
      deadline = new Date(now.getTime() + daysUntilMonday * 24 * 60 * 60 * 1000);
    }

    return {
      title: text.split("by")[0].split("around")[0].trim() || text,
      deadline: deadline.toISOString(),
      priority,
      estimatedHours: hours,
    };
  }
}

// ------------------------------------------------------------------
// 2. Task Risk & Priority Level Predictor
// ------------------------------------------------------------------
export async function analyzeTaskRisk(
  task: { title: string; deadline: string; priority: string; estimatedHours: number },
  totalTasksCount: number,
  overdueTasksCount: number
): Promise<{ riskIndex: number; riskCategory: "low" | "medium" | "high" | "critical"; riskReason: string; recommendedAction: string }> {
  const prompt = `Analyze deadline risk for this task:
Task: "${task.title}"
Deadline: ${task.deadline}
Priority: ${task.priority}
Estimated Hours: ${task.estimatedHours}
Overall Context:
- Active pending tasks count: ${totalTasksCount}
- Tasks already overdue: ${overdueTasksCount}
Current local time is: ${new Date().toISOString()}

Calculate:
- Deadline Risk Index (0 to 100): An score representing probability of missing the deadline. Overdue should be 90-100. Near-deadlines with high estimates should trigger high values.
- Risk Category: Choose strictly from: "low", "medium", "high", "critical"
- Risk Reason: 1-2 sentence concise explanation of why this risk score was given (e.g. density of work, overdue buffer).
- Recommended Action: 1 specific actionable sentence to mitigate this risk.`;

  try {
    const client = getAiClient();
    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskIndex: { type: Type.INTEGER, description: "Numeric score between 0 and 100" },
            riskCategory: { type: Type.STRING, description: "Strictly low, medium, high, or critical" },
            riskReason: { type: Type.STRING, description: "Detailed reason for the risk index" },
            recommendedAction: { type: Type.STRING, description: "Mitigation action" },
          },
          required: ["riskIndex", "riskCategory", "riskReason", "recommendedAction"],
        },
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text.trim());
      let category: "low" | "medium" | "high" | "critical" = "low";
      if (["low", "medium", "high", "critical"].includes(data.riskCategory?.toLowerCase())) {
        category = data.riskCategory.toLowerCase();
      }
      return {
        riskIndex: Math.max(0, Math.min(100, Number(data.riskIndex) || 10)),
        riskCategory: category,
        riskReason: data.riskReason || "Generous buffer is available.",
        recommendedAction: data.recommendedAction || "Monitor milestones periodically.",
      };
    }
    throw new Error("No output text received.");
  } catch (error) {
    console.error("Gemini Task Risk Analysis failed, executing mathematical fallback:", error);
    // Dynamic robust mathematical model
    const now = new Date();
    const due = new Date(task.deadline);
    const msLeft = due.getTime() - now.getTime();
    const hoursLeft = msLeft / (1000 * 60 * 60);

    let riskIndex = 15;
    let riskCategory: "low" | "medium" | "high" | "critical" = "low";
    let riskReason = "Sufficient buffer remains to execute this task securely.";
    let recommendedAction = "Proceed with scheduled workload pacing.";

    if (hoursLeft < 0) {
      riskIndex = 98;
      riskCategory = "critical";
      riskReason = "This task has breached its target deadline limit and is currently overdue.";
      recommendedAction = "Deploy critical reserves now. Deliver remaining sub-modules immediately.";
    } else {
      const bufferRatio = task.estimatedHours / Math.max(1, hoursLeft);
      if (bufferRatio > 0.8 || hoursLeft < 12) {
        riskIndex = 85;
        riskCategory = "critical";
        riskReason = "Immediate overload detected. High hours estimate relative to extremely narrow remaining buffer.";
        recommendedAction = "Postpone non-critical systems. Execute high-priority code block now.";
      } else if (bufferRatio > 0.4 || hoursLeft < 36) {
        riskIndex = 65;
        riskCategory = "high";
        riskReason = "The deadline window is contracting. Workload density indicates schedule collision hazards.";
        recommendedAction = "Optimize scheduling blocks and lock in quiet deep-work sprints.";
      } else if (bufferRatio > 0.15 || hoursLeft < 72) {
        riskIndex = 40;
        riskCategory = "medium";
        riskReason = "Moderate workload density relative to task timeline. Standard risk threshold.";
        recommendedAction = "Review requirements and begin primary setup blocks today.";
      }
    }

    return { riskIndex, riskCategory, riskReason, recommendedAction };
  }
}

// ------------------------------------------------------------------
// 3. Burnout Engine & Dashboard Overviews
// ------------------------------------------------------------------
export interface IDashboardAnalytics {
  overallRiskIndex: number;
  burnoutScore: number;
  burnoutRiskLevel: "low" | "medium" | "high" | "critical";
  completionProbability: number;
  delayProbability: number;
  mostCriticalTaskId: string;
  availableCapacity: number; // remaining hours left for active work
  dailyActionPlan: string[];
  recs: {
    priorities: string[];
    improvements: string[];
    warnings: string[];
    advice: string[];
  };
  aiConfidenceScore: number;
  commandBrief?: {
    todayObjective: string;
    currentRisk: string;
    recommendedFocus: string;
    estimatedCompletion: string;
  };
}

export async function analyzeBurnoutAndRecs(tasks: ITask[]): Promise<IDashboardAnalytics> {
  const activeTasks = tasks.filter(t => !t.completed);
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;

  if (activeTasks.length === 0) {
    return {
      overallRiskIndex: 0,
      burnoutScore: 10,
      burnoutRiskLevel: "low",
      completionProbability: 100,
      delayProbability: 0,
      mostCriticalTaskId: "",
      availableCapacity: 40,
      dailyActionPlan: ["All active tasks completed. Feed some new task inputs to get analyzed."],
      recs: {
        priorities: ["Rest up and prepare for the next sprint."],
        improvements: ["Maintain current momentum."],
        warnings: ["No current warning alerts."],
        advice: ["Plan future pipelines or document present modules."]
      },
      aiConfidenceScore: 99,
      commandBrief: {
        todayObjective: "Maintain rest and celebrate target completions.",
        currentRisk: "Zero active threat registered.",
        recommendedFocus: "Sprint planning and pipeline documentation.",
        estimatedCompletion: "All current milestones completed successfully."
      }
    };
  }

  const prompt = `Analyze this user's active task command center registry to calculate dashboard analytics, burnout risk, and AI action recommendations:

Active Task Database:
${JSON.stringify(activeTasks.map(t => ({
  id: t.id,
  title: t.title,
  deadline: t.deadline,
  priority: t.priority,
  estimatedHours: t.estimatedHours,
  riskIndex: t.riskIndex,
  riskCategory: t.riskCategory
})))}

Overall Context:
- Total registered tasks: ${totalTasks}
- Completed tasks: ${completedTasks}
- Current local time: ${new Date().toISOString()}

Generate the following analytic outputs:
1. overallRiskIndex: Average risk weighted toward Critical/High priority tasks (0-100).
2. burnoutScore: Burnout risk level based on workload hours concentration, density, and overlaps (0-100).
3. burnoutRiskLevel: "low", "medium", "high", "critical"
4. completionProbability: Percentage likelihood of finishing all items on time (0-100).
5. delayProbability: Percentage probability of experiencing delays (0-100).
6. mostCriticalTaskId: The ID of the task that poses the greatest delay threat.
7. availableCapacity: Estimated remaining deep-work capacity in hours for this week (assuming 40 hours maximum weekly capacity minus estimated hours of active tasks).
8. dailyActionPlan: A highly customized array of 3 actionable steps to follow today.
9. recs: A detailed recommendation object with list arrays:
   - priorities: Today's top 2 key priorities.
   - improvements: 2 dynamic schedule optimizations.
   - warnings: 2 critical warnings about near-term collisons.
   - advice: 2 tips for pacing, wellness, and burnout reduction.
10. aiConfidenceScore: Numeric confidence score (0-100) on whether the user can handle their current schedule.
11. commandBrief: An object containing:
   - todayObjective: Concise 1-sentence statement of today's key milestone/objective.
   - currentRisk: Concise description of current scheduling threat.
   - recommendedFocus: Specific actionable focus.
   - estimatedCompletion: Estimated completion timeline for current tasks.

Return as a valid structured JSON object matching the requested schema.`;

  try {
    const client = getAiClient();
    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallRiskIndex: { type: Type.INTEGER },
            burnoutScore: { type: Type.INTEGER },
            burnoutRiskLevel: { type: Type.STRING },
            completionProbability: { type: Type.INTEGER },
            delayProbability: { type: Type.INTEGER },
            mostCriticalTaskId: { type: Type.STRING },
            availableCapacity: { type: Type.INTEGER },
            dailyActionPlan: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            recs: {
              type: Type.OBJECT,
              properties: {
                priorities: { type: Type.ARRAY, items: { type: Type.STRING } },
                improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
                warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
                advice: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["priorities", "improvements", "warnings", "advice"]
            },
            aiConfidenceScore: { type: Type.INTEGER },
            commandBrief: {
              type: Type.OBJECT,
              properties: {
                todayObjective: { type: Type.STRING },
                currentRisk: { type: Type.STRING },
                recommendedFocus: { type: Type.STRING },
                estimatedCompletion: { type: Type.STRING }
              },
              required: ["todayObjective", "currentRisk", "recommendedFocus", "estimatedCompletion"]
            }
          },
          required: [
            "overallRiskIndex",
            "burnoutScore",
            "burnoutRiskLevel",
            "completionProbability",
            "delayProbability",
            "mostCriticalTaskId",
            "availableCapacity",
            "dailyActionPlan",
            "recs",
            "aiConfidenceScore",
            "commandBrief"
          ],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text.trim()) as IDashboardAnalytics;
    }
    throw new Error("No response output.");
  } catch (error) {
    console.error("Gemini Analytics Analysis failed, calculating backup analytics:", error);
    // Robust local fallback algorithm
    const totalEstHours = activeTasks.reduce((sum, t) => sum + t.estimatedHours, 0);
    const criticalCount = activeTasks.filter(t => t.priority === "critical" || t.priority === "high").length;
    const avgRisk = Math.round(activeTasks.reduce((sum, t) => sum + t.riskIndex, 0) / activeTasks.length);

    // Calculate burnout
    let burnoutScore = Math.min(100, Math.round((totalEstHours / 35) * 60 + (criticalCount * 10)));
    let burnoutRiskLevel: "low" | "medium" | "high" | "critical" = "low";
    if (burnoutScore > 80) burnoutRiskLevel = "critical";
    else if (burnoutScore > 60) burnoutRiskLevel = "high";
    else if (burnoutScore > 35) burnoutRiskLevel = "medium";

    const completionProbability = Math.max(10, Math.min(95, 100 - avgRisk));
    const delayProbability = 100 - completionProbability;

    // Critical Task Finder
    const sortedByRisk = [...activeTasks].sort((a, b) => b.riskIndex - a.riskIndex);
    const mostCriticalTaskId = sortedByRisk[0]?.id || "";

    const availableCapacity = Math.max(0, 40 - totalEstHours);

    return {
      overallRiskIndex: avgRisk,
      burnoutScore,
      burnoutRiskLevel,
      completionProbability,
      delayProbability,
      mostCriticalTaskId,
      availableCapacity,
      dailyActionPlan: [
        `Tackle "${sortedByRisk[0]?.title || "Critical Items"}" first thing during peak performance hours.`,
        "Enforce strict 50-minute work and 10-minute break Pomodoro intervals.",
        "Clear all minor dependencies before diving into larger development blocks."
      ],
      recs: {
        priorities: [
          `Focus on the primary blocker: "${sortedByRisk[0]?.title || "Critical item"}"`,
          "Limit active context switching and focus on single-task iterations."
        ],
        improvements: [
          "Batch coordinate communication to preserve continuous deep focus blocks.",
          "Break down oversized deliverables into bite-sized 1-hour sub-tasks."
        ],
        warnings: [
          totalEstHours > 25 ? "Aggressive load levels detected. Workload approaches limits." : "Task overlap indicates potential schedule collisions.",
          "Overdue elements exist in your active registry. Clear them immediately."
        ],
        advice: [
          "Hydrate consistently and schedule a 20-minute eyes-away rest period.",
          "Practice cognitive offloading: map sub-milestones to reduce anxiety."
        ]
      },
      aiConfidenceScore: 85,
      commandBrief: {
        todayObjective: `Tackle and resolve primary system bottleneck: "${sortedByRisk[0]?.title || "Critical Deliverable"}"`,
        currentRisk: `Tactical risk index at ${avgRisk}%, workload level ${burnoutRiskLevel}.`,
        recommendedFocus: `Milestone execution for "${sortedByRisk[0]?.title || "Backlog"}"`,
        estimatedCompletion: "Awaiting next automated schedule alignment."
      }
    };
  }
}

// ------------------------------------------------------------------
// 4. Smart Rescheduling Agent
// ------------------------------------------------------------------
export async function rescheduleTasks(tasks: ITask[]): Promise<{
  taskUpdates: { id: string; newDeadline: string; reason: string }[];
  explanation: string;
}> {
  const activeTasks = tasks.filter(t => !t.completed);
  if (activeTasks.length === 0) {
    return { taskUpdates: [], explanation: "No active tasks to reschedule." };
  }

  const prompt = `You are the Deadline Guardian AI Autonomous Scheduler. Your objective is to re-organize the scheduling and deadlines of active tasks to prevent overload, mitigate risks, and guarantee all deliverables are met.

Current Active Registry:
${JSON.stringify(activeTasks.map(t => ({
  id: t.id,
  title: t.title,
  deadline: t.deadline,
  priority: t.priority,
  estimatedHours: t.estimatedHours,
  riskIndex: t.riskIndex,
  riskCategory: t.riskCategory
})))}

Current Date Anchor: ${new Date().toISOString()}

Requirements:
1. Analyze all active tasks thoroughly.
2. Recommend an optimized schedule (as a list of suggested task updates with new deadlines as ISO-8601 strings and clear reasons).
3. Calculate an expected risk reduction percentage (e.g. "35% reduction in delay probability") as a direct result of this rescheduling.
4. Generate a comprehensive "Mission Brief" explaining your scheduling strategy, your analysis of all tasks, and your risk reduction calculations.

Return output strictly as a structured JSON object matching the response schema. In your 'explanation', output a complete, highly professional, markdown-formatted "MISSION BRIEF" detailing:
- **ANALYSIS OF ALL TASKS**: a brief summary of the bottleneck tasks.
- **OPTIMIZED SCHEDULE SUMMARY**: which tasks were pushed and why.
- **EXPECTED RISK REDUCTION**: explicit risk reduction calculations and percentage.
Make sure the brief is beautifully formatted using markdown headings and bold text.`;

  try {
    const client = getAiClient();
    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            taskUpdates: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  newDeadline: { type: Type.STRING },
                  reason: { type: Type.STRING }
                },
                required: ["id", "newDeadline", "reason"]
              }
            },
            explanation: { type: Type.STRING }
          },
          required: ["taskUpdates", "explanation"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text.trim());
    }
    throw new Error("No rescheduling response output.");
  } catch (error) {
    console.error("Gemini Rescheduling Agent failed, executing local rescheduling algorithm:", error);
    // Local fallback: push low-priority or near-term overloaded tasks by 1-2 days
    const updates: { id: string; newDeadline: string; reason: string }[] = [];
    const sorted = [...activeTasks].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    
    let currentDayOffset = 1;
    for (const t of sorted) {
      if (t.riskIndex > 50 && (t.priority === "low" || t.priority === "medium")) {
        const originalDate = new Date(t.deadline);
        const newDate = new Date(originalDate.getTime() + (currentDayOffset * 24 * 60 * 60 * 1000));
        updates.push({
          id: t.id,
          newDeadline: newDate.toISOString(),
          reason: `Pushed by ${currentDayOffset} day(s) to clear the congestion for near-term critical deliverables.`
        });
        currentDayOffset += 1;
      }
    }

    return {
      taskUpdates: updates,
      explanation: "Workload balancing executed via critical-path analysis. Lower-priority tasks experiencing timeline congestion have been safely deferred, securing your highest priority critical deliverables."
    };
  }
}

// ------------------------------------------------------------------
// 5. AI Productivity Coach Chat
// ------------------------------------------------------------------
export async function askCoach(
  chatHistory: IChatMessage[],
  userQuestion: string,
  tasks: ITask[],
  dashboardStats: IDashboardAnalytics
): Promise<string> {
  const activeTasks = tasks.filter(t => !t.completed);
  const overdueTasks = activeTasks.filter(t => new Date(t.deadline).getTime() < Date.now());

  const prompt = `You are the Deadline Guardian AI Productivity Coach. Your user is managing their tasks inside a highly sophisticated tactical command center. Speak with the objective, sharp, reassuring, and highly skilled voice of an expert commander or mission coordinator. Use term styles like "System Sync", "Risk Mitigations", "Workload Pacing", etc.

Live Task Data Context:
- Active tasks: ${activeTasks.length}
- Overdue tasks: ${overdueTasks.length}
- Overall Risk Index: ${dashboardStats.overallRiskIndex}/100
- Burnout Score: ${dashboardStats.burnoutScore}/100
- Burnout level: ${dashboardStats.burnoutRiskLevel}
- Available capacity: ${dashboardStats.availableCapacity} hours
- Most critical task: "${activeTasks.find(t => t.id === dashboardStats.mostCriticalTaskId)?.title || "N/A"}"

Active Task List Details:
${JSON.stringify(activeTasks.map(t => ({
  title: t.title,
  deadline: t.deadline,
  priority: t.priority,
  estimatedHours: t.estimatedHours,
  riskCategory: t.riskCategory,
  riskReason: t.riskReason
})))}

Recent Chat History:
${JSON.stringify(chatHistory.slice(-6).map(c => ({ role: c.role, text: c.text })))}

User's Query: "${userQuestion}"

Provide a tactical response (no more than 3 paragraphs). Use live task data to directly answer their questions. Keep it direct, actionable, encouraging, and highly technical. Use markdown formatted text (bullet points, bold highlights) for excellent readability. Do not output raw JSON, respond in plain Markdown.`;

  try {
    const client = getAiClient();
    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });
    if (response.text) {
      return response.text;
    }
    throw new Error("Empty coach response.");
  } catch (error) {
    console.error("Gemini Coach chat failed, generating heuristic response:", error);
    // Generate tailored local chat replies using task details
    const criticalTask = activeTasks.find(t => t.id === dashboardStats.mostCriticalTaskId);
    if (userQuestion.toLowerCase().includes("work") || userQuestion.toLowerCase().includes("today") || userQuestion.toLowerCase().includes("do")) {
      return `**MISSION ASSIGNMENT LOGGED:**
Your immediate objective for today is to address the primary scheduler blocker: **"${criticalTask?.title || "your critical backlog item"}"** (Priority: ${criticalTask?.priority || "High"}).

**Recommended Execution Steps:**
1. Secure a quiet **90-minute block** with zero notifications.
2. Complete the initial core setup block of this task.
3. Take a mandatory **10-minute eyes-off-screen break** before secondary operations.
Current tactical risk level is **${dashboardStats.overallRiskIndex}/100**. Pacing is key to prevent fatigue.`;
    }

    if (userQuestion.toLowerCase().includes("finish") || userQuestion.toLowerCase().includes("time") || userQuestion.toLowerCase().includes("can i")) {
      return `**TACTICAL ASSESSMENT REPORT:**
Based on the current telemetry, your completion probability stands at **${dashboardStats.completionProbability}%**.
- Active Pending hours: **${activeTasks.reduce((s, t) => s + t.estimatedHours, 0)} hours**.
- Overdue items: **${overdueTasks.length} task(s)**.

**Analysis:**
You possess adequate remaining weekly capacity of **${dashboardStats.availableCapacity} hours**, but the schedule density is creating risk collisions. Clear out the overdue tasks first to stabilize pipeline integrity.`;
    }

    return `**SYSTEM COMMUNICATIONS RECEIVING:**
My sensors indicate an active queue of **${activeTasks.length} tasks** under tracking.
The critical pipeline blocker is **"${criticalTask?.title || "N/A"}"**, presenting a risk category of **${criticalTask?.riskCategory || "medium"}**.

What specific element of this schedule configuration would you like to optimize or reschedule next? I can automatically balance your workload or outline a custom deep-work sprint.`;
  }
}

// ------------------------------------------------------------------
// 6. Dynamic Task Risk Explanation
// ------------------------------------------------------------------
export async function explainTaskRisk(
  task: ITask,
  allTasks: ITask[]
): Promise<string> {
  const activeTasks = allTasks.filter(t => !t.completed);
  const prompt = `You are the Deadline Guardian AI Risk Predictor.
Explain in detail why this specific task is at risk and analyze its threat context:

Target Task:
- Title: "${task.title}"
- Deadline: ${task.deadline}
- Priority: ${task.priority}
- Estimated workload hours: ${task.estimatedHours}
- Current calculated delay probability: ${task.riskIndex}%
- Risk reason: "${task.riskReason}"
- Proposed mitigation action: "${task.recommendedAction}"

Entire Workload Registry:
${JSON.stringify(activeTasks.map(t => ({ title: t.title, deadline: t.deadline, priority: t.priority, hours: t.estimatedHours, risk: t.riskIndex })))}

Current date & time: ${new Date().toISOString()}

Provide a dynamic, highly analytical 2-3 sentence deep dive explaining why this specific task is at risk, focusing on deadline overlaps, active workload concentration, urgency indicators, and specific bottlenecks. Speak directly and objectively in a tactical advisory tone. Do not repeat the existing risk reason verbatim; expand with real scheduling insights.`;

  try {
    const client = getAiClient();
    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt
    });
    if (response.text) {
      return response.text.trim();
    }
    return "No explanation generated. Task scheduling indicates deadline pressure relative to overall backlog size.";
  } catch (error) {
    console.error("Failed to explain task risk via Gemini:", error);
    return `Analysis: The task "${task.title}" is flagged as ${task.riskCategory} priority with ${task.estimatedHours} hours required. With other active tasks in the registry, the proximity to the deadline increases scheduling friction. Prioritizing immediate execution is advised.`;
  }
}
