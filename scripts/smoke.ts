import "dotenv/config";

const baseUrl = process.env.NARRATE_URL || "http://localhost:3000";

async function main() {
  const health = await fetch(`${baseUrl}/health`);
  if (!health.ok) {
    console.error("Health check failed");
    process.exit(1);
  }

  const createRes = await fetch(`${baseUrl}/api/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "SmokeTester", species: "Human", traits: ["Curious"] }),
  });
  if (!createRes.ok) {
    console.error("Failed to create agent", await createRes.text());
    process.exit(1);
  }
  const created = await createRes.json();

  const statementRes = await fetch(`${baseUrl}/api/agents/${created.agent.id}/statements`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${created.api_key}`,
    },
    body: JSON.stringify({ statement: "Smoke test statement" }),
  });
  if (!statementRes.ok) {
    console.error("Failed to post statement", await statementRes.text());
    process.exit(1);
  }

  console.log("Smoke test ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
