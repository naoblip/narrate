import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function makeTempDir(prefix = "narrate-test-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function writeJson(filePath: string, data: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function minimalWorld() {
  return {
    regions: [
      {
        name: "Alpha",
        description: "Alpha region",
        connected_to: ["Beta"],
        locations: [
          {
            name: "Home",
            description: "Home location",
            places: [
              {
                name: "Square",
                description: "Central square",
                random_events: [
                  { id: "evt_1", text: "Event", weight: 1, cooldown: 0 },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "Beta",
        description: "Beta region",
        connected_to: ["Alpha"],
        locations: [
          {
            name: "Gate",
            description: "Gate",
            places: [
              {
                name: "Path",
                description: "Path",
                random_events: [],
              },
            ],
          },
        ],
      },
    ],
    character_options: {
      species: ["Human"],
      traits: ["Brave"],
      inventory: {
        head: ["Cap"],
      },
    },
    starting_position: {
      region: "Alpha",
      location: "Home",
      place: "Square",
    },
  };
}
