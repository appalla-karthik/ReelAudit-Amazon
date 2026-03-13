export type MarketRule = {
  market: string;
  focus: string[];
  prohibitedSignals: string[];
  recommendedActions: string[];
  notes: string[];
};

const MARKET_RULES: Record<string, MarketRule> = {
  UAE: {
    market: "UAE",
    focus: ["Alcohol visibility", "Adult content", "Religious sensitivity"],
    prohibitedSignals: [
      "Visible drinking, pouring, or brand-forward alcohol presentation",
      "Sexualized body focus or intimate acts",
      "Disrespectful use of religious or cultural symbols",
    ],
    recommendedActions: [
      "Blur or crop bottles and glasses",
      "Cut or replace sensitive shots",
      "Swap on-screen copy for neutral language",
    ],
    notes: ["Use a conservative threshold for nightlife and alcohol scenes."],
  },
  Germany: {
    market: "Germany",
    focus: ["Youth protection", "Hate/extremist symbolism", "Aggressive claims"],
    prohibitedSignals: [
      "Content that can be read as encouraging dangerous behavior for minors",
      "Restricted extremist symbols or violent propaganda styling",
      "Misleading urgency or exaggerated safety claims",
    ],
    recommendedActions: [
      "Remove or replace risky scenes",
      "Tone down promotional copy",
      "Add age-gating or regional cut where needed",
    ],
    notes: ["Treat visible symbols plus provocative captions as cross-modal risk."],
  },
  USA: {
    market: "USA",
    focus: ["Consumer deception", "Age-sensitive promotion", "Safety disclaimers"],
    prohibitedSignals: [
      "Unsupported product or performance claims",
      "Alcohol or risky behavior framed toward underage audiences",
      "Missing safety context for hazardous use",
    ],
    recommendedActions: [
      "Add substantiation or remove the claim",
      "Add disclaimers where required",
      "Re-edit scenes that glamorize unsafe behavior",
    ],
    notes: ["Prefer concrete visual evidence over broad assumptions."],
  },
  India: {
    market: "India",
    focus: ["Surrogate advertising", "Religious sensitivity", "Misleading claims"],
    prohibitedSignals: [
      "Alcohol-like branding disguised as lifestyle promotion",
      "Insensitive cultural or religious depictions",
      "Unverifiable superlative or medical-style claims",
    ],
    recommendedActions: [
      "Remove brand-forward alcohol cues",
      "Replace sensitive imagery",
      "Add compliant copy or substantiation",
    ],
    notes: ["Call out surrogate-style brand cues when they are prominent."],
  },
  "South Korea": {
    market: "South Korea",
    focus: ["Youth appeal", "Adult content", "Unsafe imitation"],
    prohibitedSignals: [
      "Youth-targeted styling around alcohol or risky acts",
      "Suggestive scenes unsuitable for broad audiences",
      "Dangerous acts presented as easy to copy",
    ],
    recommendedActions: [
      "Remove youth-coded cues",
      "Shorten or replace risky shots",
      "Add warning copy where applicable",
    ],
    notes: ["Be cautious with school-age styling and party scenes."],
  },
  Brazil: {
    market: "Brazil",
    focus: ["Alcohol promotion", "Consumer protection", "Sensitive audiences"],
    prohibitedSignals: [
      "Alcohol consumption glamorized without context",
      "Promises or guarantees that are not supportable",
      "Unsafe imitation cues for younger viewers",
    ],
    recommendedActions: [
      "Tone down glamor shots",
      "Remove unsupported claims",
      "Add compliance disclaimers",
    ],
    notes: ["Flag celebratory alcohol visuals when they dominate the scene."],
  },
};

export const POLICY_VERSION = "demo-policy-2026-03-14";

export function getRulesForMarkets(markets: string[]) {
  return markets.flatMap((market) => (MARKET_RULES[market] ? [MARKET_RULES[market]] : []));
}
