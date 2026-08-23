import { describe, expect, test } from "vitest";
import { translate } from "#/lib/i18n";

describe("translate", () => {
	test("returns the bundled Gujarati message", () => {
		expect(translate("gu", "Search")).toBe("શોધો");
	});

	test("interpolates localized messages", () => {
		expect(
			translate("hi", "No matches for “{query}”.", { query: "Rajkot" })
		).toBe("“Rajkot” के लिए कोई परिणाम नहीं।");
	});

	test("keeps an untranslated message readable instead of failing", () => {
		expect(translate("gu", "A value from the database")).toBe(
			"A value from the database"
		);
	});
});
