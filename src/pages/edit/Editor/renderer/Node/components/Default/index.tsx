import styles from "../../style.module.css";
import type { CCComponentEditorRendererNodeRendererProps } from "../../types";

export function CCComponentEditorRendererNodeDefaultRenderer(
	props: CCComponentEditorRendererNodeRendererProps,
) {
	return (
		<>
			<text
				className={styles.text}
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
				rx={2}
				className={styles.shape}
			/>
		</>
	);
}
