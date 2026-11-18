import nullthrows from "nullthrows";
import type CCStore from "../../store";
import type { CCComponentId } from "../../store/component";

export function describeComponentDeletion(
	store: CCStore,
	componentId: CCComponentId,
): string {
	const usages = store.nodes.getManyByComponentId(componentId);
	if (usages.length === 0) return "This cannot be undone.";
	const places = [...new Set(usages.map((node) => node.parentComponentId))].map(
		(placeId) => nullthrows(store.components.get(placeId)).name,
	);
	const times = usages.length === 1 ? "once" : `${usages.length} times`;
	return `It is used ${times} in ${places.join(", ")}. Deleting it also removes those nodes and their connections. This cannot be undone.`;
}
