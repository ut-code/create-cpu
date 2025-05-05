import { KDTree } from "mnemonist";
import nullthrows from "nullthrows";
import { type PointerEvent, type ReactNode, useState } from "react";
import { theme } from "../../../../common/theme";
import { type Vector2, vector2 } from "../../../../common/vector2";
import { useDraggable } from "../../../../hooks/drag";
import { CCConnectionStore } from "../../../../store/connection";
import type { CCNodePinId } from "../../../../store/nodePin";
import { useStore } from "../../../../store/react";
import { useComponentEditorStore } from "../store";
import type { SimulationValue } from "../store/slices/core";
import { CCComponentEditorRendererConnectionCore } from "./Connection";
import getCCComponentEditorRendererNodeGeometry from "./Node.geometry";

const NODE_PIN_POSITION_SENSITIVITY = 10;

export type CCComponentEditorRendererNodePinProps = {
	nodePinId: CCNodePinId;
	position: Vector2;
};
export const CCComponentEditorRendererNodePinConstants = {
	SIZE: 10,
};
export default function CCComponentEditorRendererNodePin({
	nodePinId,
	position,
}: CCComponentEditorRendererNodePinProps) {
	const { store } = useStore();
	const componentEditorState = useComponentEditorStore()();
	const nodePin = nullthrows(store.nodePins.get(nodePinId));
	const node = nullthrows(store.nodes.get(nodePin.nodeId));
	const componentPin = nullthrows(
		store.componentPins.get(nodePin.componentPinId),
	);

	const [draggingState, setDraggingState] = useState<{
		cursorPosition: Vector2;
		nodePinPositionKDTree: KDTree<CCNodePinId>;
	} | null>(null);
	let draggingView: ReactNode = null;
	let nodePinIdToConnect: CCNodePinId | null = null;
	if (draggingState) {
		const nearestNodePinId =
			draggingState.nodePinPositionKDTree.nearestNeighbor([
				draggingState.cursorPosition.x,
				draggingState.cursorPosition.y,
			]);
		const nearestNodePin = nullthrows(store.nodePins.get(nearestNodePinId));
		const nearestNodePinPosition = nullthrows(
			getCCComponentEditorRendererNodeGeometry(
				store,
				nearestNodePin.nodeId,
			).nodePinPositionById.get(nearestNodePinId),
		);
		const distance = Math.hypot(
			nearestNodePinPosition.x - draggingState.cursorPosition.x,
			nearestNodePinPosition.y - draggingState.cursorPosition.y,
		);
		if (distance < NODE_PIN_POSITION_SENSITIVITY) {
			nodePinIdToConnect = nearestNodePinId;
		}
		draggingView = (
			<CCComponentEditorRendererConnectionCore
				from={position}
				to={
					nodePinIdToConnect
						? nearestNodePinPosition
						: draggingState.cursorPosition
				}
			/>
		);
	}
	const draggableProps = useDraggable({
		onDrag: (e: PointerEvent) => {
			let nodePinPositionKDTree = draggingState?.nodePinPositionKDTree;
			if (!nodePinPositionKDTree) {
				const nodes = store.nodes.getManyByParentComponentId(
					node.parentComponentId,
				);
				nodePinPositionKDTree = KDTree.from(
					nodes
						.filter((yourNode) => yourNode.id !== node.id)
						.flatMap((yourNode) => [
							...getCCComponentEditorRendererNodeGeometry(store, yourNode.id)
								.nodePinPositionById,
						])
						.flatMap(([yourNodePinId, yourNodePinPosition]) => {
							const yourNodePin = nullthrows(store.nodePins.get(yourNodePinId));
							const yourComponentPin = nullthrows(
								store.componentPins.get(yourNodePin.componentPinId),
							);
							if (yourComponentPin.type === componentPin.type) return [];
							return [
								[yourNodePinId, [yourNodePinPosition.x, yourNodePinPosition.y]],
							] as const;
						}),
					2,
				);
			}
			setDraggingState({
				cursorPosition: componentEditorState.fromCanvasToStage(
					vector2.fromDomEvent(e.nativeEvent),
				),
				nodePinPositionKDTree,
			});
		},
		onDragEnd: () => {
			if (nodePinIdToConnect) {
				const route = {
					input: { from: nodePinIdToConnect, to: nodePin.id },
					output: { from: nodePin.id, to: nodePinIdToConnect },
				}[componentPin.type];
				store.connections.register(
					CCConnectionStore.create({
						parentComponentId: node.parentComponentId,
						...route,
						bentPortion: 0.5,
					}),
				);
			}
			setDraggingState(null);
		},
		onClick: () => {
			if (nodePin.userSpecifiedBitWidth === null) return;
			componentEditorState.setNodePinPropertyEditorTarget({
				componentPinId: nodePin.componentPinId,
				nodeId: nodePin.nodeId,
			});
		},
	});

	const isSimulationMode = useComponentEditorStore()(
		(s) => s.editorMode === "play",
	);
	const hasNoConnection =
		store.connections.getConnectionsByNodePinId(nodePinId).length === 0;

	const pinType = componentPin.type;
	const simulationValueToString = (simulationValue: SimulationValue) => {
		return simulationValue.reduce(
			(acm, currentValue) => acm + (currentValue === true ? "1" : "0"),
			"",
		);
	};
	const implementationComponentPin =
		store.componentPins.getByImplementation(nodePinId);
	let nodePinValue: SimulationValue;
	let nodePinValueAsString: string | null = null;
	if (isSimulationMode && hasNoConnection) {
		if (
			implementationComponentPin &&
			implementationComponentPin.type === "input"
		) {
			nodePinValue = nullthrows(
				componentEditorState.getInputValue(implementationComponentPin.id),
			);
		} else {
			nodePinValue = nullthrows(
				componentEditorState.getNodePinValue(nodePinId),
			);
		}
		nodePinValueAsString = simulationValueToString(nodePinValue);
	}
	const updateInputValue = () => {
		if (
			!implementationComponentPin ||
			implementationComponentPin.type !== "input"
		)
			return;
		const updatedPinValue = [...nodePinValue];
		updatedPinValue[0] = !updatedPinValue[0];
		componentEditorState.setInputValue(
			implementationComponentPin?.id,
			updatedPinValue,
		);
	};

	return (
		<>
			{nodePinValueAsString && (
				<text
					x={position.x - (pinType === "input" ? 15 : -8)}
					y={position.y}
					onPointerDown={updateInputValue}
					fill={theme.palette.textPrimary}
				>
					{nodePinValueAsString}
				</text>
			)}
			<g {...draggableProps} style={{ cursor: "pointer" }}>
				<rect
					x={position.x - CCComponentEditorRendererNodePinConstants.SIZE / 2}
					y={position.y - CCComponentEditorRendererNodePinConstants.SIZE / 2}
					width={CCComponentEditorRendererNodePinConstants.SIZE}
					height={CCComponentEditorRendererNodePinConstants.SIZE}
					rx={3}
					fill={theme.palette.white}
					stroke={theme.palette.textPrimary}
					strokeWidth={2}
				/>
				{nodePin.userSpecifiedBitWidth !== null && (
					<text
						x={position.x}
						y={position.y}
						textAnchor="middle"
						dominantBaseline="central"
						fontSize={
							nodePin.userSpecifiedBitWidth >= 100
								? 4
								: nodePin.userSpecifiedBitWidth >= 10
									? 6
									: 8
						}
						fill={theme.palette.textPrimary}
					>
						{nodePin.userSpecifiedBitWidth >= 100
							? "99+"
							: nodePin.userSpecifiedBitWidth}
					</text>
				)}
			</g>
			<text
				x={
					position.x +
					{
						input: CCComponentEditorRendererNodePinConstants.SIZE,
						output: -CCComponentEditorRendererNodePinConstants.SIZE,
					}[pinType]
				}
				y={position.y}
				textAnchor={{ input: "start", output: "end" }[pinType]}
				dominantBaseline="central"
				fontSize={12}
				fill={theme.palette.textPrimary}
			>
				{componentPin.name}
			</text>
			{draggingView}
		</>
	);
}
