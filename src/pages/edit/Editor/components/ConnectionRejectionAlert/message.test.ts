import { describe, expect, it } from "vitest";
import { describeConnectionRejection } from "./message";

describe("describeConnectionRejection", () => {
	it("names the bit widths fixed on each side", () => {
		expect(
			describeConnectionRejection({
				type: "bitWidthConflict",
				bitWidths: [[8], [4]],
			}),
		).toBe("ビット幅が合いません（8 bit と 4 bit）");
	});

	it("lists every width of a side already in conflict", () => {
		expect(
			describeConnectionRejection({
				type: "bitWidthConflict",
				bitWidths: [[2, 4], [2]],
			}),
		).toBe(
			"ビット幅がすでに食い違っている線にはつなげません（2/4 bit と 2 bit）",
		);
	});
});
