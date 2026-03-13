export type ViolationModality = "Visual" | "Audio" | "Cross-Modal";

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
};
