const response = {
  ok: true,
  json: async () => ({ agent: { id: "agent-1" }, api_key: "key" }),
  text: async () => "",
};

globalThis.fetch = async () => response;
