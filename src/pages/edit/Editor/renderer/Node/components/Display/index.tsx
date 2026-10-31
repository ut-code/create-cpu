import nullthrows from "nullthrows";
import { display } from "../../../../../../../store/intrinsics/definitions";
import type { CCIntrinsicComponentDisplaySpec } from "../../../../../../../store/intrinsics/types";
import { useStore } from "../../../../../../../store/react";
import { theme } from "../../../../../../../style";
import { useComponentEditorStore } from "../../../../store";
import type { CCComponentEditorRendererNodeRendererProps } from "../../types";
import { CCComponentEditorRendererNodeDefaultRenderer } from "../Default";
import { CCComponentEditorRendererNodeDisplayRendererConfigSettingButton } from "./ConfigSettingButton";
import { ccComponentEditorRendererNodeDisplayLayoutConstants } from "./geometry";

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

	return (
		<>
			<CCComponentEditorRendererNodeDefaultRenderer {...props} />
			<text
				x={padding}
				y={padding}
				fontSize={16}
				fill={theme.colors.textPrimary}
				dominantBaseline="hanging"
			>
				{config.resolution.x}x{config.resolution.y}
			</text>
			<foreignObject x={padding / 2} y={padding + 16} width={32} height={32}>
				<CCComponentEditorRendererNodeDisplayRendererConfigSettingButton
					config={config}
					onConfigChange={updateConfig}
				/>
			</foreignObject>
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
									inputValue?.[x + config.resolution.x * y]
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
