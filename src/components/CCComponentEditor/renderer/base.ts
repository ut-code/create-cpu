/* eslint-disable max-classes-per-file */

import type CCStore from "../../../store";
import type { ComponentEditorStore } from "../store";

export type CCComponentEditorRendererContext = {
  store: CCStore;
  componentEditorStore: ComponentEditorStore;
  overlayArea: HTMLElement;
};

export interface CCComponentEditorRenderer {
  destroy(): void;
}

export default abstract class CCComponentEditorRendererBase
  implements CCComponentEditorRenderer
{
  protected context: CCComponentEditorRendererContext;

  #childRenderers = new Set<CCComponentEditorRenderer>();

  constructor(context: CCComponentEditorRendererContext) {
    this.context = context;
  }

  registerChildRenderer(renderer: CCComponentEditorRenderer) {
    this.#childRenderers.add(renderer);
  }

  unregisterChildRenderer(renderer: CCComponentEditorRenderer) {
    this.#childRenderers.delete(renderer);
    renderer.destroy();
  }

  destroy() {
    for (const childRenderer of this.#childRenderers) {
      childRenderer.destroy();
    }
  }
}
