import type { Ref } from "react";
import styles from "../../style.module.css";
import type { CCComponentEditorRendererNodeRendererProps } from "../../types";

import { CC_COMPONENT_EDITOR_RENDERER_NODE_TITLE } from "./geometry";

export { CC_COMPONENT_EDITOR_RENDERER_NODE_TITLE };

export function CCComponentEditorRendererNodeDefaultRenderer({
	title,
	titleRef,
	...props
}: CCComponentEditorRendererNodeRendererProps & {
	title?: string;
	titleRef?: Ref<SVGTextElement>;
}) {
	return (
		<>
			<text
				ref={titleRef}
				className={styles.text}
				x={0}
				y={CC_COMPONENT_EDITOR_RENDERER_NODE_TITLE.baselineY}
				textAnchor="start"
				fontSize={CC_COMPONENT_EDITOR_RENDERER_NODE_TITLE.fontSize}
			>
				{title ?? props.component.name}
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
