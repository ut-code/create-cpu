import { createContext } from "react";
import type { CCNodeId } from "../../../store/node";

/** Nodes outlined as in a simulation error by something outside the editor, e.g. a check */
export const OutlinedNodeIdsContext = createContext<ReadonlySet<CCNodeId>>(
	new Set(),
);
