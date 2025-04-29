import nullthrows from "nullthrows";
import { theme } from "../../../../common/theme";
import type { CCConnectionId } from "../../../../store/connection";
import { useStore } from "../../../../store/react";
import ensureStoreItem from "../../../../store/react/error";
import { useNode } from "../../../../store/react/selectors";
import getCCComponentEditorRendererNodeGeometry from "./Node.geometry";

export type CCComponentEditorRendererConnectionCoreProps = {
	from: { x: number; y: number };
	to: { x: number; y: number };
};
export function CCComponentEditorRendererConnectionCore({
	from,
	to,
}: CCComponentEditorRendererConnectionCoreProps) {
	const straightGap = 10;
	const direction = from.x < to.x ? 1 : -1;

	return (
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
			stroke={theme.palette.textPrimary}
			strokeWidth="2"
			fill="none"
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

		return (
			<CCComponentEditorRendererConnectionCore
				from={fromNodePinPosition}
				to={toNodePinPosition}
			/>
		);
	},
);
export default CCComponentEditorRendererConnection;
