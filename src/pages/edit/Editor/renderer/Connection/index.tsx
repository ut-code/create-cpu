import nullthrows from "nullthrows";
import { useState } from "react";
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
import {
	type CCComponentEditorRendererConnectionEndpoint,
	connectionPathData,
} from "./path";
import styles from "./style.module.css";

export type { CCComponentEditorRendererConnectionEndpoint };

export type CCComponentEditorRendererConnectionCoreProps = {
	from: CCComponentEditorRendererConnectionEndpoint;
	to: CCComponentEditorRendererConnectionEndpoint;
	connectionId?: CCConnectionId;
	/** whether the bit widths of the pins it ties together conflict */
	isInBitWidthConflict?: boolean;
	onMouseEnter?: React.MouseEventHandler<SVGPathElement>;
	onMouseLeave?: React.MouseEventHandler<SVGPathElement>;
};

const HIT_AREA_STROKE_WIDTH = 12;
const VALUE_LABEL_SIZE = { x: 200, y: 24 };
export function CCComponentEditorRendererConnectionCore({
	from,
	to,
	connectionId,
	isInBitWidthConflict = false,
	onMouseEnter,
	onMouseLeave,
}: CCComponentEditorRendererConnectionCoreProps) {
	const componentEditorState = useComponentEditorStore()();

	const d = connectionPathData(from, to);

	return (
		<>
			<path
				d={d}
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
				pointerEvents="none"
			/>
			{connectionId && (
				// biome-ignore lint/a11y/noStaticElementInteractions: SVG
				<path
					d={d}
					className={styles.hitArea}
					strokeWidth={HIT_AREA_STROKE_WIDTH}
					fill="none"
					pointerEvents="stroke"
					onClick={(e) =>
						componentEditorState.selectConnection([connectionId], !e.shiftKey)
					}
					onContextMenu={(e) => {
						e.preventDefault();
						e.stopPropagation();
						if (!componentEditorState.selectedConnectionIds.has(connectionId)) {
							componentEditorState.selectConnection([connectionId], true);
						}
						componentEditorState.openContextMenu(e);
					}}
					onMouseEnter={onMouseEnter}
					onMouseLeave={onMouseLeave}
				/>
			)}
		</>
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
	const fromNode = useNode(fromNodePin?.nodeId);
	const toNode = useNode(toNodePin?.nodeId);
	const isInBitWidthConflict = useIsConnectionInBitWidthConflict(connectionId);
	const [isHovered, setIsHovered] = useState(false);

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
				// The path is symmetric about the midpoint of its ends, so that point lies on it
				<foreignObject
					x={
						(fromNodePinPosition.x + toNodePinPosition.x - VALUE_LABEL_SIZE.x) /
						2
					}
					y={
						(fromNodePinPosition.y + toNodePinPosition.y - VALUE_LABEL_SIZE.y) /
						2
					}
					width={VALUE_LABEL_SIZE.x}
					height={VALUE_LABEL_SIZE.y}
					pointerEvents="none"
				>
					<div className={styles.valueLabel}>
						<span>
							{stringifySimulationValue(
								nullthrows(componentEditorState.getNodePinValue(toNodePin.id)),
							)}
						</span>
					</div>
				</foreignObject>
			)}
		</>
	);
}
