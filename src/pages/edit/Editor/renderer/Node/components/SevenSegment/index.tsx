import type { CCIntrinsicComponentSevenSegmentSpec } from "../../../../../../../store/intrinsics/types";
import { useStore } from "../../../../../../../store/react";
import { useComponentEditorStore } from "../../../../store";
import type { CCComponentEditorRendererNodeRendererProps } from "../../types";
import { CCComponentEditorRendererNodeDefaultRenderer } from "../Default";
import { CCComponentEditorRendererNodeSevenSegmentRendererConfigSettingButton } from "./ConfigSettingButton";

export function CCComponentEditorRendererNodeSevenSegmentRenderer(
	props: CCComponentEditorRendererNodeRendererProps,
) {
	const { store } = useStore();
	const editorMode = useComponentEditorStore()((state) => state.editorMode);
	const config = props.node
		.config as CCIntrinsicComponentSevenSegmentSpec["config"];

	return (
		<>
			<CCComponentEditorRendererNodeDefaultRenderer {...props} />
			{editorMode === "edit" && (
				<foreignObject x={4} y={0} width={20} height={20}>
					<CCComponentEditorRendererNodeSevenSegmentRendererConfigSettingButton
						config={config}
						onConfigChange={(newConfig) =>
							store.nodes.update(props.node.id, { config: newConfig })
						}
					/>
				</foreignObject>
			)}
		</>
	);
}
