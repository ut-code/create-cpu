/* eslint-disable max-classes-per-file */
// WIP

export interface CCComponentEditorRenderer {
  destroy(): void;
}

export class Reconciler {
  previousRenderers = new Set<CCComponentEditorRenderer>();
}

export default abstract class CCComponentEditorRendererBase {
  childRenderers: CCComponentEditorRenderer[] = [];

  destroy() {
    for (const childRenderer of this.childRenderers) {
      childRenderer.destroy();
    }
  }
}
