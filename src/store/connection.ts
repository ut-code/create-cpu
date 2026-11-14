import nullthrows from "nullthrows";
import type { Tagged } from "type-fest";
import { CCBaseStore, type CCBaseStoreEvents } from "./base";
import type { CCComponentId } from "./component";
import type { CCComponentPinId } from "./componentPin";
import type { CCNodeId } from "./node";
import type { CCNodePinId } from "./nodePin";

export type CCConnectionId = Tagged<string, "CCConnectionId">;

export type CCConnectionEndpoint = {
	readonly nodeId: CCNodeId;
	readonly pinId: CCComponentPinId;
};

export type CCConnection = {
	readonly id: CCConnectionId;
	readonly from: CCNodePinId;
	readonly to: CCNodePinId;
	readonly parentComponentId: CCComponentId;
	bentPortion: number;
};

export type CCConnectionStoreEvents = CCBaseStoreEvents<CCConnection>;
export const ccConnectionStoreChangeEventTypes: (keyof CCConnectionStoreEvents)[] =
	["didRegister", "didUnregister"];

/**
 * Store of connections
 */
export class CCConnectionStore extends CCBaseStore<
	CCConnectionId,
	CCConnection,
	CCConnectionStoreEvents
> {
	import(connections: CCConnection[]): void {
		for (const connection of connections) {
			this.setObject(connection);
		}
	}

	mount() {
		this.store.nodePins.on("willUnregister", (nodePin) => {
			const connections = this.getConnectionsByNodePinId(nodePin.id);
			if (connections.length > 0) {
				this.unregister(connections.map((connection) => connection.id));
			}
		});
	}

	/**
	 * Register a connection, unless its pins cannot be connected
	 * @param connection connection to be registered
	 * @param options.allowBitWidthConflict keep the connection even if its pins fix
	 *   different bit widths, to copy one that is in conflict as it is
	 */
	register(
		connection: CCConnection,
		options: { allowBitWidthConflict?: boolean } = {},
	): void {
		if (
			!this.store.nodePins.isConnectable(
				connection.from,
				connection.to,
				options,
			)
		) {
			return;
		}
		this.setObject(connection);
		this.emit("didRegister", connection);
	}

	/**
	 * Unregister a connection
	 * @param ids ids of connections to be unregistered
	 */
	async unregister(ids: CCConnectionId[]): Promise<void> {
		const connections = ids.map((id) => nullthrows(this.objects.get(id)));
		await this.store.transactionManager.runInTransaction(() => {
			for (const connection of connections) {
				this.emit("willUnregister", connection);
				this.deleteObject(connection.id);
			}
		});
		for (const connection of connections) {
			this.emit("didUnregister", connection);
		}
	}

	/**
	 * Whether the pins a connection ties together fix different bit widths. Such a
	 * connection is kept, since a later change can resolve the conflict, but it cannot
	 * carry a value, so the editor highlights it and the simulation refuses to run.
	 * @param id id of the connection
	 */
	isInBitWidthConflict(id: CCConnectionId): boolean {
		const connection = nullthrows(this.objects.get(id));
		return this.store.nodePins.isInBitWidthConflict(connection.from);
	}

	/**
	 * Get the connections inside a component
	 * @param parentComponentId id of the component
	 * @returns connections inside the component
	 */
	getManyByParentComponentId(parentComponentId: CCComponentId): CCConnection[] {
		return [...this.objects.values()].filter(
			(connection) => connection.parentComponentId === parentComponentId,
		);
	}

	/**
	 * Get connections by id of node and pin
	 * @param nodeId id of node
	 * @param pinId id of pin
	 * @returns connections connected to the pin of the node
	 */
	getConnectionsByNodePinId(nodePinId: CCNodePinId): CCConnection[] {
		return [...this.objects.values()].filter(
			(connection) =>
				connection.from === nodePinId || connection.to === nodePinId,
		);
	}

	/**
	 * Create a new connection
	 * @param partialConnection connection without `id`
	 * @returns a new connection
	 */
	static create(partialConnection: Omit<CCConnection, "id">): CCConnection {
		return {
			id: crypto.randomUUID() as CCConnectionId,
			...partialConnection,
		};
	}
}
