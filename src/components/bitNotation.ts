import { createContext } from "react";
import type { BitNotation } from "../common/bitLabel";

export const BitNotationContext = createContext<BitNotation>("onOff");
