import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api } from "../../lib/api/client";

function decodePart(value: string | undefined) {
  try {
    return decodeURIComponent(value || "");
  } catch {
    return "";
  }
}

export function PlacePage() {
  const params = useParams();
  const region = decodePart(params.region);
  const location = decodePart(params.location);
  const place = decodePart(params.place);

  const worldQuery = useQuery({ queryKey: ["world"], queryFn: api.getWorld, refetchInterval: 60_000 });

  const activityQuery = useInfiniteQuery({
    queryKey: ["activity", region, location, place],
    queryFn: ({ pageParam }) => api.getActivity(region, location, place, 50, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
    refetchInterval: 4_000,
  });

  const agentsQuery = useInfiniteQuery({
    queryKey: ["agents", region, location, place],
    queryFn: ({ pageParam }) => api.getAgentsAtPlace(region, location, place, 50, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
    refetchInterval: 10_000,
  });

  const summaryQuery = useQuery({
    queryKey: ["summary", region, location, place],
    queryFn: () => api.getPlaceSummary(region, location, place),
    refetchInterval: 45_000,
  });

  if (!region || !location || !place) return <div className="card">Invalid place path.</div>;

  const activity = activityQuery.data?.pages.flatMap((p) => p.activity) || [];
  const agents = agentsQuery.data?.pages.flatMap((p) => p.agents) || [];
  const agentNameById = new Map(agents.map((agent) => [agent.id, agent.name]));
  const activityOldestFirst = [...activity].reverse();

  return (
    <div className="grid two">
      <section className="card">
        <h2>
          {region} / {location} / {place}
        </h2>
        <p>
          <Link to="/world">Back to world</Link>
        </p>
        <h3>Activity</h3>
        {activityQuery.isPending ? <p>Loading activity...</p> : null}
        {activityQuery.isError ? <p>Failed to load activity: {activityQuery.error.message}</p> : null}
        {!activityQuery.isPending && activity.length === 0 ? <p className="muted">No activity yet.</p> : null}
        <ul className="list">
          {activityOldestFirst.map((item) => (
            <li key={item.id}>
              <div className="hstack">
                <span className={`badge ${item.activity_type}`}>{item.activity_type}</span>
                <span className="muted">{new Date(item.created_at).toLocaleString()}</span>
              </div>
              <div>{item.statement}</div>
              <div className="muted">Agent: {item.agent_name ?? agentNameById.get(item.agent_id) ?? item.agent_id}</div>
            </li>
          ))}
        </ul>
        <button
          disabled={!activityQuery.hasNextPage || activityQuery.isFetchingNextPage}
          onClick={() => activityQuery.fetchNextPage()}
        >
          {activityQuery.isFetchingNextPage ? "Loading..." : activityQuery.hasNextPage ? "Load more" : "No more"}
        </button>
      </section>

      <section className="grid">
        <article className="card">
          <h3>Agents Here</h3>
          {agentsQuery.isPending ? <p>Loading agents...</p> : null}
          {agentsQuery.isError ? <p>Failed to load agents: {agentsQuery.error.message}</p> : null}
          {!agentsQuery.isPending && agents.length === 0 ? <p className="muted">No agents present.</p> : null}
          <ul className="list">
            {agents.map((agent) => (
              <li key={agent.id}>
                <div>
                  <strong>{agent.name}</strong> <span className="muted">({agent.species})</span>
                </div>
                <div className="muted">Traits: {agent.traits.join(", ")}</div>
              </li>
            ))}
          </ul>
          <button
            disabled={!agentsQuery.hasNextPage || agentsQuery.isFetchingNextPage}
            onClick={() => agentsQuery.fetchNextPage()}
          >
            {agentsQuery.isFetchingNextPage ? "Loading..." : agentsQuery.hasNextPage ? "Load more" : "No more"}
          </button>
        </article>

        <article className="card">
          <h3>Place Summary</h3>
          {summaryQuery.isPending ? <p>Loading summary...</p> : null}
          {summaryQuery.isError ? <p>Failed to load summary: {summaryQuery.error.message}</p> : null}
          {!summaryQuery.isPending && !summaryQuery.data?.summary ? <p className="muted">No summary yet.</p> : null}
          {summaryQuery.data?.summary ? (
            <>
              <p>{summaryQuery.data.summary.summary}</p>
              <p className="muted">
                Generated: {new Date(summaryQuery.data.summary.generated_at).toLocaleString()} | Activity: {" "}
                {summaryQuery.data.summary.activity_count}
              </p>
            </>
          ) : null}
        </article>

        {worldQuery.data ? (
          <article className="card">
            <h3>Quick Jump</h3>
            <p className="muted">Open a different place.</p>
            <ul className="list">
              {worldQuery.data.world.flatMap((r) =>
                r.locations.flatMap((l) =>
                  l.places.map((p) => (
                    <li key={`${r.name}:${l.name}:${p.name}`}>
                      <Link to={`/place/${encodeURIComponent(r.name)}/${encodeURIComponent(l.name)}/${encodeURIComponent(p.name)}`}>
                        {r.name} / {l.name} / {p.name}
                      </Link>
                    </li>
                  ))
                )
              )}
            </ul>
          </article>
        ) : null}
      </section>
    </div>
  );
}
