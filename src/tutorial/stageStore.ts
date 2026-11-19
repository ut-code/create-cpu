import CCStore, { CCStoreJsonError } from "../store";
import { CCStoreAutoSaver } from "../store/autoSaver";
import { importStoreJson } from "../store/savedStore";
import { forgetClearedStages } from "./progress";
import {
	setUpTutorialStage,
	type TutorialStage,
	tutorialStages,
} from "./stages";

function storageKeyOf(stage: TutorialStage) {
	return `ccTutorialStage:${stage.id}`;
}

// One store per stage for the whole visit, so that rendering twice reuses it
const storeByStageId = new Map<TutorialStage["id"], CCStore>();

function createStageStore(stage: TutorialStage, componentName: string) {
	const store = new CCStore({ storageKey: storageKeyOf(stage) });
	store.mount();
	setUpTutorialStage(store, stage, componentName);
	store.autoSaver.watch();
	return store;
}

function restoreStageStore(stage: TutorialStage): CCStore | null {
	const json = CCStoreAutoSaver.readSaved(storageKeyOf(stage));
	if (!json) return null;
	let store: CCStore;
	try {
		store = importStoreJson(json, { storageKey: storageKeyOf(stage) });
	} catch (error) {
		if (!(error instanceof CCStoreJsonError)) throw error;
		// Only a tutorial attempt is lost, so the stage starts over instead of asking
		console.warn(`The saved tutorial stage ${stage.id} is broken`, error);
		return null;
	}
	if (!store.components.get(stage.componentId)) return null;
	store.mount();
	store.autoSaver.watch();
	return store;
}

/**
 * The store of `stage` as the player left it, or laid out anew. It is saved once it
 * changes, so a stage that was only opened leaves nothing behind.
 */
export function getTutorialStageStore(
	stage: TutorialStage,
	componentName: string,
): CCStore {
	let store = storeByStageId.get(stage.id);
	if (!store) {
		store = restoreStageStore(stage) ?? createStageStore(stage, componentName);
		storeByStageId.set(stage.id, store);
	}
	return store;
}

// Removed from the storage first, so that the store keeps saving if that fails
function forgetStage(stage: TutorialStage) {
	window.localStorage.removeItem(storageKeyOf(stage));
	storeByStageId.get(stage.id)?.autoSaver.unwatch();
	storeByStageId.delete(stage.id);
}

export function resetTutorialStage(
	stage: TutorialStage,
	componentName: string,
): CCStore {
	forgetStage(stage);
	return getTutorialStageStore(stage, componentName);
}

/** Forget every stage and what was cleared, for the next player */
export function resetTutorial(): void {
	for (const stage of tutorialStages) forgetStage(stage);
	forgetClearedStages();
}
