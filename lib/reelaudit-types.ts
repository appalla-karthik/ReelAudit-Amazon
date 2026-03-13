export type ViolationModality = "Visual" | "Audio" | "Cross-Modal";

export type RemediationStrategy =
  | "blur"
  | "mask"
  | "crop"
  | "replace"
  | "disclaimer"
  | "mute"
  | "trim"
  | "manual-review";

export type AutomationStatus = "ready-now" | "needs-template" | "manual-review";

export type AnalysisProcessingMode = "single-pass" | "chunked-longform";

export type FocusRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ComplianceEditPlan = {
  strategy: RemediationStrategy;
  preserveScene: boolean;
  automationStatus: AutomationStatus;
  editorNote: string;
  safeAlternative: string;
  targetRegion: string;
};

export type ComplianceViolation = {
  id: string;
  market: string;
  modality: ViolationModality;
  start_time: number;
  end_time: number;
  display_time: string;
  issue: string;
  suggestion: string;
  confidence: number;
  ruleFocus: string;
  editPlan: ComplianceEditPlan;
  focusRegion: FocusRegion | null;
};

export type AnalysisChunk = {
  id: string;
  start_time: number;
  end_time: number;
  display_time: string;
  label: string;
  status: "planned" | "analyzed";
};

export type AnalysisScope = {
  processingMode: AnalysisProcessingMode;
  estimatedChunks: number;
  chunkWindowSeconds: number;
  durationSeconds: number | null;
};

export type ComplianceAnalysisResponse = {
  summary: string;
  complianceScore: number;
  violations: ComplianceViolation[];
  selectedMarkets: string[];
  modelId: string;
  objectKey: string;
  s3Uri: string;
  warnings: string[];
  scope: AnalysisScope;
  chunks: AnalysisChunk[];
};
