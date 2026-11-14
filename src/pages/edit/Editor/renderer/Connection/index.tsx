import nullthrows from "nullthrows";
import { useState } from "react";
import type { Vector2 } from "../../../../../common/vector2";
import type { CCComponentPinType } from "../../../../../store/componentPin";
import type { CCConnectionId } from "../../../../../store/connection";
import { useStore } from "../../../../../store/react";
import {
	useIsConnectionInBitWidthConflict,
	useNode,
} from "../../../../../store/react/selectors";
import { theme } from "../../../../../style";
import { useComponentEditorStore } from "../../store";
import { stringifySimulationValue } from "../../store/slices/core/index";
import { getCCComponentEditorRendererNodeGeometry } from "../Node/geometry";

export type CCComponentEditorRendererConnectionEndpoint = {
	direction: CCComponentPinType;
	position: Vector2;
};

export type CCComponentEditorRendererConnectionCoreProps = {
	from: CCComponentEditorRendererConnectionEndpoint;
	to: CCComponentEditorRendererConnectionEndpoint;
	connectionId?: CCConnectionId;
	/** whether the bit widths of the pins it ties together conflict */
	isInBitWidthConflict?: boolean;
	onMouseEnter?: React.MouseEventHandler<SVGPathElement>;
	onMouseLeave?: React.MouseEventHandler<SVGPathElement>;
};

const straightGap = 10;
const polarity: Record<CCComponentPinType, number> = {
	input: -1,
	output: 1,
};
export function CCComponentEditorRendererConnectionCore({
	from,
	to,
	connectionId,
	isInBitWidthConflict = false,
	onMouseEnter,
	onMouseLeave,
}: CCComponentEditorRendererConnectionCoreProps) {
	const componentEditorState = useComponentEditorStore()();

	const handleClick = (e: React.MouseEvent) => {
		if (!connectionId) {
			return;
		}
		componentEditorState.selectConnection([connectionId], !e.shiftKey);
	};

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: SVG
		<path
			d={[
				`M ${from.position.x} ${from.position.y}`,
				`h ${straightGap * polarity[from.direction]}`,
				`C ${[
					from.position.x + 4 * straightGap * polarity[from.direction],
					from.position.y,
					to.position.x + 4 * straightGap * polarity[to.direction],
					to.position.y,
					to.position.x + straightGap * polarity[to.direction],
					to.position.y,
				].join(" ")}`,
				`h ${straightGap * polarity[from.direction]}`,
			].join(" ")}
			stroke={
				connectionId &&
				componentEditorState.selectedConnectionIds.has(connectionId)
					? theme.colors.primary
					: isInBitWidthConflict
						? theme.colors.error
						: theme.colors.textPrimary
			}
			strokeWidth="2"
			strokeDasharray={isInBitWidthConflict ? "6 4" : undefined}
			fill="none"
			onClick={handleClick}
			onContextMenu={(e) => {
				if (!connectionId) {
					return;
				}
				e.preventDefault();
				e.stopPropagation();
				// Keep a selection containing it, so that the menu acts on all of them, like
				// the context menu of a node does
				if (!componentEditorState.selectedConnectionIds.has(connectionId)) {
					componentEditorState.selectConnection([connectionId], true);
				}
				componentEditorState.openContextMenu(e);
			}}
			id={connectionId}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
		/>
	);
}

export type CCComponentEditorRendererConnectionProps = {
	connectionId: CCConnectionId;
};
export default function CCComponentEditorRendererConnection({
	connectionId,
}: CCComponentEditorRendererConnectionProps) {
	const { store } = useStore();
	const componentEditorState = useComponentEditorStore()();
	const connection = store.connections.get(connectionId);
	const fromNodePin = connection && store.nodePins.get(connection.from);
	const toNodePin = connection && store.nodePins.get(connection.to);
	// Subscribed to follow the nodes at both ends when they move
	const fromNode = useNode(fromNodePin?.nodeId);
	const toNode = useNode(toNodePin?.nodeId);
	const isInBitWidthConflict = useIsConnectionInBitWidthConflict(connectionId);
	const [isHovered, setIsHovered] = useState(false);

	// Moving a node re-renders this alone, which can happen after the connection is
	// removed but before the list of connections drops it
	if (!connection || !fromNodePin || !toNodePin || !fromNode || !toNode) {
		return null;
	}
	const fromComponentPin = nullthrows(
		store.componentPins.get(fromNodePin.componentPinId),
	);
	const toComponentPin = nullthrows(
		store.componentPins.get(toNodePin.componentPinId),
	);
	const fromNodePinPosition = nullthrows(
		getCCComponentEditorRendererNodeGeometry(
			store,
			fromNode.id,
		).nodePinPositionById.get(fromNodePin.id),
	);
	const toNodePinPosition = nullthrows(
		getCCComponentEditorRendererNodeGeometry(
			store,
			toNode.id,
		).nodePinPositionById.get(toNodePin.id),
	);

	return (
		<>
			<CCComponentEditorRendererConnectionCore
				from={{
					direction: fromComponentPin.type,
					position: fromNodePinPosition,
				}}
				to={{ direction: toComponentPin.type, position: toNodePinPosition }}
				connectionId={connectionId}
				isInBitWidthConflict={isInBitWidthConflict}
				onMouseEnter={() => {
					setIsHovered(true);
				}}
				onMouseLeave={() => {
					setIsHovered(false);
				}}
			/>
			{isHovered && componentEditorState.editorMode === "play" && (
				<text fontSize={10} fill={theme.colors.textPrimary}>
					<textPath
						href={`#${connectionId}`}
						startOffset="50%"
						textAnchor="middle"
					>
						{stringifySimulationValue(
							nullthrows(componentEditorState.getNodePinValue(toNodePin.id)),
						)}
					</textPath>
				</text>
			)}
		</>
	);
}
