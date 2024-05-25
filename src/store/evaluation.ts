import invariant from "tiny-invariant";
import type CCStore from ".";
import type { CCComponentId } from "./component";
import type { CCComponentPinId } from "./componentPin";
import type { CCNodePinId } from "./nodePin";
import CCComponentEvaluator from "./componentEvaluator";

export type CCEvaluationId = string;

// type EvaluationCache = {
//   output: Map<CCComponentPinId, boolean[]>;
// };

/**
 * Class for evaluation
 */
export default class CCEvaluation {
  // #cache: Map<CCEvaluationId, EvaluationCache>;

  // static readonly #cacheSize = 5;

  #store: CCStore;

  #componentEvaluator: CCComponentEvaluator | null;

  /**
   * Constructor of CCEvaluation
   * @param store store
   */
  constructor(store: CCStore) {
    // this.#cache = new Map<CCEvaluationId, EvaluationCache>();
    // this.#previousValueOfOutputNodePins = null;
    this.#store = store;
    this.#componentEvaluator = null;
  }

  /**
   * Clear the cache and the previous value of output of node pins, and reset the component evaluator
   */
  clear() {
    // this.#cache.clear();
    // this.#previousValueOfOutputNodePins?.clear();
    this.#componentEvaluator = null;
  }

  /**
   * Create id of evaluation for cache
   * @param componentId id of component
   * @param input map of input pins and their values
   * @param timeStep time step
   * @returns id of evaluation
   */
  static createId(
    componentId: CCComponentId,
    input: Map<CCComponentPinId, boolean[]>,
    timeStep: number
  ): CCEvaluationId {
    let id = "";
    id += componentId as string;
    id += "_";
    for (const [key, values] of input) {
      id += key;
      id += "_";
      for (const value of values) {
        if (value) {
          id += "1";
        } else {
          id += "0";
        }
        id += "_";
      }
    }
    id += timeStep;
    return id;
  }

  /**
   * Get the calculated value of a pin
   * @param nodeId id of node
   * @param pinId id of pin
   * @returns calculated value of pin
   */
  // getCalculatedPinValue(nodePinId: CCNodePinId): boolean[] | null {
  //   if (this.#previousValueOfOutputNodePins) {
  //     return this.#previousValueOfOutputNodePins.get(nodePinId)!;
  //   }
  //   return null;
  // }

  /**
   * Evaluate the component
   * @param componentId id of component
   * @param input map of input pins and their values
   * @param timeStep time step
   * @returns map of output pins and their values
   */
  evaluate(
    componentId: CCComponentId,
    input: Map<CCComponentPinId, boolean[]>,
    timeStep: number
  ): Map<CCComponentPinId, boolean[]> | null {
    if (!this.#componentEvaluator) {
      this.#componentEvaluator = new CCComponentEvaluator(this.#store);
    }
    const { output, outputNodePinValues } =
      this.#componentEvaluator.evaluateComponent(componentId, input, timeStep)!;
    invariant(outputNodePinValues);
    // if (this.#cache.size >= CCEvaluation.#cacheSize) {
    //   this.#cache.delete([...this.#cache.keys()][0]!);
    // }
    // this.#cache.set(id, {
    //   output,
    //   outputNodePinValues,
    // });
    return output;
  }
}
