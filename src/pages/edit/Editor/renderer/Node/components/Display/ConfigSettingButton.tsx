import { SettingsOutlined } from "@mui/icons-material";
import { IconButton } from "@mui/material";
import type { CCNodeId } from "../../../../../../../store/node";
import type { CCComponentEditorRendererNodeGeometry } from "../../types";

type Props = {
	nodeId: CCNodeId;
	geometry: CCComponentEditorRendererNodeGeometry;
};

export function CCComponentEditorRendererNodeDisplayRendererConfigSettingButton(
	_props: Props,
) {
	return (
		<IconButton
			sx={{ width: "20px", height: "20px" }}
			onPointerDown={(e) => {
				e.stopPropagation();
			}}
			disableTouchRipple
			disableFocusRipple
		>
			<SettingsOutlined sx={{ width: "12px", height: "12px" }} />
		</IconButton>
	);
}
