import type CCStore from "../../store";
import {
	type CCComponent,
	type CCComponentId,
	isIncluding,
} from "../../store/component";

export type OffersComponent = (
	component: CCComponent,
	editedComponentId: CCComponentId,
) => boolean;

// A drop can carry any id, e.g. one dragged from another tab
export function canPlaceComponent(
	store: CCStore,
	editedComponentId: CCComponentId,
	componentId: CCComponentId,
	isOffered: OffersComponent,
): boolean {
	const component = store.components.get(componentId);
	return (
		!!component &&
		component.id !== editedComponentId &&
		!isIncluding(store, component.id, editedComponentId) &&
		isOffered(component, editedComponentId)
	);
}
