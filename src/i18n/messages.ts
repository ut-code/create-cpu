import { en, type Messages } from "./en";
import { ja } from "./ja";

export type { Messages };

export const languages = ["en", "ja"] as const;
export type Language = (typeof languages)[number];

export const messagesByLanguage: Record<Language, Messages> = { en, ja };

function isLanguage(value: unknown): value is Language {
	return languages.some((language) => language === value);
}

export function detectLanguage(
	savedLanguage: string | null,
	browserLanguages: readonly string[],
): Language {
	if (isLanguage(savedLanguage)) return savedLanguage;
	const preferred = browserLanguages
		.map((tag) => tag.toLowerCase().split("-")[0])
		.find(isLanguage);
	return preferred ?? "en";
}
