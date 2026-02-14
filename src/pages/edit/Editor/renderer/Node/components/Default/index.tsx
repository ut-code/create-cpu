import { theme } from "../../../../../../../common/theme";
import { useComponent } from "../../../../../../../store/react/selectors";
import type { CCComponentEditorRendererNodeRendererProps } from "../../types";

export function CCComponentEditorRendererNodeDefaultRenderer(
	props: CCComponentEditorRendererNodeRendererProps,
) {
	const component = useComponent(props.node.componentId);

	return (
		<>
			<text
				fill={theme.palette.textPrimary}
				x={props.geometry.rect.position.x}
				y={props.geometry.rect.position.y - 5}
				textAnchor="start"
				fontSize={12}
			>
				{component.name}
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
