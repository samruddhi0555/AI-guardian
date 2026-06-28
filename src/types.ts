export interface ITask {
  id: string;
  title: string;
  deadline: string;
  priority: "low" | "medium" | "high" | "critical";
  estimatedHours: number;
  completed: boolean;
  completedAt?: string;
  riskIndex: number;
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

export interface IDashboardAnalytics {
  overallRiskIndex: number;
  burnoutScore: number;
  burnoutRiskLevel: "low" | "medium" | "high" | "critical";
  completionProbability: number;
  delayProbability: number;
  mostCriticalTaskId: string;
  availableCapacity: number;
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

export interface IDbStatus {
  mode: string;
  connected: boolean;
}
