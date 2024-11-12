import { createElement, type ComponentType } from "react";
import type CCStore from "..";
import { useStore } from ".";

export default function ensureStoreItem<P extends Record<string, unknown>>(
  check: (props: P, store: CCStore) => unknown,
  component: ComponentType<P>
): ComponentType<P> {
  return function EnsureStoreItem(props: P) {
    const { store } = useStore();
    if (!check(props, store)) return null;
    return createElement(component, props);
  };
}
