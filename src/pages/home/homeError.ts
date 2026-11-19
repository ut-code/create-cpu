import type { Messages } from "../../i18n/messages";

export type HomeError =
	| { type: "read" | "notImportable" | "importFailed"; fileName: string }
	| { type: "storageFull" | "resetFailed" }
	| { type: "deleteFailed"; componentName: string };

export function describeHomeError(
	error: HomeError,
	messages: Messages,
): string {
	const texts = messages.home.errors;
	switch (error.type) {
		case "read":
		case "notImportable":
		case "importFailed":
			return texts[error.type](error.fileName);
		case "storageFull":
			return texts.storageFull;
		case "resetFailed":
			return texts.resetFailed;
		case "deleteFailed":
			return texts.deleteFailed(error.componentName);
	}
}
