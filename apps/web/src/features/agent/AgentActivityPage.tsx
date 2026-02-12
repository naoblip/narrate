import { FormEvent, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "../../lib/api/client";

export function AgentActivityPage() {
  const [inputAgentId, setInputAgentId] = useState("");
  const [agentId, setAgentId] = useState("");

  const activityQuery = useInfiniteQuery({
    queryKey: ["agent-activity", agentId],
    queryFn: ({ pageParam }) => api.getAgentActivity(agentId, 50, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
    enabled: Boolean(agentId),
    refetchInterval: 4_000,
  });

  const activity = activityQuery.data?.pages.flatMap((p) => p.activity) || [];
  const activityOldestFirst = [...activity].reverse();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAgentId(inputAgentId.trim());
  }

  return (
    <section className="card">
      <h2>Agent Activity</h2>
      <p className="muted">Shows activity authored by the agent plus entries shared with that agent.</p>
      <form className="hstack" onSubmit={onSubmit}>
        <input
          placeholder="Agent ID (UUID)"
          value={inputAgentId}
          onChange={(event) => setInputAgentId(event.target.value)}
        />
        <button type="submit">Lookup</button>
      </form>

      {!agentId ? <p className="muted">Enter an agent ID to load activity.</p> : null}
      {activityQuery.isPending ? <p>Loading activity...</p> : null}
      {activityQuery.isError ? <p>Failed to load activity: {activityQuery.error.message}</p> : null}
      {!activityQuery.isPending && agentId && activity.length === 0 ? <p className="muted">No activity found.</p> : null}

      <ul className="list">
        {activityOldestFirst.map((item) => {
          const sharedWithAgent = item.shared_with.some((sharedId) => sharedId === agentId);
          return (
            <li key={item.id}>
              <div className="hstack">
                <span className={`badge ${item.activity_type}`}>{item.activity_type}</span>
                <span className="muted">{new Date(item.created_at).toLocaleString()}</span>
              </div>
              <div>{item.statement}</div>
              <div className="muted">
                Agent: {item.agent_name ?? item.agent_id}
                {sharedWithAgent && item.agent_id !== agentId ? " (shared with this agent)" : ""}
              </div>
              <div className="muted">
                Place: {item.region} / {item.location} / {item.place}
              </div>
            </li>
          );
        })}
      </ul>

      <button
        disabled={!activityQuery.hasNextPage || activityQuery.isFetchingNextPage}
        onClick={() => activityQuery.fetchNextPage()}
      >
        {activityQuery.isFetchingNextPage ? "Loading..." : activityQuery.hasNextPage ? "Load more" : "No more"}
      </button>
    </section>
  );
}
