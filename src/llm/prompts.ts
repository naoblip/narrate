export type SummaryPromptInput = {
  areaType: "region" | "location" | "place";
  region: string;
  location?: string | null;
  place?: string | null;
  statements: Array<{ statement: string; agentId: string }>;
};

export function buildSummaryPrompt(input: SummaryPromptInput) {
  const areaLabel = input.areaType === "region"
    ? `Region: ${input.region}`
    : input.areaType === "location"
      ? `Location: ${input.region} / ${input.location}`
      : `Place: ${input.region} / ${input.location} / ${input.place}`;

  const lines = input.statements.map((s) => `- (${s.agentId}) ${s.statement}`);

  return [
    "Summarize the recent activity in this area as 3-5 sentences.",
    "Focus on concrete events, conflicts, and themes.",
    "Avoid introducing new facts not grounded in the statements.",
    "",
    areaLabel,
    "",
    "Statements:",
    ...lines,
  ].join("\n");
}
