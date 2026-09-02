import { describe, expect, it } from "vitest";
import { getBillingCycleOptions, getBillingPriceForCycle } from "./planUtils";

describe("quarterly billing support", () => {
  it("includes quarterly among the supported billing cycles", () => {
    const options = getBillingCycleOptions();
    expect(options.map((option) => option.key)).toContain("quarterly");
  });

  it("calculates quarterly pricing as three monthly payments", () => {
    expect(
      getBillingPriceForCycle(
        { monthlyPrice: 200, yearlyPrice: 2200 },
        "quarterly",
      ),
    ).toBe(600);
  });
});
