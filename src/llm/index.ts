import { buildSummaryPrompt, SummaryPromptInput } from "./prompts";

export type LlmSummaryResult = {
  summary: string;
};

export async function summarize(input: SummaryPromptInput): Promise<LlmSummaryResult> {
  const provider = process.env.LLM_PROVIDER || "mock";
  const prompt = buildSummaryPrompt(input);

  if (provider === "mock") {
    const fallback = input.statements.slice(0, 5).map((s) => s.statement).join(" ");
    return { summary: fallback || "No recent activity." };
  }

  throw new Error(`LLM provider '${provider}' is not configured`);
}
