import { theme } from "../../../../../../../common/theme";
import type { CCComponentEditorRendererNodeRendererProps } from "../../types";

export function CCComponentEditorRendererNodeDefaultRenderer(
	props: CCComponentEditorRendererNodeRendererProps,
) {
	return (
		<>
			<text
				fill={theme.palette.textPrimary}
				x={0}
				y={-5}
				textAnchor="start"
				fontSize={12}
			>
				{props.component.name}
			</text>
			<rect
				x={0}
				y={0}
				width="100%"
				height="100%"
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
