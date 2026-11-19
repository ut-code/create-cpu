import nullthrows from "nullthrows";
import type { Messages } from "../../i18n/messages";
import type CCStore from "../../store";
import type { CCComponentId } from "../../store/component";

const maxPlacesNamed = 3;

export function describeComponentDeletion(
	store: CCStore,
	componentId: CCComponentId,
	messages: Messages,
): string {
	const usages = store.nodes.getManyByComponentId(componentId);
	if (usages.length === 0) return messages.home.deleteDialog.unused;
	const places = [...new Set(usages.map((node) => node.parentComponentId))]
		.map((placeId) => nullthrows(store.components.get(placeId)).name)
		.sort((a, b) => a.localeCompare(b));
	return messages.home.deleteDialog.used(
		usages.length,
		places.slice(0, maxPlacesNamed),
		Math.max(places.length - maxPlacesNamed, 0),
	);
}
