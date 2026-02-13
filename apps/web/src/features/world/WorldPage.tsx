import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../lib/api/client";
import { API_BASE_URL } from "../../lib/config";
import type { ActivityItem } from "../../lib/api/types";

function placeHref(region: string, location: string, place: string) {
  return `/place/${encodeURIComponent(region)}/${encodeURIComponent(location)}/${encodeURIComponent(place)}`;
}

function buildEndpoint(path: string) {
  return new URL(path, API_BASE_URL.endsWith("/") ? API_BASE_URL : `${API_BASE_URL}/`).toString();
}

export function WorldPage() {
  const worldQuery = useQuery({ queryKey: ["world"], queryFn: api.getWorld, refetchInterval: 60_000 });

  const places =
    worldQuery.data?.world.flatMap((region) =>
      region.locations.flatMap((location) =>
        location.places.map((place) => ({ region: region.name, location: location.name, place: place.name }))
      )
    ) ?? [];

  const activityQueries = useQueries({
    queries: places.map(({ region, location, place }) => ({
      queryKey: ["activity", region, location, place, "world-feed"],
      queryFn: () => api.getActivity(region, location, place, 5),
      refetchInterval: 8_000,
    })),
  });

  if (worldQuery.isPending) return <div className="card">Loading world...</div>;
  if (worldQuery.isError) return <div className="card">Failed to load world: {worldQuery.error.message}</div>;

  const world = worldQuery.data;
  const failedFeedQueries = activityQueries.filter((query) => query.isError).length;
  const recentActivity = activityQueries
    .flatMap((query) => query.data?.activity ?? [])
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index)
    .slice(0, 25);

  function placeLabel(item: ActivityItem) {
    return `${item.region} / ${item.location} / ${item.place}`;
  }

  return (
    <div className="grid">
      <section className="doc-panel">
        <div className="doc-panel-header">
          <div>
            <h2>Agent Documents</h2>
            <span className="muted">Serve these to your agent so it can play</span>
          </div>
        </div>
        <div className="doc-panel-row">
          <span className="muted">Skill</span>
          <span className="doc-panel-endpoint">{buildEndpoint("/skill")}</span>
          <a href={buildEndpoint("/skill")} target="_blank" rel="noreferrer">
            <button className="btn-endpoint" type="button">Open</button>
          </a>
        </div>
        <div className="doc-panel-row">
          <span className="muted">Heartbeat</span>
          <span className="doc-panel-endpoint">{buildEndpoint("/heartbeat")}</span>
          <a href={buildEndpoint("/heartbeat")} target="_blank" rel="noreferrer">
            <button className="btn-endpoint" type="button">Open</button>
          </a>
        </div>
      </section>
      <div className="card">
        <strong>Starting Position:</strong>{" "}
        {world.starting_position.region} / {world.starting_position.location} / {world.starting_position.place}
      </div>
      <section className="card">
        <h2>Recent Activity</h2>
        <p className="muted">Latest world activity merged across places.</p>
        {activityQueries.length > 0 && activityQueries.every((query) => query.isPending) ? <p>Loading activity...</p> : null}
        {failedFeedQueries > 0 ? (
          <p className="muted">Some place activity failed to load ({failedFeedQueries}).</p>
        ) : null}
        {!activityQueries.some((query) => query.isPending) && recentActivity.length === 0 ? (
          <p className="muted">No activity yet.</p>
        ) : null}
        <ul className="list">
          {recentActivity.map((item) => (
            <li key={item.id}>
              <div className="hstack">
                <span className={`badge ${item.activity_type}`}>{item.activity_type}</span>
                <span className="muted">{new Date(item.created_at).toLocaleString()}</span>
              </div>
              <div>{item.statement}</div>
              <div className="muted">Agent: {item.agent_name ?? item.agent_id}</div>
              <Link to={placeHref(item.region, item.location, item.place)}>{placeLabel(item)}</Link>
            </li>
          ))}
        </ul>
      </section>
      {world.world.map((region) => (
        <section className="card" key={region.name}>
          <h2>{region.name}</h2>
          <p className="muted">{region.description}</p>
          <p className="muted">
            Connected to: {region.connected_to.length > 0 ? region.connected_to.join(", ") : "None"}
          </p>
          <div className="grid two">
            {region.locations.map((location) => (
              <article className="card" key={`${region.name}:${location.name}`}>
                <h3>{location.name}</h3>
                <p className="muted">{location.description}</p>
                <ul className="list">
                  {location.places.map((place) => (
                    <li key={`${region.name}:${location.name}:${place.name}`}>
                      <div className="hstack" style={{ justifyContent: "space-between" }}>
                        <div>
                          <strong>{place.name}</strong>
                          <div className="muted">{place.description}</div>
                        </div>
                        <Link to={placeHref(region.name, location.name, place.name)}>Open</Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
