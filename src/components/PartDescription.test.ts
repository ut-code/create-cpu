import { describe, expect, it } from "vitest";
import { messagesByLanguage } from "../i18n/messages";
import {
	and,
	and_n,
	broadcast,
	decompose,
	display,
} from "../store/intrinsics/definitions";
import { pinNotesOf } from "./PartDescription";

const { en, ja } = messagesByLanguage;

describe("pinNotesOf", () => {
	it("tells how to set a pin whose bit width the player chooses", () => {
		expect(pinNotesOf(en, broadcast)).toEqual([
			"The number in the Out pin is its number of bits. Click the pin to change it.",
		]);
	});

	it("tells how to add pins where a pin can be split", () => {
		expect(pinNotesOf(en, and_n)).toEqual([
			'The number in the In pin is its number of bits. Click the pin to change it. "Add" adds another In pin.',
		]);
		expect(pinNotesOf(ja, decompose)).toEqual([
			"Out のピンの中の数字は、そのピンのビット数。ピンをクリックすると変えられる。「追加」で Out のピンを増やせる。",
		]);
	});

	it("says nothing of pins whose bit widths follow from elsewhere", () => {
		expect(pinNotesOf(en, and)).toEqual([]);
		expect(pinNotesOf(en, display)).toEqual([]);
	});
});
