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

export type CCNode = {
  id: string;
  componentId: string;
  position: Point;
  sequentialCircuitIdentifier: CCSequentialCircuitIdentifier;
};

export type CCConnectionEndpoint = {
  nodeId: string;
  edgeId: string;
};

export type CCConnection = {
  id: string;
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
  type: "input" | "output";
  /** Automatically calculated when null */
  position: Point | null;
};

export type CCComponentDefinition = {
  id: string;
  name: string;
  description: string;
  edges: CCEdge[];
  connections: CCConnection[];
  children: CCNode[];
};
