import { SettingsOutlined } from "@mui/icons-material";
import {
	Button,
	FormLabel,
	IconButton,
	Popover,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import { useState } from "react";
import type { CCIntrinsicComponentDisplaySpec } from "../../../../../../../store/intrinsics/types";

type Props = {
	config: CCIntrinsicComponentDisplaySpec["config"];
	onConfigChange: (config: CCIntrinsicComponentDisplaySpec["config"]) => void;
};

export function CCComponentEditorRendererNodeDisplayRendererConfigSettingButton(
	props: Props,
) {
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
	const [newConfig, setNewConfig] = useState(props.config);

	return (
		<>
			<IconButton
				sx={{ width: "20px", height: "20px" }}
				// Prevent the drag behavior of the parent node when clicking the button
				onPointerDown={(e) => e.stopPropagation()}
				onClick={(e) => {
					e.stopPropagation();
					setAnchorEl(e.currentTarget);
					setNewConfig(props.config);
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
						Display Settings
					</Typography>
					<FormLabel component="div" sx={{ mb: 0.5 }}>
						Resolution
					</FormLabel>
					<Stack direction="row" alignItems="center" gap={1}>
						<TextField
							value={newConfig.resolution.x || ""}
							onChange={(e) =>
								setNewConfig((prev) => ({
									...prev,
									resolution: {
										...prev.resolution,
										x: parseInt(e.target.value, 10) || 0,
									},
								}))
							}
							size="small"
							sx={{ flex: 1 }}
							slotProps={{
								htmlInput: { inputMode: "numeric", sx: { textAlign: "end" } },
							}}
						/>
						<Typography component="span" variant="body1">
							x
						</Typography>
						<TextField
							value={newConfig.resolution.y || ""}
							onChange={(e) =>
								setNewConfig((prev) => ({
									...prev,
									resolution: {
										...prev.resolution,
										y: parseInt(e.target.value, 10) || 0,
									},
								}))
							}
							size="small"
							sx={{ flex: 1 }}
							slotProps={{
								htmlInput: { inputMode: "numeric", sx: { textAlign: "end" } },
							}}
						/>
					</Stack>
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
