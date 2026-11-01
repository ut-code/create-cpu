import type { CCIntrinsicComponentConstSpec } from "../../../../../../../store/intrinsics/types";
import { useStore } from "../../../../../../../store/react";
import { CCComponentEditorValueEditor } from "../../../../components/ValueEditor";
import { useComponentEditorStore } from "../../../../store";
import type { CCComponentEditorRendererNodeRendererProps } from "../../types";
import { CCComponentEditorRendererNodeDefaultRenderer } from "../Default";
import { ccComponentEditorRendererNodeConstLayoutConstants as constants } from "./geometry";

export function CCComponentEditorRendererNodeConstRenderer(
	props: CCComponentEditorRendererNodeRendererProps,
) {
	const { store } = useStore();
	const editorMode = useComponentEditorStore()((state) => state.editorMode);
	const config = props.node.config as CCIntrinsicComponentConstSpec["config"];

	const updateConfig = (newConfig: CCIntrinsicComponentConstSpec["config"]) =>
		store.nodes.update(props.node.id, { config: newConfig });

	return (
		<>
			<CCComponentEditorRendererNodeDefaultRenderer {...props} />
			<foreignObject
				x={constants.padding}
				y={constants.padding}
				width={props.geometry.rect.size.x - constants.padding * 2 - 30}
				height={props.geometry.rect.size.y - constants.padding * 2}
				onPointerDown={(e) => e.stopPropagation()}
			>
				<CCComponentEditorValueEditor
					value={config.data}
					onChange={(data) => updateConfig({ ...config, data })}
					mode={config.mode}
					onModeChange={(mode) => updateConfig({ ...config, mode })}
					readOnly={editorMode !== "edit"}
				/>
			</foreignObject>
		</>
	);
}
