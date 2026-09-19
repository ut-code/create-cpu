import nullthrows from "nullthrows";
import { describe, expect, it } from "vitest";
import CCStore from ".";
import { type CCComponent, CCComponentStore } from "./component";
import type { CCComponentPinId } from "./componentPin";
import { CCConnectionStore } from "./connection";
import type { IntrinsicComponentDefinition } from "./intrinsics/base";
import * as intrinsics from "./intrinsics/definitions";
import { type CCNodeId, CCNodeStore } from "./node";
import { CCNodePinStore } from "./nodePin";

function createRootStore() {
	const store = new CCStore();
	store.mount();
	const rootComponent = CCComponentStore.create({ name: "Root" });
	store.components.register(rootComponent);
	return { store, rootComponent };
}

function registerNode(
	store: CCStore,
	rootComponent: CCComponent,
	// biome-ignore lint/suspicious/noExplicitAny: the spec of the definition is irrelevant here
	definition: IntrinsicComponentDefinition<any>,
) {
	const node = CCNodeStore.create({
		parentComponentId: rootComponent.id,
		componentId: definition.component.id,
		position: { x: 0, y: 0 },
	});
	store.nodes.register(node);
	return node;
}

function getNodePinBitWidth(
	store: CCStore,
	nodeId: CCNodeId,
	componentPinId: CCComponentPinId,
) {
	const nodePin = nullthrows(
		store.nodePins
			.getManyByNodeId(nodeId)
			.find((pin) => pin.componentPinId === componentPinId),
	);
	return store.nodePins.getNodePinBitWidthStatus(nodePin.id);
}

describe("Node pin store", () => {
	describe("getNodePinBitWidthStatus", () => {
		it("should calculate the bit width of a display pin from the config of its node", () => {
			const { store, rootComponent } = createRootStore();
			const displayNode = registerNode(
				store,
				rootComponent,
				intrinsics.display,
			);

			expect(
				getNodePinBitWidth(
					store,
					displayNode.id,
					intrinsics.display.inputPin.Pixels.id,
				),
			).toEqual({ isFixed: true, bitWidth: 20 * 15 });

			store.nodes.update(displayNode.id, {
				config: { resolution: { x: 4, y: 3 } },
			});

			expect(
				getNodePinBitWidth(
					store,
					displayNode.id,
					intrinsics.display.inputPin.Pixels.id,
				),
			).toEqual({ isFixed: true, bitWidth: 4 * 3 });
		});

		it("should propagate the bit width of a display pin to the pins connected to it", () => {
			const { store, rootComponent } = createRootStore();
			const displayNode = registerNode(
				store,
				rootComponent,
				intrinsics.display,
			);
			store.nodes.update(displayNode.id, {
				config: { resolution: { x: 4, y: 3 } },
			});
			const inputNode = registerNode(store, rootComponent, intrinsics.input);
			const inputNodePin = nullthrows(
				store.nodePins
					.getManyByNodeId(inputNode.id)
					.find(
						(pin) => pin.componentPinId === intrinsics.input.outputPin.Out.id,
					),
			);
			const pixelsNodePin = nullthrows(
				store.nodePins
					.getManyByNodeId(displayNode.id)
					.find(
						(pin) =>
							pin.componentPinId === intrinsics.display.inputPin.Pixels.id,
					),
			);
			store.connections.register(
				CCConnectionStore.create({
					parentComponentId: rootComponent.id,
					from: inputNodePin.id,
					to: pixelsNodePin.id,
					bentPortion: 0.5,
				}),
			);

			expect(store.nodePins.getNodePinBitWidthStatus(inputNodePin.id)).toEqual({
				isFixed: true,
				bitWidth: 4 * 3,
			});
		});
		it("should sum up the manual bit widths of the input pins of an aggregate node", () => {
			const { store, rootComponent } = createRootStore();
			const node = registerNode(store, rootComponent, intrinsics.aggregate);
			const firstInputNodePin = nullthrows(
				store.nodePins
					.getManyByNodeId(node.id)
					.find(
						(pin) => pin.componentPinId === intrinsics.aggregate.inputPin.In.id,
					),
			);
			store.nodePins.update(firstInputNodePin.id, { manualBitWidth: 5 });
			store.nodePins.register(
				CCNodePinStore.create({
					nodeId: node.id,
					componentPinId: intrinsics.aggregate.inputPin.In.id,
					order: firstInputNodePin.order + 1,
					manualBitWidth: 3,
				}),
			);

			expect(
				store.nodePins.getNodePinBitWidthStatus(firstInputNodePin.id),
			).toEqual({ isFixed: true, bitWidth: 5 });
			expect(
				getNodePinBitWidth(
					store,
					node.id,
					intrinsics.aggregate.outputPin.Out.id,
				),
			).toEqual({ isFixed: true, bitWidth: 8 });
		});

		it("should sum up the manual bit widths of the output pins of a decompose node", () => {
			const { store, rootComponent } = createRootStore();
			const node = registerNode(store, rootComponent, intrinsics.decompose);
			const firstOutputNodePin = nullthrows(
				store.nodePins
					.getManyByNodeId(node.id)
					.find(
						(pin) =>
							pin.componentPinId === intrinsics.decompose.outputPin.Out.id,
					),
			);
			store.nodePins.update(firstOutputNodePin.id, { manualBitWidth: 2 });
			store.nodePins.register(
				CCNodePinStore.create({
					nodeId: node.id,
					componentPinId: intrinsics.decompose.outputPin.Out.id,
					order: firstOutputNodePin.order + 1,
					manualBitWidth: 6,
				}),
			);

			expect(
				getNodePinBitWidth(store, node.id, intrinsics.decompose.inputPin.In.id),
			).toEqual({ isFixed: true, bitWidth: 8 });
		});

		it("should reject a node pin of a configurable component pin without a manual bit width", () => {
			const { store, rootComponent } = createRootStore();
			const node = registerNode(store, rootComponent, intrinsics.broadcast);
			const outputNodePin = nullthrows(
				store.nodePins
					.getManyByNodeId(node.id)
					.find(
						(pin) =>
							pin.componentPinId === intrinsics.broadcast.outputPin.Out.id,
					),
			);
			store.nodePins.update(outputNodePin.id, { manualBitWidth: null });

			expect(() =>
				store.nodePins.getNodePinBitWidthStatus(outputNodePin.id),
			).toThrow(/must have a positive manual bit width/);
		});

		it("should broadcast a single bit to the manually specified bit width", () => {
			const { store, rootComponent } = createRootStore();
			const node = registerNode(store, rootComponent, intrinsics.broadcast);
			const outputNodePin = nullthrows(
				store.nodePins
					.getManyByNodeId(node.id)
					.find(
						(pin) =>
							pin.componentPinId === intrinsics.broadcast.outputPin.Out.id,
					),
			);
			store.nodePins.update(outputNodePin.id, { manualBitWidth: 7 });

			expect(
				getNodePinBitWidth(store, node.id, intrinsics.broadcast.inputPin.In.id),
			).toEqual({ isFixed: true, bitWidth: 1 });
			expect(store.nodePins.getNodePinBitWidthStatus(outputNodePin.id)).toEqual(
				{
					isFixed: true,
					bitWidth: 7,
				},
			);
		});
	});

	describe("bit width consistency of connections", () => {
		function connectBroadcastToDisplay(bitWidth: number) {
			const { store, rootComponent } = createRootStore();
			const displayNode = registerNode(
				store,
				rootComponent,
				intrinsics.display,
			);
			const broadcastNode = registerNode(
				store,
				rootComponent,
				intrinsics.broadcast,
			);
			const pixelsNodePin = nullthrows(
				store.nodePins
					.getManyByNodeId(displayNode.id)
					.find(
						(pin) =>
							pin.componentPinId === intrinsics.display.inputPin.Pixels.id,
					),
			);
			const broadcastOutNodePin = nullthrows(
				store.nodePins
					.getManyByNodeId(broadcastNode.id)
					.find(
						(pin) =>
							pin.componentPinId === intrinsics.broadcast.outputPin.Out.id,
					),
			);
			store.nodePins.update(broadcastOutNodePin.id, {
				manualBitWidth: bitWidth,
			});
			store.connections.register(
				CCConnectionStore.create({
					parentComponentId: rootComponent.id,
					from: broadcastOutNodePin.id,
					to: pixelsNodePin.id,
					bentPortion: 0.5,
				}),
			);
			expect(store.connections.getMany()).toHaveLength(1);
			return { store, displayNode };
		}

		it("should drop the connections that a display config change makes inconsistent", () => {
			const { store, displayNode } = connectBroadcastToDisplay(20 * 15);

			store.nodes.update(displayNode.id, {
				config: { resolution: { x: 4, y: 3 } },
			});

			expect(store.connections.getMany()).toHaveLength(0);
		});

		it("should keep the connections that stay consistent across a display config change", () => {
			const { store, displayNode } = connectBroadcastToDisplay(20 * 15);

			store.nodes.update(displayNode.id, {
				config: { resolution: { x: 15, y: 20 } },
			});

			expect(store.connections.getMany()).toHaveLength(1);
		});
	});
});
