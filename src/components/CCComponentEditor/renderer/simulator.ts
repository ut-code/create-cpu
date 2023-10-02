import type CCStore from "../../../store";
import type { CCComponentId } from "../../../store/component";
import CCEvaluation from "../../../store/evaluation";
import type { CCPinId } from "../../../store/pin";
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

  simulation = (input: Map<CCPinId, boolean>) => {
    const output = this.#evaluation.evaluateComponent(this.#componentId, input);
    return output;
  };

  clear() {
    this.#evaluation.clear();
  }
}
