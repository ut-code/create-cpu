import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import invariant from "tiny-invariant";
import { readSavedLanguage, saveLanguage } from "./languageStorage";
import { detectLanguage, type Language, messagesByLanguage } from "./messages";

export * from "./messages";

const context = createContext<{
	language: Language;
	setLanguage(language: Language): void;
} | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
	const [language, setDisplayedLanguage] = useState(() =>
		detectLanguage(
			readSavedLanguage(() => window.localStorage),
			navigator.languages,
		),
	);
	useEffect(() => {
		document.documentElement.lang = language;
	}, [language]);
	// Only a choice is saved, so that a detected language keeps following the browser
	const setLanguage = useCallback((chosen: Language) => {
		setDisplayedLanguage(chosen);
		saveLanguage(() => window.localStorage, chosen);
	}, []);
	const value = useMemo(
		() => ({ language, setLanguage }),
		[language, setLanguage],
	);
	return <context.Provider value={value}>{children}</context.Provider>;
}

export function useLanguage() {
	const value = useContext(context);
	invariant(value, "useLanguage must be used within a LanguageProvider");
	return value;
}

export function useMessages() {
	return messagesByLanguage[useLanguage().language];
}
