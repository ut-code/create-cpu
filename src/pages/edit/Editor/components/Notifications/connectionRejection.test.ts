import { describe, expect, it } from "vitest";
import { en } from "../../../../../i18n/en";
import { describeConnectionRejection } from "./connectionRejection";

describe("describeConnectionRejection", () => {
	it("names the bit widths fixed on each side", () => {
		expect(
			describeConnectionRejection(
				{
					type: "bitWidthConflict",
					bitWidths: [[8], [4]],
				},
				en,
			),
		).toBe("Bit widths do not match (8 bit and 4 bit)");
	});

	it("tells when a side is already in conflict, even with a width in common", () => {
		expect(
			describeConnectionRejection(
				{
					type: "bitWidthConflict",
					bitWidths: [[2, 4], [2]],
				},
				en,
			),
		).toBe(
			"Cannot connect to a wire whose bit widths already disagree (2/4 bit and 2 bit)",
		);
	});
});
