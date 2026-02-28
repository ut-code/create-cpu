import { theme } from "../../../../../../../common/theme";
import type { CCComponentEditorRendererNodeRendererProps } from "../../types";

export function CCComponentEditorRendererNodeDefaultRenderer(
	props: CCComponentEditorRendererNodeRendererProps,
) {
	return (
		<>
			<text
				fill={theme.palette.textPrimary}
				x={props.geometry.rect.position.x}
				y={props.geometry.rect.position.y - 5}
				textAnchor="start"
				fontSize={12}
			>
				{props.component.name}
			</text>
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
		</>
	);
}
