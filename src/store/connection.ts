import EventEmitter from "eventemitter3";
import nullthrows from "nullthrows";
import type { Opaque } from "type-fest";
import type CCStore from ".";
import type { CCComponentId } from "./component";
import type { CCComponentPinId } from "./componentPin";
import type { CCNodeId } from "./node";
import type { CCNodePinId } from "./nodePin";

export type CCConnectionId = Opaque<string, "CCConnectionId">;

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

export type CCConnectionStoreEvents = {
	didRegister(Connection: CCConnection): void;
	willUnregister(Connection: CCConnection): void;
	didUnregister(Connection: CCConnection): void;
};
export const ccConnectionStoreChangeEventTypes: (keyof CCConnectionStoreEvents)[] =
	["didRegister", "didUnregister"];

/**
 * Store of connections
 */
export class CCConnectionStore extends EventEmitter<CCConnectionStoreEvents> {
	#store: CCStore;

	#connections: Map<CCConnectionId, CCConnection> = new Map();

	/**
	 * Constructor of CCConnectionStore
	 * @param store store
	 * @param connections initial connections
	 */
	constructor(store: CCStore) {
		super();
		this.#store = store;
	}

	import(connections: CCConnection[]): void {
		for (const connection of connections) {
			this.#connections.set(connection.id, connection);
		}
	}

	mount() {
		this.#store.nodePins.on("willUnregister", (nodePin) => {
			const connections = this.getConnectionsByNodePinId(nodePin.id);
			if (connections.length > 0) {
				this.unregister(connections.map((connection) => connection.id));
			}
		});
		// A config change can change the bit width of a pin (e.g. the resolution of a
		// display), which invalidates the connections that were valid when they were made.
		// CCStore mounts CCNodePinStore first, so its bit width cache is already dropped.
		this.#store.nodes.on("didUpdateConfig", (node) => {
			// TODO: Dropping a connection can in turn invalidate another one. Resolving that
			// needs a repeated sweep, which the re-validation on `didRegister` below lacks too.
			const invalidatedConnections = this.getMany().filter(
				(connection) =>
					connection.parentComponentId === node.parentComponentId &&
					!this.#store.nodePins.hasCompatibleBitWidths(
						connection.from,
						connection.to,
					),
			);
			if (invalidatedConnections.length > 0) {
				this.unregister(
					invalidatedConnections.map((connection) => connection.id),
				);
			}
		});
		this.#store.connections.on("didRegister", (connection) => {
			const component = nullthrows(
				this.#store.components.get(connection.parentComponentId),
			);
			const nodes = this.#store.nodes.getManyByComponentId(component.id);
			for (const node of nodes) {
				const nodePins = this.#store.nodePins.getManyByNodeId(node.id);
				for (const nodePin of nodePins) {
					const connections = this.getConnectionsByNodePinId(nodePin.id);
					for (const connection of connections) {
						const parentComponentId = connection.parentComponentId;
						const from = connection.from;
						const to = connection.to;
						this.unregister([connection.id]).then(() => {
							if (this.#store.nodePins.isConnectable(from, to)) {
								this.register(
									CCConnectionStore.create({
										from,
										to,
										parentComponentId,
										bentPortion: 0.5,
									}),
								);
							}
						});
					}
				}
			}
		});
	}

	/**
	 * Register a connection
	 * @param connection connection to be registered
	 */
	register(connection: CCConnection): void {
		const fromNodePinId = connection.from;
		const toNodePinId = connection.to;
		if (!this.#store.nodePins.isConnectable(fromNodePinId, toNodePinId)) {
			return;
		}
		this.#connections.set(connection.id, connection);
		this.emit("didRegister", connection);
	}

	/**
	 * Unregister a connection
	 * @param ids ids of connections to be unregistered
	 */
	async unregister(ids: CCConnectionId[]): Promise<void> {
		const connections = ids.map((id) => nullthrows(this.#connections.get(id)));
		await this.#store.transactionManager.runInTransaction(() => {
			for (const connection of connections) {
				this.emit("willUnregister", connection);
				this.#connections.delete(connection.id);
			}
		});
		for (const connection of connections) {
			this.emit("didUnregister", connection);
		}
	}

	/**
	 * Get a connection by CCConnectionId
	 * @param id id of connection
	 * @returns connection of `id`
	 */
	get(id: CCConnectionId): CCConnection | undefined {
		return this.#connections.get(id);
	}

	/**
	 * Get all of connections
	 * @returns map of id and connection (read only)
	 */
	getConnectionIdsByParentComponentId(
		parentComponentId: CCComponentId,
	): CCConnectionId[] {
		return [...this.#connections.values()]
			.filter(
				(connection) => connection.parentComponentId === parentComponentId,
			)
			.map((connection) => connection.id);
	}

	getManyByParentComponentId(parentComponentId: CCComponentId): CCConnection[] {
		return [...this.#connections.values()].filter(
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
		return [...this.#connections.values()].filter(
			(connection) =>
				connection.from === nodePinId || connection.to === nodePinId,
		);
	}

	/**
	 * Check if no connection of the pin of the node existsno connection of the pin of the node exists
	 * @param nodeId id of node
	 * @param pinId id of pin
	 * @returns if no connection of the pin of the node exists, `true` returns (otherwise `false`)
	 * @deprecated in favor of {@link getConnectionsByNodePinId}
	 */
	hasNoConnectionOf(nodePinId: CCNodePinId): boolean {
		return this.getConnectionsByNodePinId(nodePinId).length === 0;
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

	/**
	 * Get array of connections
	 * @returns array of connections
	 */
	getMany(): CCConnection[] {
		return [...this.#connections.values()];
	}
}
