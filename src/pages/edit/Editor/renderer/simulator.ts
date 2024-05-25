import type CCStore from "../../../../store";
import type { CCComponentId } from "../../../../store/component";
import CCEvaluation from "../../../../store/evaluation";
import type { CCComponentPinId } from "../../../../store/componentPin";
import type { ComponentEditorStore } from "../store";
import type { CCNodePinId } from "../../../../store/nodePin";

type CCSimulatorProps = {
  store: CCStore;
  componentEditorStore: ComponentEditorStore;
  componentId: CCComponentId;
};

/**
 * Simulator of component
 */
export default class CCSimulator {
  readonly #store: CCStore;

  readonly #componentId: CCComponentId;

  #evaluation: CCEvaluation;

  /**
   * Constructor of CCSimulator
   * @param props
   */
  constructor(props: CCSimulatorProps) {
    this.#store = props.store;
    this.#componentId = props.componentId;
    this.#evaluation = new CCEvaluation(this.#store);
  }

  /**
   * Simulation
   * @param input map of input pins and their values
   * @param timeStep time step
   * @returns map of output pins and their values
   */
  simulation = (input: Map<CCComponentPinId, boolean[]>, timeStep: number) => {
    const outputs = this.#evaluation.evaluate(
      this.#componentId,
      input,
      timeStep
    );
    return outputs;
  };

  /**
   * Clear evaluation
   */
  clear() {
    this.#evaluation.clear();
  }
}
