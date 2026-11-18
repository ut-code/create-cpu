import nullthrows from "nullthrows";
import { useLayoutEffect, useRef, useState } from "react";
import { display } from "../../../../../../../store/intrinsics/definitions";
import type { CCIntrinsicComponentDisplaySpec } from "../../../../../../../store/intrinsics/types";
import { useStore } from "../../../../../../../store/react";
import { theme } from "../../../../../../../style";
import { useComponentEditorStore } from "../../../../store";
import type { CCComponentEditorRendererNodeRendererProps } from "../../types";
import {
	CC_COMPONENT_EDITOR_RENDERER_NODE_TITLE,
	CCComponentEditorRendererNodeDefaultRenderer,
} from "../Default";
import { CCComponentEditorRendererNodeDisplayRendererConfigSettingButton } from "./ConfigSettingButton";
import { ccComponentEditorRendererNodeDisplayLayoutConstants } from "./geometry";

const SETTING_BUTTON_SIZE = 20;
const SETTING_BUTTON_GAP = 2;

export function CCComponentEditorRendererNodeDisplayRenderer(
	props: CCComponentEditorRendererNodeRendererProps,
) {
	const { store } = useStore();

	const config = props.node.config as CCIntrinsicComponentDisplaySpec["config"];
	const updateConfig = (newConfig: CCIntrinsicComponentDisplaySpec["config"]) =>
		store.nodes.update(props.node.id, { config: newConfig });

	const inputNodePin = nullthrows(
		store.nodePins
			.getManyByNodeId(props.node.id)
			.find((pin) => pin.componentPinId === display.inputPin.Pixels.id),
		`Display node ${props.node.id} is missing input pin`,
	);
	const editorState = useComponentEditorStore()();
	const inputValue =
		editorState.editorMode === "play"
			? editorState.getNodePinValue(inputNodePin.id)
			: undefined;

	const { padding, gridSize, gridSizeDisplayWidth } =
		ccComponentEditorRendererNodeDisplayLayoutConstants;

	const title = `${props.component.name} ${config.resolution.x}x${config.resolution.y}`;
	const titleRef = useRef<SVGTextElement>(null);
	const [measuredTitle, setMeasuredTitle] = useState({ title: "", width: 0 });
	useLayoutEffect(() => {
		const width = nullthrows(titleRef.current).getComputedTextLength();
		setMeasuredTitle({ title, width });
	}, [title]);

	return (
		<>
			<CCComponentEditorRendererNodeDefaultRenderer
				{...props}
				title={title}
				titleRef={titleRef}
			/>
			{editorState.editorMode === "edit" && measuredTitle.title === title && (
				<foreignObject
					x={measuredTitle.width + SETTING_BUTTON_GAP}
					y={
						CC_COMPONENT_EDITOR_RENDERER_NODE_TITLE.baselineY -
						CC_COMPONENT_EDITOR_RENDERER_NODE_TITLE.fontSize * 0.35 -
						SETTING_BUTTON_SIZE / 2
					}
					width={SETTING_BUTTON_SIZE}
					height={SETTING_BUTTON_SIZE}
				>
					<CCComponentEditorRendererNodeDisplayRendererConfigSettingButton
						config={config}
						onConfigChange={updateConfig}
					/>
				</foreignObject>
			)}
			{Array(config.resolution.y)
				.keys()
				.map((y) =>
					Array(config.resolution.x)
						.keys()
						.map((x) => (
							<rect
								key={`${x}-${y}`}
								x={padding + gridSizeDisplayWidth + x * gridSize}
								y={padding + y * gridSize}
								width={gridSize}
								height={gridSize}
								fill={
									inputValue?.[
										config.pixelOrder === "column-major"
											? y + config.resolution.y * x
											: x + config.resolution.x * y
									]
										? theme.colors.black
										: theme.colors.white
								}
								stroke={theme.colors.editorGrid}
							/>
						))
						.toArray(),
				)
				.toArray()}
		</>
	);
}
