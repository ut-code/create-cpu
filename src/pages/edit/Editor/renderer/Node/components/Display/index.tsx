import { theme } from "../../../../../../../common/theme";
import type { CCIntrinsicComponentDisplaySpec } from "../../../../../../../store/intrinsics/types";
import type { CCNode } from "../../../../../../../store/node";
import type { CCComponentEditorRendererNodeRendererProps } from "../../types";

export function CCComponentEditorRendererNodeDisplayRenderer(
	props: CCComponentEditorRendererNodeRendererProps,
) {
	const node = props.node as CCNode<CCIntrinsicComponentDisplaySpec>;

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
				{node.config.resolution.x}x{node.config.resolution.y}
			</text>
			{Array(node.config.resolution.y)
				.keys()
				.map((y) =>
					Array(node.config.resolution.x)
						.keys()
						.map((x) => (
							<rect
								key={`${x}-${y}`}
								x={props.geometry.rect.position.x + 64 + x * 12}
								y={props.geometry.rect.position.y + 8 + y * 12}
								width={12}
								height={12}
								fill={theme.palette.white}
								stroke={theme.palette.editorGrid}
							/>
						))
						.toArray(),
				)
				.toArray()}
		</>
	);
}
