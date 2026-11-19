import nullthrows from "nullthrows";
import type { MouseEvent } from "react";
import { describe, expect, it } from "vitest";
import { not, true_ } from "../../../../../../store/intrinsics/definitions";
import {
	connectTestNodePins,
	createTestStore,
	registerTestComponent,
	registerTestInputNode,
	registerTestNode,
	testNodePin,
} from "../../../../../../store/testUtils";
import { createEditorStore } from "../..";
import { stubResizeObserver } from "../../testUtils";
import { getContextMenuItems } from "./items";

stubResizeObserver();

const rightClick = { nativeEvent: { offsetX: 10, offsetY: 20 } } as MouseEvent;

function setUp() {
	const store = createTestStore();
	const sub = registerTestComponent(store, "Sub");
	const root = registerTestComponent(store, "Root");
	const intrinsicNode = registerTestNode(store, root.id, true_.component.id);
	const subNode = registerTestNode(store, root.id, sub.id);
	const inverter = registerTestNode(store, root.id, not.component.id);
	connectTestNodePins(
		store,
		root.id,
		testNodePin(store, intrinsicNode, true_.outputPin.Out),
		testNodePin(store, inverter, not.inputPin.In),
	);
	const [connection] = store.connections.getMany();
	const editorStore = createEditorStore(root.id, store);
	return {
		store,
		editorStore,
		inverter,
		intrinsicNode,
		subNode,
		connectionId: nullthrows(connection).id,
	};
}

describe("Context menu slice", () => {
	it("closes the menu when the editor mode changes", () => {
		const { editorStore, subNode } = setUp();
		editorStore.getState().selectNode([subNode.id], true);

		editorStore.getState().openContextMenu(rightClick);
		expect(editorStore.getState().contextMenuState).not.toBeNull();
		editorStore.getState().setEditorMode("play");
		expect(editorStore.getState().editorMode).toBe("play");
		expect(editorStore.getState().contextMenuState).toBeNull();

		editorStore.getState().openContextMenu(rightClick);
		expect(editorStore.getState().contextMenuState).not.toBeNull();
		editorStore.getState().setEditorMode("edit");
		expect(editorStore.getState().contextMenuState).toBeNull();
	});

	it("opens no menu while playing for a selection that only allows editing", () => {
		const { editorStore, intrinsicNode, subNode, connectionId } = setUp();
		editorStore.getState().setEditorMode("play");
		expect(editorStore.getState().editorMode).toBe("play");

		editorStore.getState().selectNode([intrinsicNode.id], true);
		editorStore.getState().openContextMenu(rightClick);
		expect(editorStore.getState().contextMenuState).toBeNull();

		editorStore.getState().selectConnection([connectionId], true);
		editorStore.getState().openContextMenu(rightClick);
		expect(editorStore.getState().contextMenuState).toBeNull();

		editorStore.getState().selectNode([subNode.id], true);
		editorStore.getState().openContextMenu(rightClick);
		expect(editorStore.getState().contextMenuState).not.toBeNull();
	});

	it("closes the menu when the selection leaves it without items", () => {
		const { editorStore, subNode } = setUp();
		editorStore.getState().selectNode([subNode.id], true);
		editorStore.getState().openContextMenu(rightClick);
		expect(editorStore.getState().contextMenuState).not.toBeNull();

		editorStore.getState().selectNode([], true);

		expect(editorStore.getState().contextMenuState).toBeNull();
	});

	it("closes the menu while playing once an intrinsic node is selected", () => {
		const { editorStore, intrinsicNode, subNode } = setUp();
		editorStore.getState().setEditorMode("play");
		editorStore.getState().selectNode([subNode.id], true);
		editorStore.getState().openContextMenu(rightClick);
		expect(editorStore.getState().contextMenuState).not.toBeNull();

		editorStore.getState().selectNode([intrinsicNode.id], true);

		expect(editorStore.getState().contextMenuState).toBeNull();
	});

	it("keeps the menu open when the selection still has items", () => {
		const { editorStore, intrinsicNode, subNode } = setUp();
		editorStore.getState().selectNode([subNode.id], true);
		editorStore.getState().openContextMenu(rightClick);

		editorStore.getState().selectNode([intrinsicNode.id], true);

		expect(editorStore.getState().contextMenuState).not.toBeNull();
	});

	it("protects nothing unless told to", () => {
		const { store, editorStore, intrinsicNode, inverter } = setUp();
		editorStore.getState().selectNode([intrinsicNode.id, inverter.id], true);

		expect(getContextMenuItems(store, editorStore.getState())).toMatchObject({
			removableNodeIds: [intrinsicNode.id, inverter.id],
		});
	});

	it("keeps protected nodes from deleting and moving, and names them", () => {
		const store = createTestStore();
		const root = registerTestComponent(store, "Root");
		const pin = registerTestInputNode(store, root.id, "A");
		const gate = registerTestNode(store, root.id, not.component.id);
		connectTestNodePins(
			store,
			root.id,
			pin.out,
			testNodePin(store, gate, not.inputPin.In),
		);
		const editorStore = createEditorStore(root.id, store, {
			isProtectedNode: (nodeId) => nodeId === pin.node.id,
		});
		const items = () => getContextMenuItems(store, editorStore.getState());

		editorStore.getState().selectNode([pin.node.id, gate.id], true);
		expect(items()).toMatchObject({
			removableNodeIds: [gate.id],
			keptNodeNames: ["A"],
			canDelete: true,
		});

		editorStore.getState().selectNode([pin.node.id], true);
		expect(items()).toMatchObject({ keptNodeNames: ["A"], canDelete: false });
		editorStore.getState().openContextMenu(rightClick);
		expect(editorStore.getState().contextMenuState).not.toBeNull();

		editorStore.getState().setEditorMode("play");
		expect(editorStore.getState().editorMode).toBe("play");
		editorStore.getState().openContextMenu(rightClick);
		expect(editorStore.getState().contextMenuState).toBeNull();
	});

	it("offers no new component when the editor is told not to", () => {
		const { store, editorStore, inverter } = setUp();
		const closed = createEditorStore(
			editorStore.getState().componentId,
			store,
			{
				canCreateComponents: false,
			},
		);
		editorStore.getState().selectNode([inverter.id], true);
		closed.getState().selectNode([inverter.id], true);

		expect(getContextMenuItems(store, editorStore.getState()).canExtract).toBe(
			true,
		);
		expect(getContextMenuItems(store, closed.getState())).toMatchObject({
			canExtract: false,
			canDelete: true,
		});
	});
});
