import type CCStore from "../../../../store";
import type { CCComponentId } from "../../../../store/component";
import CCEvaluation from "../../../../store/evaluation";
import type { CCNodeId } from "../../../../store/node";
import type { CCPinId } from "../../../../store/pin";
import type { ComponentEditorStore } from "../store";

type CCSimulatorProps = {
  store: CCStore;
  componentEditorStore: ComponentEditorStore;
  componentId: CCComponentId;
};

export default class CCSimulator {
  readonly #store: CCStore;

  readonly #componentId: CCComponentId;

  #evaluation: CCEvaluation;

  constructor(props: CCSimulatorProps) {
    this.#store = props.store;
    this.#componentId = props.componentId;
    this.#evaluation = new CCEvaluation(this.#store);
  }

  simulation = (input: Map<CCPinId, boolean[]>, timeStep: number) => {
    const outputs = this.#evaluation.evaluate(
      this.#componentId,
      input,
      timeStep
    );
    return outputs;
  };

  getPinValue = (nodeId: CCNodeId, pinId: CCPinId) => {
    return this.#evaluation.getCalculatedPinValue(nodeId, pinId);
  };

  clear() {
    this.#evaluation.clear();
  }
}
