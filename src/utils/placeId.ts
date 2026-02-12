export type PlaceId = {
  region: string;
  location: string;
  place: string;
};

const INVALID_PART = /:/;

export function buildPlaceId(region: string, location: string, place: string): string {
  if (INVALID_PART.test(region) || INVALID_PART.test(location) || INVALID_PART.test(place)) {
    throw new Error("Place id parts must not include ':'");
  }
  return `${region}:${location}:${place}`;
}

export function parsePlaceId(id: string): PlaceId {
  const parts = id.split(":");
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    throw new Error("Invalid place id; expected Region:Location:Place");
  }
  const [region, location, place] = parts;
  return { region, location, place };
}
