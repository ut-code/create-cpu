import nullthrows from "nullthrows";
import { useState } from "react";
import { theme } from "../../../../common/theme";
import type { CCConnectionId } from "../../../../store/connection";
import { useStore } from "../../../../store/react";
import ensureStoreItem from "../../../../store/react/error";
import { useNode } from "../../../../store/react/selectors";
import { useComponentEditorStore } from "../store";
import { stringifySimulationValue } from "../store/slices/core/index";
import getCCComponentEditorRendererNodeGeometry from "./Node.geometry";

export type CCComponentEditorRendererConnectionCoreProps = {
	from: { x: number; y: number };
	to: { x: number; y: number };
	connectionId?: CCConnectionId;
	onMouseEnter?: React.MouseEventHandler<SVGPathElement>;
	onMouseLeave?: React.MouseEventHandler<SVGPathElement>;
};

export function CCComponentEditorRendererConnectionCore({
	from,
	to,
	connectionId,
	onMouseEnter,
	onMouseLeave,
}: CCComponentEditorRendererConnectionCoreProps) {
	const straightGap = 10;
	const direction = from.x < to.x ? 1 : -1;

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
				`M ${from.x} ${from.y}`,
				`h ${straightGap * direction}`,
				`C ${[
					from.x + 4 * straightGap * direction,
					from.y,
					to.x - 4 * straightGap * direction,
					to.y,
					to.x - straightGap * direction,
					to.y,
				].join(" ")}`,
				`h ${straightGap * direction}`,
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
		const toNodePin = nullthrows(store.nodePins.get(connection.to));
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
					from={fromNodePinPosition}
					to={toNodePinPosition}
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
