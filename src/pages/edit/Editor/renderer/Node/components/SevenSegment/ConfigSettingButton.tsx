import { SettingsOutlined } from "@mui/icons-material";
import {
	Button,
	IconButton,
	MenuItem,
	Popover,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import { useState } from "react";
import type { CCIntrinsicComponentSevenSegmentSpec } from "../../../../../../../store/intrinsics/types";

type Props = {
	config: CCIntrinsicComponentSevenSegmentSpec["config"];
	onConfigChange: (
		config: CCIntrinsicComponentSevenSegmentSpec["config"],
	) => void;
};

export function CCComponentEditorRendererNodeSevenSegmentRendererConfigSettingButton(
	props: Props,
) {
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
	const [newConfig, setNewConfig] = useState(props.config);

	return (
		<>
			<IconButton
				aria-label="7seg settings"
				sx={{ width: "20px", height: "20px" }}
				onPointerDown={(e) => e.stopPropagation()}
				onClick={(e) => {
					e.stopPropagation();
					setNewConfig(props.config);
					setAnchorEl(e.currentTarget);
				}}
			>
				<SettingsOutlined sx={{ width: "12px", height: "12px" }} />
			</IconButton>
			<Popover
				anchorEl={anchorEl}
				open={Boolean(anchorEl)}
				onClose={() => setAnchorEl(null)}
				slotProps={{
					root: { onPointerDown: (e) => e.stopPropagation() },
					paper: { sx: { width: "300px", p: 2 } },
				}}
			>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						props.onConfigChange(newConfig);
						setAnchorEl(null);
					}}
				>
					<Typography variant="h6" gutterBottom>
						7seg Settings
					</Typography>
					<TextField
						select
						label="Pixel order"
						value={newConfig.pixelOrder ?? "row-major"}
						onChange={(e) => {
							const pixelOrder = e.target.value;
							if (pixelOrder === "row-major" || pixelOrder === "column-major") {
								setNewConfig((prev) => ({ ...prev, pixelOrder }));
							}
						}}
						size="small"
						fullWidth
						sx={{ mt: 1 }}
					>
						<MenuItem value="row-major">Row-major</MenuItem>
						<MenuItem value="column-major">Column-major</MenuItem>
					</TextField>
					<Stack direction="row" justifyContent="flex-end" mt={2} gap={1}>
						<Button
							type="button"
							variant="outlined"
							size="small"
							onClick={() => setAnchorEl(null)}
						>
							Cancel
						</Button>
						<Button type="submit" variant="contained" size="small">
							Apply
						</Button>
					</Stack>
				</form>
			</Popover>
		</>
	);
}
