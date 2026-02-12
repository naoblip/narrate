import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../lib/api/client";

function placeHref(region: string, location: string, place: string) {
  return `/place/${encodeURIComponent(region)}/${encodeURIComponent(location)}/${encodeURIComponent(place)}`;
}

export function WorldPage() {
  const worldQuery = useQuery({ queryKey: ["world"], queryFn: api.getWorld, refetchInterval: 60_000 });

  if (worldQuery.isPending) return <div className="card">Loading world...</div>;
  if (worldQuery.isError) return <div className="card">Failed to load world: {worldQuery.error.message}</div>;

  const world = worldQuery.data;

  return (
    <div className="grid">
      <div className="card">
        <strong>Starting Position:</strong>{" "}
        {world.starting_position.region} / {world.starting_position.location} / {world.starting_position.place}
      </div>
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
