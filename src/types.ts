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

export type CCConnectionId = string;

/** `null` represents the root component. */
export type CCComponentId = string | null;
