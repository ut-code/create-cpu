import invariant from "tiny-invariant";
import * as PIXI from "pixi.js";
import type CCStore from "../../../../store";
import type { ComponentEditorStore } from "../store";
import { primaryColor } from "../../../../common/theme";

type CCComponentEditorRendererRangeSelectProps = {
  store: CCStore;
  componentEditorStore: ComponentEditorStore;
  pixiParentContainer: PIXI.Container;
};

/**
 * Rearrange range select
 * @param param0 start and end points
 * @returns rearranged start and end points
 */
export const rearrangeRangeSelect = ({
  start,
  end,
}: {
  start: PIXI.Point;
  end: PIXI.Point;
}) => {
  return {
    start: new PIXI.Point(Math.min(start.x, end.x), Math.min(start.y, end.y)),
    end: new PIXI.Point(Math.max(start.x, end.x), Math.max(start.y, end.y)),
  };
};

/**
 * Class for rendering range select
 */
export default class CCComponentEditorRendererRangeSelect {
  #store: CCStore;

  #pixiGraphics: PIXI.Graphics;

  #pixiParentContainer: PIXI.Container;

  #componentEditorStore: ComponentEditorStore;

  #pixiWorld: PIXI.Container;

  /**
   * Constructor of CCComponentEditorRendererRangeSelect
   * @param props
   */
  constructor(props: CCComponentEditorRendererRangeSelectProps) {
    this.#store = props.store;
    this.#componentEditorStore = props.componentEditorStore;
    this.#pixiParentContainer = props.pixiParentContainer;
    this.#pixiWorld = new PIXI.Container();
    this.#pixiParentContainer.addChild(this.#pixiWorld);
    this.#pixiGraphics = new PIXI.Graphics();
    this.#pixiWorld.addChild(this.#pixiGraphics);

    // TODO: implement
    invariant(this.#store);
    invariant(this.#componentEditorStore);
  }

  /**
   * Render range select
   */
  render() {
    const { rangeSelect } = this.#componentEditorStore.getState();
    this.#pixiGraphics.clear();
    if (!rangeSelect) {
      return;
    }
    const { start, end } = rearrangeRangeSelect(rangeSelect);
    this.#pixiGraphics.lineStyle({
      color: primaryColor,
      width: 1,
      alignment: 1,
    });
    this.#pixiGraphics.drawRect(
      start.x,
      start.y,
      end.x - start.x,
      end.y - start.y
    );
  }

  /**
   * Destroy range select
   */
  destroy() {
    this.#pixiGraphics.destroy();
  }
}
