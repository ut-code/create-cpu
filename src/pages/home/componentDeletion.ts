import nullthrows from "nullthrows";
import type CCStore from "../../store";
import type { CCComponentId } from "../../store/component";

const maxPlacesNamed = 3;

export function describeComponentDeletion(
	store: CCStore,
	componentId: CCComponentId,
): string {
	const usages = store.nodes.getManyByComponentId(componentId);
	if (usages.length === 0) return "This cannot be undone.";
	const places = [...new Set(usages.map((node) => node.parentComponentId))]
		.map((placeId) => nullthrows(store.components.get(placeId)).name)
		.sort((a, b) => a.localeCompare(b));
	const named = places.slice(0, maxPlacesNamed).join(", ");
	const otherCount = places.length - maxPlacesNamed;
	const where =
		otherCount > 0
			? `${named} and ${otherCount} other ${otherCount === 1 ? "component" : "components"}`
			: named;
	const times = usages.length === 1 ? "once" : `${usages.length} times`;
	return `It is used ${times} in ${where}. Deleting it also removes those nodes and their connections. This cannot be undone.`;
}
