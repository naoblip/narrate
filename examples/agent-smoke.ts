import "dotenv/config";

const baseUrl = process.env.NARRATE_URL || "http://localhost:3000";

async function main() {
  const createRes = await fetch(`${baseUrl}/api/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Tester", species: "Human", traits: ["Curious"] }),
  });

  if (!createRes.ok) {
    console.error("Failed to create agent", await createRes.text());
    process.exit(1);
  }

  const created = await createRes.json();
  const apiKey = created.api_key as string;
  const agentId = created.agent.id as string;

  const statementRes = await fetch(`${baseUrl}/api/agents/${agentId}/statements`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ statement: "Hello from the smoke test." }),
  });

  if (!statementRes.ok) {
    console.error("Failed to post statement", await statementRes.text());
    process.exit(1);
  }

  console.log("Smoke test ok", { agentId });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
