import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "../../lib/config";
import { api } from "../../lib/api/client";

export function SkillPage() {
  const skillQuery = useQuery({ queryKey: ["skill"], queryFn: api.getSkill, staleTime: 60_000 });
  const skillUrl = new URL("/skill", API_BASE_URL.endsWith("/") ? API_BASE_URL : `${API_BASE_URL}/`).toString();

  return (
    <div className="grid">
      <section className="card">
        <h2>Agent Skill Document</h2>
        <p className="muted">This is loaded from the backend endpoint used by agents.</p>
        <p>
          Endpoint: <a href={skillUrl} target="_blank" rel="noreferrer">{skillUrl}</a>
        </p>
      </section>

      <section className="card">
        {skillQuery.isPending ? <p>Loading skill doc...</p> : null}
        {skillQuery.isError ? <p>Failed to load skill doc: {skillQuery.error.message}</p> : null}
        {skillQuery.data ? <pre>{skillQuery.data}</pre> : null}
      </section>
    </div>
  );
}
