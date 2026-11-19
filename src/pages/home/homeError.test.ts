import { describe, expect, it } from "vitest";
import { messagesByLanguage } from "../../i18n/messages";
import { describeHomeError } from "./homeError";

describe("describeHomeError", () => {
	it("words an error in the language shown", () => {
		const error = { type: "notImportable", fileName: "a.json" } as const;

		expect(describeHomeError(error, messagesByLanguage.en)).toBe(
			"Could not import a.json: it is not a file exported from this app, or it is damaged.",
		);
		expect(describeHomeError(error, messagesByLanguage.ja)).toBe(
			"a.json をインポートできません。このアプリからエクスポートしたファイルではないか、壊れています。",
		);
	});
});
