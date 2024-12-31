import { type ComponentType, createElement } from "react";
import { useStore } from ".";
import type CCStore from "..";

export default function ensureStoreItem<P extends Record<string, unknown>>(
	check: (props: P, store: CCStore) => unknown,
	component: ComponentType<P>,
): ComponentType<P> {
	return function EnsureStoreItem(props: P) {
		const { store } = useStore();
		if (!check(props, store)) return null;
		return createElement(component, props);
	};
}
