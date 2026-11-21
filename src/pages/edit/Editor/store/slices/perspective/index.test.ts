import { describe, expect, it } from "vitest";
import { not } from "../../../../../../store/intrinsics/definitions";
import {
	createTestStore,
	registerTestComponent,
	registerTestNode,
} from "../../../../../../store/testUtils";
import { getCCComponentEditorRendererNodeGeometry } from "../../../renderer/Node/geometry";
import { createEditorStore } from "../..";
import { stubResizeObserver } from "../../testUtils";
import { errorFitPadding, isShownInRoom } from "./fit";

stubResizeObserver();

const rendererSize = { x: 900, y: 800 };
const perspective = { center: { x: 0, y: 0 }, scale: 1 };

function setUp() {
	const store = createTestStore();
	const root = registerTestComponent(store, "Root");
	const near = registerTestNode(store, root.id, not.component.id);
	store.nodes.update(near.id, { position: { x: 0, y: 0 } });
	const far = registerTestNode(store, root.id, not.component.id);
	store.nodes.update(far.id, { position: { x: 5000, y: 0 } });
	const editorStore = createEditorStore(root.id, store);
	editorStore.setState({ rendererSize, perspective });
	const isShown = (nodeId: typeof near.id) =>
		isShownInRoom(
			getCCComponentEditorRendererNodeGeometry(store, nodeId).rect,
			editorStore.getState().perspective,
			rendererSize,
			errorFitPadding,
		);
	return { store, root, near, far, editorStore, isShown };
}

describe("showNodes", () => {
	it("leaves the view as it is when the nodes are in it", () => {
		const { near, editorStore } = setUp();

		editorStore.getState().showNodes(new Set([near.id]));

		expect(editorStore.getState().perspective).toBe(perspective);
	});

	it("brings every node into view when one is out of it", () => {
		const { near, far, editorStore, isShown } = setUp();
		expect(isShown(far.id)).toBe(false);

		editorStore.getState().showNodes(new Set([far.id]));

		expect(isShown(far.id)).toBe(true);
		expect(isShown(near.id)).toBe(true);
	});

	it("ignores nodes of other components", () => {
		const { store, editorStore } = setUp();
		const other = registerTestComponent(store, "Other");
		const elsewhere = registerTestNode(store, other.id, not.component.id);
		store.nodes.update(elsewhere.id, { position: { x: 9000, y: 0 } });

		editorStore.getState().showNodes(new Set([elsewhere.id]));

		expect(editorStore.getState().perspective).toBe(perspective);
	});

	it("waits for the size of the renderer", () => {
		const { far, editorStore } = setUp();
		editorStore.setState({ rendererSize: { x: 0, y: 0 } });

		editorStore.getState().showNodes(new Set([far.id]));

		expect(editorStore.getState().perspective).toBe(perspective);
	});
});
