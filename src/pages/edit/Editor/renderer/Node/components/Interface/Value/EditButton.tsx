import { Edit } from "@mui/icons-material";
import { IconButton, Popover } from "@mui/material";
import { useState } from "react";
import type { CCIntrinsicComponentConstSpecConfigViewMode as Mode } from "../../../../../../../../store/intrinsics/types";
import type { SimulationValue } from "../../../../../../../../store/simulation";
import { CCComponentEditorValueEditor } from "../../../../../components/ValueEditor";

type Props = {
	value: SimulationValue;
	onChange: (value: SimulationValue) => void;
};

export function CCComponentEditorRendererNodeInterfaceRendererValueEditButton(
	props: Props,
) {
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
	const [mode, setMode] = useState<Mode>("hex");

	return (
		<>
			<IconButton
				sx={{ width: "14px", height: "14px" }}
				// Prevent the drag behavior of the parent node when clicking the button
				onPointerDown={(e) => e.stopPropagation()}
				onClick={(e) => {
					e.stopPropagation();
					setAnchorEl(e.currentTarget);
				}}
			>
				<Edit sx={{ width: "10px", height: "10px" }} />
			</IconButton>
			<Popover
				anchorEl={anchorEl}
				open={Boolean(anchorEl)}
				onClose={() => setAnchorEl(null)}
				slotProps={{
					root: { onPointerDown: (e) => e.stopPropagation() },
					paper: { sx: { width: "300px", height: "120px", p: 1 } },
				}}
			>
				<CCComponentEditorValueEditor
					value={props.value}
					onChange={(value) => {
						props.onChange(value);
						setAnchorEl(null);
					}}
					mode={mode}
					onModeChange={setMode}
					bitWidth={props.value.length}
				/>
			</Popover>
		</>
	);
}
