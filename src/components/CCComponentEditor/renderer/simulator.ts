import type CCStore from "../../../store";
import type { CCComponentId } from "../../../store/component";
import evaluateComponent from "../../../store/evaluation";
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

  readonly #componentEditorStore: ComponentEditorStore;

  constructor(props: CCSimulatorProps) {
    this.#store = props.store;
    this.#componentId = props.componentId;
    this.#componentEditorStore = props.componentEditorStore;
  }

  simulation = (input: Map<CCPinId, boolean>) => {
    const output = evaluateComponent(
      this.#store,
      this.#componentEditorStore,
      this.#componentId,
      input
    );
    return output;
  };
}
