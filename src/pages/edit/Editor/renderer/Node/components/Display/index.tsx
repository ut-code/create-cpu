import nullthrows from "nullthrows";
import { theme } from "../../../../../../../common/theme";
import { display } from "../../../../../../../store/intrinsics/definitions";
import type { CCIntrinsicComponentDisplaySpec } from "../../../../../../../store/intrinsics/types";
import { useStore } from "../../../../../../../store/react";
import { useComponentEditorStore } from "../../../../store";
import type { CCComponentEditorRendererNodeRendererProps } from "../../types";

export function CCComponentEditorRendererNodeDisplayRenderer(
	props: CCComponentEditorRendererNodeRendererProps,
) {
	const { store } = useStore();
	const config = props.node.config as CCIntrinsicComponentDisplaySpec["config"];
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

	return (
		<>
			<rect
				x={props.geometry.rect.position.x}
				y={props.geometry.rect.position.y}
				width={props.geometry.rect.size.x}
				height={props.geometry.rect.size.y}
				fill={theme.palette.white}
				stroke={
					props.nodeState.isSelected
						? theme.palette.primary
						: theme.palette.textPrimary
				}
				strokeWidth={2}
				rx={2}
			/>
			<text
				x={props.geometry.rect.position.x + 8}
				y={props.geometry.rect.position.y + 20}
				fontSize={12}
				fill={theme.palette.textPrimary}
			>
				Display
			</text>
			<text
				x={props.geometry.rect.position.x + 8}
				y={props.geometry.rect.position.y + 40}
				fontSize={16}
				fill={theme.palette.textPrimary}
			>
				{config.resolution.x}x{config.resolution.y}
			</text>
			{Array(config.resolution.y)
				.keys()
				.map((y) =>
					Array(config.resolution.x)
						.keys()
						.map((x) => (
							<rect
								key={`${x}-${y}`}
								x={props.geometry.rect.position.x + 64 + x * 12}
								y={props.geometry.rect.position.y + 8 + y * 12}
								width={12}
								height={12}
								fill={
									inputValue?.[
										config.resolution.x * config.resolution.y -
											(1 + x + config.resolution.x * y)
									]
										? theme.palette.black
										: theme.palette.white
								}
								stroke={theme.palette.editorGrid}
							/>
						))
						.toArray(),
				)
				.toArray()}
		</>
	);
}
