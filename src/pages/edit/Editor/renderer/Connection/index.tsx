import nullthrows from "nullthrows";
import { useState } from "react";
import { theme } from "../../../../../common/theme";
import type { Vector2 } from "../../../../../common/vector2";
import type { CCComponentPinType } from "../../../../../store/componentPin";
import type { CCConnectionId } from "../../../../../store/connection";
import { useStore } from "../../../../../store/react";
import ensureStoreItem from "../../../../../store/react/error";
import { useNode } from "../../../../../store/react/selectors";
import { useComponentEditorStore } from "../../store";
import { stringifySimulationValue } from "../../store/slices/core/index";
import getCCComponentEditorRendererNodeGeometry from "../Node/geometry";

export type CCComponentEditorRendererConnectionEndpoint = {
	direction: CCComponentPinType;
	position: Vector2;
};

export type CCComponentEditorRendererConnectionCoreProps = {
	from: CCComponentEditorRendererConnectionEndpoint;
	to: CCComponentEditorRendererConnectionEndpoint;
	connectionId?: CCConnectionId;
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
					? theme.palette.primary
					: theme.palette.textPrimary
			}
			strokeWidth="2"
			fill="none"
			onClick={handleClick}
			onContextMenu={(e) => {
				if (!connectionId) {
					return;
				}
				e.preventDefault();
				e.stopPropagation();
				componentEditorState.selectConnection([connectionId], true);
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
const CCComponentEditorRendererConnection = ensureStoreItem(
	(props, store) => store.connections.get(props.connectionId),
	({ connectionId }: CCComponentEditorRendererConnectionProps) => {
		const { store } = useStore();
		const componentEditorState = useComponentEditorStore()();
		const connection = nullthrows(store.connections.get(connectionId));
		const fromNodePin = nullthrows(store.nodePins.get(connection.from));
		const fromComponentPin = nullthrows(
			store.componentPins.get(fromNodePin.componentPinId),
		);
		const toNodePin = nullthrows(store.nodePins.get(connection.to));
		const toComponentPin = nullthrows(
			store.componentPins.get(toNodePin.componentPinId),
		);
		const fromNode = useNode(fromNodePin.nodeId);
		const toNode = useNode(toNodePin.nodeId);
		const fromNodeGeometry = getCCComponentEditorRendererNodeGeometry(
			store,
			fromNode.id,
		);
		const toNodeGeometry = getCCComponentEditorRendererNodeGeometry(
			store,
			toNode.id,
		);
		const fromNodePinPosition = nullthrows(
			fromNodeGeometry.nodePinPositionById.get(fromNodePin.id),
		);
		const toNodePinPosition = nullthrows(
			toNodeGeometry.nodePinPositionById.get(toNodePin.id),
		);

		const [isHovered, setIsHovered] = useState(false);

		return (
			<>
				<CCComponentEditorRendererConnectionCore
					from={{
						direction: fromComponentPin.type,
						position: fromNodePinPosition,
					}}
					to={{ direction: toComponentPin.type, position: toNodePinPosition }}
					connectionId={connectionId}
					onMouseEnter={() => {
						setIsHovered(true);
					}}
					onMouseLeave={() => {
						setIsHovered(false);
					}}
				/>
				{isHovered && componentEditorState.editorMode === "play" && (
					<text fontSize={10} fill={theme.palette.textPrimary}>
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
	},
);
export default CCComponentEditorRendererConnection;
