import type { Rect } from "../../../../../../common/rect";
import { vector2 } from "../../../../../../common/vector2";
import type { CCNodeId } from "../../../../../../store/node";
import { getCCComponentEditorRendererNodeGeometry } from "../../../renderer/Node/geometry";
import type {
	ComponentEditorSliceCreator,
	ComponentEditorStoreValue,
} from "../../types";
import { isShownInRoom, perspectiveFitting } from "./fit";
import type { PerspectiveStoreSlice } from "./types";

const createComponentEditorStorePerspectiveSlice: ComponentEditorSliceCreator<
	PerspectiveStoreSlice
> = ({ store, componentId }) => {
	let resizeObserver: ResizeObserver | null;
	let rendererElement: SVGSVGElement | null;
	let hasFitted = false;
	const registerRendererElement = (element: SVGSVGElement | null) => {
		if (!resizeObserver) return;
		if (rendererElement) resizeObserver.unobserve(rendererElement);
		if (element) resizeObserver.observe(element);
		rendererElement = element;
	};
	const rectOf = (nodeId: CCNodeId) =>
		getCCComponentEditorRendererNodeGeometry(store, nodeId).rect;
	const rectsToFit = (state: ComponentEditorStoreValue): Rect[] => [
		...store.nodes
			.getManyByParentComponentId(componentId)
			.map((node) => rectOf(node.id)),
		...(state.areaToFit ? [state.areaToFit] : []),
	];
	return {
		define: (set, get) => ({
			perspective: { center: vector2.zero, scale: 1 },
			rendererSize: vector2.zero,
			getRendererPosition: () => {
				const rect = rendererElement?.getBoundingClientRect();
				return rect ? { x: rect.left, y: rect.top } : vector2.zero;
			},
			setPerspective: (perspective) => set((s) => ({ ...s, perspective })),
			showNodes: (nodeIds) => {
				const { perspective, rendererSize } = get();
				if (rendererSize.x <= 0 || rendererSize.y <= 0) return;
				const isEachShown = [...nodeIds]
					.filter(
						(nodeId) =>
							store.nodes.get(nodeId)?.parentComponentId === componentId,
					)
					.every((nodeId) =>
						isShownInRoom(rectOf(nodeId), perspective, rendererSize),
					);
				if (isEachShown) return;
				set((s) => ({
					...s,
					perspective: perspectiveFitting(rectsToFit(get()), rendererSize),
				}));
			},
			registerRendererElement,
			fromCanvasToStage: (point) =>
				vector2.add(
					vector2.mul(
						vector2.sub(point, vector2.div(get().rendererSize, 2)),
						get().perspective.scale,
					),
					get().perspective.center,
				),
			fromStageToCanvas: (point) =>
				vector2.add(
					vector2.div(
						vector2.sub(point, get().perspective.center),
						get().perspective.scale,
					),
					vector2.div(get().rendererSize, 2),
				),
			getViewBox: () => {
				const viewBoxTopLeft = get().fromCanvasToStage(vector2.zero);
				const viewBoxBottomRight = get().fromCanvasToStage(get().rendererSize);
				return {
					x: viewBoxTopLeft.x,
					y: viewBoxTopLeft.y,
					width: viewBoxBottomRight.x - viewBoxTopLeft.x,
					height: viewBoxBottomRight.y - viewBoxTopLeft.y,
				};
			},
		}),
		postCreate(editorStore) {
			resizeObserver = new ResizeObserver((entries) => {
				if (!entries[0]) return;
				const rendererSize = {
					x: entries[0].contentRect.width,
					y: entries[0].contentRect.height,
				};
				const state = editorStore.getState();
				const fitsNow =
					state.fitsNodesInView &&
					!hasFitted &&
					rendererSize.x > 0 &&
					rendererSize.y > 0;
				if (fitsNow) hasFitted = true;
				editorStore.setState({
					rendererSize,
					...(fitsNow && {
						perspective: perspectiveFitting(rectsToFit(state), rendererSize),
					}),
				});
			});
		},
	};
};

export default createComponentEditorStorePerspectiveSlice;
