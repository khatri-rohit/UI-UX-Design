import { GenerationPlatform } from "./types";

type PromptEnhancerInput = {
  prompt: string;
  platform: GenerationPlatform;
};

const SKILL_SYSTEM_RULES = [
  "Use a deliberate visual concept with strong hierarchy and non-generic composition.",
  "Prefer shadcn-style structure and semantic HTML patterns for controls and layout.",
  "Use a token mindset for color and spacing decisions (surface, primary, accent, muted).",
  "Ensure clear states for interactive controls: hover, focus-visible, active, disabled.",
  "Keep the design faithful to requested scope; never invent unrelated product features.",
];

const PLATFORM_RULES: Record<GenerationPlatform, string[]> = {
  mobile: [
    "Target mobile-first composition with thumb-friendly spacing and readable typography.",
    "Use compact vertical rhythm and avoid oversized desktop-like gutters.",
  ],
  web: [
    "Target desktop web layout with natural full-page vertical flow.",
    "Allow content sections to stack with realistic page height.",
  ],
};

export function buildEnhancedPrompt({
  prompt,
  platform,
}: PromptEnhancerInput): string {
  const cleanedPrompt = prompt.trim();

  return [
    "USER INTENT:",
    cleanedPrompt,
    "",
    "EXECUTION RULES:",
    ...SKILL_SYSTEM_RULES.map((line) => `- ${line}`),
    ...PLATFORM_RULES[platform].map((line) => `- ${line}`),
    "- Do not produce boilerplate template UI unless the prompt explicitly asks for it.",
    "- Do not add features, sections, or data models not requested by the prompt.",
  ].join("\n");
}
