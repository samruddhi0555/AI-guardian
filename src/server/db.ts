import mongoose, { Schema, Document } from "mongoose";
import fs from "fs";
import path from "path";

// --------------------------------------------------
// 1. Interfaces & Types
// --------------------------------------------------
export interface ITask {
  id: string;
  title: string;
  deadline: string; // ISO string
  priority: "low" | "medium" | "high" | "critical";
  estimatedHours: number;
  completed: boolean;
  completedAt?: string;
  riskIndex: number; // 0-100
  riskCategory: "low" | "medium" | "high" | "critical";
  riskReason: string;
  recommendedAction: string;
  createdAt: string;
}

export interface IChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
}

// --------------------------------------------------
// 2. MongoDB Mongoose Schemas (for production/Vercel/Render)
// --------------------------------------------------
interface ITaskDoc extends Document {
  id: string;
  title: string;
  deadline: string;
  priority: string;
  estimatedHours: number;
  completed: boolean;
  completedAt?: string;
  riskIndex: number;
  riskCategory: string;
  riskReason: string;
  recommendedAction: string;
  createdAt: string;
}

const TaskSchema = new Schema<ITaskDoc>({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  deadline: { type: String, required: true },
  priority: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
  estimatedHours: { type: Number, required: true },
  completed: { type: Boolean, default: false },
  completedAt: { type: String },
  riskIndex: { type: Number, default: 0 },
  riskCategory: { type: String, enum: ["low", "medium", "high", "critical"], default: "low" },
  riskReason: { type: String, default: "" },
  recommendedAction: { type: String, default: "" },
  createdAt: { type: String, required: true }
});

interface IChatMessageDoc extends Document {
  id: string;
  role: string;
  text: string;
  timestamp: string;
}

const ChatMessageSchema = new Schema<IChatMessageDoc>({
  id: { type: String, required: true, unique: true },
  role: { type: String, enum: ["user", "model"], required: true },
  text: { type: String, required: true },
  timestamp: { type: String, required: true }
});

let TaskModel: mongoose.Model<ITaskDoc>;
let ChatMessageModel: mongoose.Model<IChatMessageDoc>;

try {
  TaskModel = mongoose.model<ITaskDoc>("Task", TaskSchema);
  ChatMessageModel = mongoose.model<IChatMessageDoc>("ChatMessage", ChatMessageSchema);
} catch (e) {
  TaskModel = mongoose.models.Task as mongoose.Model<ITaskDoc>;
  ChatMessageModel = mongoose.models.ChatMessage as mongoose.Model<IChatMessageDoc>;
}

// --------------------------------------------------
// 3. Local JSON Fallback Database Manager
// --------------------------------------------------
const LOCAL_DB_PATH = path.join(process.cwd(), "data-store.json");

interface ILocalStore {
  tasks: ITask[];
  chats: IChatMessage[];
}

function loadLocalData(): ILocalStore {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const content = fs.readFileSync(LOCAL_DB_PATH, "utf8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("Error reading local JSON database, resetting:", error);
  }
  const defaultData: ILocalStore = {
    tasks: [
      {
        id: "task-1",
        title: "Build Deadline Guardian Core Engine",
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
        priority: "high",
        estimatedHours: 8,
        completed: false,
        riskIndex: 45,
        riskCategory: "medium",
        riskReason: "Approaching quickly with high estimate density.",
        recommendedAction: "Start implementing task parsers immediately to avoid backlogs.",
        createdAt: new Date().toISOString()
      },
      {
        id: "task-2",
        title: "Integrate Gemini Flash-Lite Models",
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
        priority: "medium",
        estimatedHours: 4,
        completed: false,
        riskIndex: 15,
        riskCategory: "low",
        riskReason: "Generous window left.",
        recommendedAction: "Complete design schemas before launching API calls.",
        createdAt: new Date().toISOString()
      },
      {
        id: "task-3",
        title: "Design Command Center Neon UI",
        deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day overdue
        priority: "critical",
        estimatedHours: 6,
        completed: false,
        riskIndex: 95,
        riskCategory: "critical",
        riskReason: "Task is OVERDUE and marked CRITICAL priority.",
        recommendedAction: "Halt all secondary systems. Prioritize neon palette mapping.",
        createdAt: new Date().toISOString()
      }
    ],
    chats: [
      {
        id: "chat-init",
        role: "model",
        text: "System Online. Welcome to Deadline Guardian AI Command Center. I have loaded your diagnostic task registry. Ask me about your workload, scheduling bottlenecks, or enter a task naturally.",
        timestamp: new Date().toISOString()
      }
    ]
  };
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(defaultData, null, 2), "utf8");
  return defaultData;
}

function saveLocalData(data: ILocalStore) {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Error writing to local JSON database:", error);
  }
}

// --------------------------------------------------
// 4. Combined Database Access Interface
// --------------------------------------------------
let isMongoConnected = false;
let mongoTried = false;

async function checkMongoConnection(): Promise<boolean> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return false;
  }
  if (isMongoConnected) return true;
  if (mongoTried) return isMongoConnected;

  mongoTried = true;
  try {
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
    });
    isMongoConnected = true;
    console.log("MongoDB Atlas Connected successfully.");
    return true;
  } catch (err) {
    console.error("Failed to connect to MongoDB Atlas, using high-performance Local JSON Database instead.", err);
    isMongoConnected = false;
    return false;
  }
}

export async function getDbStatus() {
  const connected = await checkMongoConnection();
  return {
    mode: connected ? "MongoDB Atlas" : "Local JSON Storage",
    connected,
  };
}

// --- Task API ---
export async function getTasks(): Promise<ITask[]> {
  const useMongo = await checkMongoConnection();
  if (useMongo) {
    const docs = await TaskModel.find({}).sort({ deadline: 1 });
    return docs.map(doc => ({
      id: doc.id,
      title: doc.title,
      deadline: doc.deadline,
      priority: doc.priority as any,
      estimatedHours: doc.estimatedHours,
      completed: doc.completed,
      completedAt: doc.completedAt,
      riskIndex: doc.riskIndex,
      riskCategory: doc.riskCategory as any,
      riskReason: doc.riskReason,
      recommendedAction: doc.recommendedAction,
      createdAt: doc.createdAt
    }));
  } else {
    const local = loadLocalData();
    return local.tasks;
  }
}

export async function saveTask(task: ITask): Promise<ITask> {
  const useMongo = await checkMongoConnection();
  if (useMongo) {
    await TaskModel.findOneAndUpdate(
      { id: task.id },
      { $set: task },
      { upsert: true, new: true }
    );
    return task;
  } else {
    const local = loadLocalData();
    const idx = local.tasks.findIndex(t => t.id === task.id);
    if (idx >= 0) {
      local.tasks[idx] = task;
    } else {
      local.tasks.push(task);
    }
    saveLocalData(local);
    return task;
  }
}

export async function deleteTask(id: string): Promise<boolean> {
  const useMongo = await checkMongoConnection();
  if (useMongo) {
    const res = await TaskModel.deleteOne({ id });
    return (res.deletedCount ?? 0) > 0;
  } else {
    const local = loadLocalData();
    const originalLen = local.tasks.length;
    local.tasks = local.tasks.filter(t => t.id !== id);
    saveLocalData(local);
    return local.tasks.length < originalLen;
  }
}

// --- Chats API ---
export async function getChats(): Promise<IChatMessage[]> {
  const useMongo = await checkMongoConnection();
  if (useMongo) {
    const docs = await ChatMessageModel.find({}).sort({ timestamp: 1 });
    return docs.map(doc => ({
      id: doc.id,
      role: doc.role as any,
      text: doc.text,
      timestamp: doc.timestamp
    }));
  } else {
    const local = loadLocalData();
    return local.chats;
  }
}

export async function saveChat(chat: IChatMessage): Promise<IChatMessage> {
  const useMongo = await checkMongoConnection();
  if (useMongo) {
    await ChatMessageModel.findOneAndUpdate(
      { id: chat.id },
      { $set: chat },
      { upsert: true, new: true }
    );
    return chat;
  } else {
    const local = loadLocalData();
    local.chats.push(chat);
    saveLocalData(local);
    return chat;
  }
}

export async function clearChats(): Promise<void> {
  const useMongo = await checkMongoConnection();
  if (useMongo) {
    await ChatMessageModel.deleteMany({});
  } else {
    const local = loadLocalData();
    local.chats = [];
    saveLocalData(local);
  }
}
