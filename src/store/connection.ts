import EventEmitter from "eventemitter3";
import nullthrows from "nullthrows";
import type { Tagged } from "type-fest";
import type CCStore from ".";
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
		// Bit widths are inferred across connections and component boundaries, so a change
		// can alter the width of a pin far from it, even in another component that uses
		// the changed one (e.g. a constant inside it growing). Every connection is checked
		// again after any change that can affect a bit width.
		// CCStore mounts CCNodePinStore first, so its bit width cache is already dropped.
		const revalidate = () => this.#dropIncompatibleConnections();
		this.#store.nodes.on("didUpdateConfig", revalidate);
		for (const eventType of [
			"didRegister",
			"didUnregister",
			"didUpdate",
		] as const) {
			this.#store.nodePins.on(eventType, revalidate);
		}
		this.on("didRegister", revalidate);
		this.on("didUnregister", revalidate);
		// A restored circuit may contain connections that were broken before this check
		revalidate();
	}

	/** whether connections are being revalidated, to not start over from within */
	#isRevalidating = false;

	/** how many {@link batchBitWidthChanges} calls are running */
	#batchDepth = 0;

	/**
	 * Run `fn`, which changes bit widths in several steps, and revalidate the connections
	 * only once it is done. Checking after each step could drop a connection that is
	 * inconsistent only in an intermediate state, e.g. while the split pins of an
	 * aggregate node are resized one by one.
	 * @param fn function making the changes
	 */
	batchBitWidthChanges(fn: () => void): void {
		this.#batchDepth += 1;
		try {
			fn();
		} finally {
			this.#batchDepth -= 1;
		}
		this.#dropIncompatibleConnections();
	}

	/**
	 * Drop every connection whose two ends have conflicting bit widths. Dropping one can
	 * change the inferred width of other pins, so this repeats until nothing is dropped.
	 */
	#dropIncompatibleConnections(): void {
		if (this.#isRevalidating || this.#batchDepth > 0) return;
		this.#isRevalidating = true;
		try {
			for (;;) {
				const incompatibleConnections = this.getMany().filter(
					(connection) =>
						!this.#store.nodePins.hasCompatibleBitWidths(
							connection.from,
							connection.to,
						),
				);
				if (incompatibleConnections.length === 0) break;
				this.unregister(
					incompatibleConnections.map((connection) => connection.id),
				);
			}
		} finally {
			this.#isRevalidating = false;
		}
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
			// Announced as soon as the connections are gone, not when the transaction ends.
			// Otherwise a listener of a change announced in between, such as a renderer
			// subscribed to the node at one end, would look up a connection that is gone
			// while the list of connections still has it. Removing a connection cascades
			// to nothing, so its listeners see no half-removed state.
			for (const connection of connections) {
				this.emit("didUnregister", connection);
			}
		});
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
