import { describe, expect, it } from "vitest";
import { mapWithConcurrency } from "../src";

describe("mapWithConcurrency", () => {
  it("preserves order and never exceeds the limit", async () => {
    let active = 0;
    let maximum = 0;

    const result = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (item) => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, item % 2 === 0 ? 4 : 1));
      active -= 1;
      return item * 2;
    });

    expect(result).toEqual([2, 4, 6, 8, 10]);
    expect(maximum).toBe(2);
  });
});
