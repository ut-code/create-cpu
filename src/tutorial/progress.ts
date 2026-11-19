import { type TutorialStageId, tutorialStageIds } from "./stages";

const progressStorageKey = "ccTutorialProgress";

function isStageId(value: unknown): value is TutorialStageId {
	return tutorialStageIds.some((id) => id === value);
}

// What was cleared only decorates the list of stages, so the tutorial goes on without
// the storage, which can be full, or blocked so that even reaching it throws
export function readClearedStages(): ReadonlySet<TutorialStageId> {
	try {
		const parsed: unknown = JSON.parse(
			window.localStorage.getItem(progressStorageKey) ?? "[]",
		);
		return new Set(Array.isArray(parsed) ? parsed.filter(isStageId) : []);
	} catch (error) {
		console.warn("Could not read the tutorial progress", error);
		return new Set();
	}
}

export function markStageCleared(id: TutorialStageId): void {
	const cleared = new Set(readClearedStages()).add(id);
	try {
		window.localStorage.setItem(
			progressStorageKey,
			JSON.stringify([...cleared]),
		);
	} catch (error) {
		console.warn("Could not save the tutorial progress", error);
	}
}

export function forgetClearedStages(): void {
	try {
		window.localStorage.removeItem(progressStorageKey);
	} catch (error) {
		console.warn("Could not forget the tutorial progress", error);
	}
}
