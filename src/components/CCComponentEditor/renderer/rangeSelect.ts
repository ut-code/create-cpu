import invariant from "tiny-invariant";
import type CCStore from "../../../store";
import type { ComponentEditorStore } from "../store";

type CCComponentEditorRendererRangeSelectProps = {
  store: CCStore;
  componentEditorStore: ComponentEditorStore;
};

export default class CCComponentEditorRendererRangeSelect {
  #store: CCStore;

  #componentEditorStore: ComponentEditorStore;

  constructor(props: CCComponentEditorRendererRangeSelectProps) {
    this.#store = props.store;
    this.#componentEditorStore = props.componentEditorStore;

    // TODO: implement
    invariant(this.#store);
    invariant(this.#componentEditorStore);
  }
}
