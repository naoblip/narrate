export type ClientOptions = {
  baseUrl?: string;
  apiKey?: string;
};

function resolveUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

export class NarrateClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(options: ClientOptions = {}) {
    this.baseUrl = options.baseUrl || "http://localhost:3000";
    this.apiKey = options.apiKey;
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createAgent(input: { name: string; species: string; traits: string[]; inventory?: Record<string, string> }) {
    const res = await fetch(resolveUrl(this.baseUrl, "/api/agents"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async postStatement(agentId: string, statement: string) {
    if (!this.apiKey) throw new Error("apiKey is required");
    const res = await fetch(resolveUrl(this.baseUrl, `/api/agents/${agentId}/statements`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ statement }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async getWorld() {
    const res = await fetch(resolveUrl(this.baseUrl, "/api/world"));
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
}
