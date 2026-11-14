import type { Tagged } from "type-fest";
import type { CCComponent } from "./component";
import type { CCComponentPin } from "./componentPin";
import type { CCConnection } from "./connection";
import type { CCNode } from "./node";
import type { CCNodePin } from "./nodePin";

export const ccObjectTypes = [
	"components",
	"nodes",
	"componentPins",
	"nodePins",
	"connections",
] as const;

export type CCObjectType = (typeof ccObjectTypes)[number];

/** Id of an object of `K`, tagged with `K` so that ids of different object types do not mix */
export type CCObjectId<K extends CCObjectType = CCObjectType> =
	K extends CCObjectType ? Tagged<string, K> : never;

/** Base type for all objects, having an id of its type */
export type CCObject<K extends CCObjectType = CCObjectType> = {
	readonly id: CCObjectId<K>;
};

export type CCObjectByType = {
	components: CCComponent;
	nodes: CCNode;
	componentPins: CCComponentPin;
	nodePins: CCNodePin;
	connections: CCConnection;
};

export type CCReferences<T extends CCObject> = Partial<
	Record<keyof T, CCObjectType>
>;

/** Base interface for an object-specific store */
export interface CCObjectStore<K extends CCObjectType> {
	readonly references: CCReferences<CCObjectByType[K]>;
	get(id: CCObjectId<K>): CCObjectByType[K] | undefined;
	getMany(): CCObjectByType[K][];
}
