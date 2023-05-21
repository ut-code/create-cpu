export type Point = {
  x: number;
  y: number;
};

export type CCTag = {
  id: string;
  name: string;
};

export type CCSequentialCircuitIdentifier = {
  tagId: string | null;
  order: number;
};

export type CCNodeId = string;

export type CCNode = {
  id: CCNodeId;
  componentId: string;
  position: Point;
  sequentialCircuitIdentifier?: CCSequentialCircuitIdentifier;
};

export type CCConnectionEndpoint = {
  nodeId: string;
  edgeId: string;
};

export type CCConnectionId = string;

export type CCConnection = {
  id: CCConnectionId;
  from: CCConnectionEndpoint;
  to: CCConnectionEndpoint;
  /**
   * - 0: The connector bends depending on the position of the "from" endpoint.
   * - 1: The connector bends depending on the position of the "to" endpoint.
   */
  bentPortion: number;
};

export type CCEdge = {
  id: string;
  name: string;
  /** Automatically calculated when null */
  position: Point | null;
};

/** `null` represents the root component. */
export type CCComponentId = string | null;

export type CCComponent = {
  id: CCComponentId;
  name: string;
  description: string;
  inputEdges: CCEdge[];
  outputEdges: CCEdge[];
  connections: CCConnection[];
  children: CCNode[];
};
