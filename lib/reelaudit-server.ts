import "server-only";

import crypto from "node:crypto";
import path from "node:path";

import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ContentBlock,
  type VideoFormat,
} from "@aws-sdk/client-bedrock-runtime";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { POLICY_VERSION, getRulesForMarkets } from "@/lib/reelaudit-rules";
import type { ComplianceAnalysisResponse, ComplianceViolation, ViolationModality } from "@/lib/reelaudit-types";

const DEFAULT_REGION = "us-east-1";
const DEFAULT_MODEL_ID = "us.amazon.nova-lite-v1:0";
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

const VIDEO_MODEL_FALLBACKS = [
  "us.amazon.nova-lite-v1:0",
  "us.amazon.nova-pro-v1:0",
  "amazon.nova-lite-v1:0",
  "amazon.nova-pro-v1:0",
];

const AUDIO_WARNING =
  "This live Amazon Nova pipeline analyzes video frames and visible on-screen text. Audio-only violations are not evaluated yet.";

type RuntimeConfig = {
  region: string;
  bucketName: string;
  modelCandidates: string[];
};

type RawComplianceReport = {
  summary?: string;
  violations?: Array<{
    market?: string;
    modality?: string;
    start_time?: number;
    end_time?: number;
    issue?: string;
    suggestion?: string;
    confidence?: number;
  }>;
};

type AnalyzeVideoParams = {
  bytes: Uint8Array;
  contentType: string;
  fileName: string;
  selectedMarkets: string[];
};

function getRuntimeConfig(): RuntimeConfig {
  const region = process.env.AWS_REGION || DEFAULT_REGION;
  const bucketName = process.env.S3_BUCKET_NAME;

  if (!bucketName) {
    throw new Error("Missing S3 bucket configuration. Add S3_BUCKET_NAME to .env.local.");
  }

  const configuredModelId = process.env.BEDROCK_MODEL_ID || DEFAULT_MODEL_ID;
  const normalizedModelId = normalizeModelId(configuredModelId, region);

  return {
    region,
    bucketName,
    modelCandidates: [
      ...new Set(
        [normalizedModelId, configuredModelId, ...VIDEO_MODEL_FALLBACKS]
          .filter(Boolean)
          .map((candidate) => normalizeModelId(candidate, region))
      ),
    ],
  };
}

function normalizeModelId(modelId: string, region: string) {
  if (!modelId || modelId.startsWith("arn:")) {
    return modelId;
  }

  if (/^(us|eu|apac|jp)\./.test(modelId)) {
    return modelId;
  }

  if (region.startsWith("us-")) {
    return `us.${modelId}`;
  }

  return modelId;
}

function createS3Client(region: string) {
  return new S3Client({ region });
}

function createBedrockClient(region: string) {
  return new BedrockRuntimeClient({ region });
}

function sanitizeFileName(fileName: string) {
  const baseName = path.basename(fileName, path.extname(fileName));
  const slug = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || "upload";
}

function getVideoFormat(contentType: string, fileName: string): VideoFormat {
  const extension = path.extname(fileName).replace(".", "").toLowerCase();
  const normalizedContentType = contentType.toLowerCase();

  if (normalizedContentType === "video/quicktime" || extension === "mov") {
    return "mov";
  }

  if (normalizedContentType === "video/webm" || extension === "webm") {
    return "webm";
  }

  if (normalizedContentType === "video/x-flv" || extension === "flv") {
    return "flv";
  }

  if (
    normalizedContentType === "video/mpeg" ||
    extension === "mpeg" ||
    extension === "mpg"
  ) {
    return "mpeg";
  }

  if (normalizedContentType === "video/x-ms-wmv" || extension === "wmv") {
    return "wmv";
  }

  if (normalizedContentType === "video/3gpp" || extension === "3gp") {
    return "three_gp";
  }

  return "mp4";
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

function clampToHalfSecond(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.round(value * 2) / 2;
}

function normalizeModality(modality: string | undefined): ViolationModality {
  if (modality === "Audio") {
    return "Audio";
  }

  if (modality === "Cross-Modal") {
    return "Cross-Modal";
  }

  return "Visual";
}

function calculateComplianceScore(violations: ComplianceViolation[]) {
  return Math.max(48, 100 - violations.length * 12);
}

function normalizeViolations(
  rawViolations: RawComplianceReport["violations"],
  selectedMarkets: string[]
): ComplianceViolation[] {
  if (!rawViolations?.length) {
    return [];
  }

  return rawViolations
    .filter((violation) => violation.market && selectedMarkets.includes(violation.market))
    .map((violation, index) => {
      const startTime = clampToHalfSecond(violation.start_time ?? 0);
      const rawEndTime = clampToHalfSecond(violation.end_time ?? startTime + 2);
      const endTime = rawEndTime <= startTime ? startTime + 2 : rawEndTime;

      return {
        id: `violation-${index + 1}`,
        market: violation.market as string,
        modality: normalizeModality(violation.modality),
        start_time: startTime,
        end_time: endTime,
        display_time: formatTime(startTime),
        issue: (violation.issue || "Potential compliance issue detected.").trim(),
        suggestion: (violation.suggestion || "Review and re-edit the flagged segment.").trim(),
        confidence:
          typeof violation.confidence === "number"
            ? Math.max(0, Math.min(1, violation.confidence))
            : 0.72,
      };
    })
    .sort((left, right) => left.start_time - right.start_time);
}

function extractTextContent(content: ContentBlock[] | undefined) {
  if (!content?.length) {
    return "";
  }

  return content
    .flatMap((block) => ("text" in block && block.text ? [block.text] : []))
    .join("\n")
    .trim();
}

function parseJsonText(rawText: string) {
  if (!rawText) {
    return null;
  }

  const cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(cleaned) as RawComplianceReport;
  } catch {
    return null;
  }
}

function buildPrompt(selectedMarkets: string[]) {
  const rules = getRulesForMarkets(selectedMarkets);
  const rulesSection = rules
    .map(
      (rule) =>
        [
          `Market: ${rule.market}`,
          `Focus: ${rule.focus.join(", ")}`,
          `Flag when: ${rule.prohibitedSignals.join("; ")}`,
          `Preferred remediation: ${rule.recommendedActions.join("; ")}`,
          `Notes: ${rule.notes.join("; ")}`,
        ].join("\n")
    )
    .join("\n\n");

  return [
    "Review the attached marketing or promotional video for market-specific compliance risks.",
    "Evidence available in this request: video frames and visible on-screen text only.",
    "Do not infer soundtrack or spoken-dialogue violations because audio analysis is disabled in this pipeline.",
    "Return only clear, defensible risks. If the evidence is weak, omit the finding.",
    "When a caption or visible text combines with visuals to create the issue, use modality Cross-Modal.",
    "Otherwise use modality Visual.",
    "Keep timestamps in decimal seconds and stay conservative.",
    "Respond with one raw JSON object only. Do not wrap it in markdown.",
    'Use this exact shape: {"summary":"string","violations":[{"market":"string","modality":"Visual|Cross-Modal|Audio","start_time":0,"end_time":0,"issue":"string","suggestion":"string","confidence":0.0}]}',
    "If no strong issues are present, return an empty violations array.",
    `Selected markets: ${selectedMarkets.join(", ")}`,
    `Policy version: ${POLICY_VERSION}`,
    "",
    rulesSection,
  ].join("\n");
}

async function invokeModelWithFallbacks({
  client,
  modelCandidates,
  videoFormat,
  s3Uri,
  selectedMarkets,
}: {
  client: BedrockRuntimeClient;
  modelCandidates: string[];
  videoFormat: VideoFormat;
  s3Uri: string;
  selectedMarkets: string[];
}) {
  const prompt = buildPrompt(selectedMarkets);
  let lastError: unknown;

  for (const modelId of modelCandidates) {
    try {
      const response = await client.send(
        new ConverseCommand({
          modelId,
          system: [
            {
              text: "You are Reel Audit, a precise compliance analyst for regional video publishing review.",
            },
          ],
          messages: [
            {
              role: "user",
              content: [
                { text: prompt },
                {
                  video: {
                    format: videoFormat,
                    source: {
                      s3Location: {
                        uri: s3Uri,
                      },
                    },
                  },
                },
              ],
            },
          ],
          inferenceConfig: {
            maxTokens: 1600,
            temperature: 0.1,
            topP: 0.9,
          },
        })
      );

      const outputMessage = response.output?.message;
      const text = extractTextContent(outputMessage?.content);
      const parsed = parseJsonText(text);

      if (parsed) {
        return { modelId, report: parsed };
      }

      throw new Error("Nova returned an unreadable response.");
    } catch (error) {
      if (error instanceof Error && /input is too long|malformed input request|provided request is not valid|validation|not supported/i.test(error.message)) {
        lastError = new Error(
          `Amazon Nova could not analyze this video with model ${modelId}. The server will keep trying other video-capable Nova models.`
        );
      } else {
        lastError = error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Bedrock Nova analysis failed for all configured model IDs.");
}

async function uploadVideoToS3({
  client,
  bucketName,
  fileName,
  contentType,
  bytes,
}: {
  client: S3Client;
  bucketName: string;
  fileName: string;
  contentType: string;
  bytes: Uint8Array;
}) {
  const extension = path.extname(fileName).toLowerCase() || ".mp4";
  const objectKey = `uploads/${new Date().toISOString().slice(0, 10)}/${sanitizeFileName(fileName)}-${crypto.randomUUID()}${extension}`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      Body: bytes,
      ContentType: contentType,
    })
  );

  return {
    objectKey,
    s3Uri: `s3://${bucketName}/${objectKey}`,
  };
}

export function validateUpload(fileSize: number) {
  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    throw new Error("Select a video file before starting analysis.");
  }

  if (fileSize > MAX_VIDEO_BYTES) {
    throw new Error("This live API currently supports uploads up to 100 MB.");
  }
}

export async function analyzeVideoCompliance({
  bytes,
  contentType,
  fileName,
  selectedMarkets,
}: AnalyzeVideoParams): Promise<ComplianceAnalysisResponse> {
  const { region, bucketName, modelCandidates } = getRuntimeConfig();
  const s3Client = createS3Client(region);
  const bedrockClient = createBedrockClient(region);

  const { objectKey, s3Uri } = await uploadVideoToS3({
    client: s3Client,
    bucketName,
    fileName,
    contentType,
    bytes,
  });

  const videoFormat = getVideoFormat(contentType, fileName);
  const { modelId, report } = await invokeModelWithFallbacks({
    client: bedrockClient,
    modelCandidates,
    videoFormat,
    s3Uri,
    selectedMarkets,
  });

  const violations = normalizeViolations(report.violations, selectedMarkets);

  return {
    summary:
      report.summary?.trim() ||
      (violations.length > 0
        ? "Nova found market-specific issues that should be reviewed before release."
        : "Nova did not find clear policy risks in the selected markets."),
    complianceScore: calculateComplianceScore(violations),
    violations,
    selectedMarkets,
    modelId,
    objectKey,
    s3Uri,
    warnings: [AUDIO_WARNING],
  };
}
