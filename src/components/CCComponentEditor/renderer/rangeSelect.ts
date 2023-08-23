import invariant from "tiny-invariant";
import * as PIXI from "pixi.js";
import type CCStore from "../../../store";
import type { ComponentEditorStore } from "../store";
import { primaryColor } from "../../../common/theme";

type CCComponentEditorRendererRangeSelectProps = {
  store: CCStore;
  componentEditorStore: ComponentEditorStore;
  pixiParentContainer: PIXI.Container;
};

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

export default class CCComponentEditorRendererRangeSelect {
  #store: CCStore;

  #pixiGraphics: PIXI.Graphics;

  #pixiParentContainer: PIXI.Container;

  #componentEditorStore: ComponentEditorStore;

  #pixiWorld: PIXI.Container;

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

  destroy() {
    this.#pixiGraphics.destroy();
  }
}
