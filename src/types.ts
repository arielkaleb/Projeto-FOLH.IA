export type UserRole = "PRODUCER" | "ANALYST" | "COMMUNITY" | "HOME" | "CALCULATORS";

export interface AttachedFile {
  name: string;
  size: number;
  mimeType: string;
  data: string; // Base64 encoded string
}

export interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: Date;
  audioUrl?: string; // Client-side URL to synthesized audio (PCM/mp3 etc.)
  file?: {
    name: string;
    mimeType: string;
    size: number;
  };
  isLoadingAudio?: boolean;
}

export interface LegalCitation {
  law: string;
  article: string;
  summary: string;
  practicalTip: string;
}

export interface DocumentAnalysisReport {
  fileName: string;
  analyzedAt: Date;
  summary: string;
  conformityScore: number; // 0 to 100
  inconsistencies: string[];
  recommendations: string[];
  technicalOpinion: string;
}
