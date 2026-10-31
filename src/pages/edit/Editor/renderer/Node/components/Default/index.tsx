import { theme } from "../../../../../../../style";
import type { CCComponentEditorRendererNodeRendererProps } from "../../types";

export function CCComponentEditorRendererNodeDefaultRenderer(
	props: CCComponentEditorRendererNodeRendererProps,
) {
	return (
		<>
			<text
				fill={theme.colors.textPrimary}
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
				fill={theme.colors.white}
				stroke={
					props.nodeState.isSelected
						? theme.colors.primary
						: theme.colors.textPrimary
				}
				strokeWidth={2}
				rx={2}
			/>
		</>
	);
}
