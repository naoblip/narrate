import { describe, expect, it, vi } from "vitest";
import { equipItem, equipItems, unequipItem } from "../src/services/inventory";
import { minimalWorld } from "./helpers";

const getAgentById = vi.fn();
const updateInventorySlots = vi.fn();

vi.mock("../src/db/queries/agents", () => ({
  getAgentById: (...args: unknown[]) => getAgentById(...args),
}));

vi.mock("../src/db/queries/inventory", () => ({
  INVENTORY_COLUMNS: {
    head: "inv_head",
    left_hand: "inv_left_hand",
    right_hand: "inv_right_hand",
  },
  updateInventorySlots: (...args: unknown[]) => updateInventorySlots(...args),
}));

describe("inventory service", () => {
  const world = {
    ...minimalWorld(),
    character_options: {
      ...minimalWorld().character_options,
      inventory: {
        head: ["Cap"],
        left_hand: ["Lantern"],
        right_hand: ["Torch"],
      },
    },
  };

  it("rejects unknown slot", async () => {
    getAgentById.mockResolvedValue({ id: "agent-1" });

    const result = await equipItem({} as any, world, "agent-1", "unknown", "Cap");
    expect(result.ok).toBe(false);
  });

  it("rejects duplicate item across slots", async () => {
    getAgentById.mockResolvedValue({
      id: "agent-1",
      inv_head: "Cap",
      inv_left_hand: null,
      inv_right_hand: null,
    });

    const result = await equipItem({} as any, world, "agent-1", "left_hand", "Cap");
    expect(result.ok).toBe(false);
  });

  it("bulk equip updates inventory", async () => {
    getAgentById.mockResolvedValue({
      id: "agent-1",
      inv_head: null,
      inv_left_hand: null,
      inv_right_hand: null,
    });
    updateInventorySlots.mockResolvedValue({
      inv_head: "Cap",
      inv_left_hand: "Lantern",
      inv_right_hand: null,
    });

    const result = await equipItems({} as any, world, "agent-1", {
      head: "Cap",
      left_hand: "Lantern",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.inventory.head).toBe("Cap");
    }
  });

  it("unequip clears slot", async () => {
    getAgentById.mockResolvedValue({
      id: "agent-1",
      inv_head: "Cap",
      inv_left_hand: null,
      inv_right_hand: null,
    });
    updateInventorySlots.mockResolvedValue({
      inv_head: null,
      inv_left_hand: null,
      inv_right_hand: null,
    });

    const result = await unequipItem({} as any, world, "agent-1", "head");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.inventory.head).toBe(null);
    }
  });
});
