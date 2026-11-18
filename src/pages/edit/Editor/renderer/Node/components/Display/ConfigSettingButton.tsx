import { SettingsOutlined } from "@mui/icons-material";
import {
	Button,
	FormLabel,
	IconButton,
	MenuItem,
	Popover,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import { useState } from "react";
import { useMessages } from "../../../../../../../i18n";
import type { CCIntrinsicComponentDisplaySpec } from "../../../../../../../store/intrinsics/types";

export const DISPLAY_CONFIG_SETTING_BUTTON_SIZE = 16;

type Props = {
	config: CCIntrinsicComponentDisplaySpec["config"];
	onConfigChange: (config: CCIntrinsicComponentDisplaySpec["config"]) => void;
};

export function CCComponentEditorRendererNodeDisplayRendererConfigSettingButton(
	props: Props,
) {
	const messages = useMessages();
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
	const [newConfig, setNewConfig] = useState(props.config);

	return (
		<>
			<IconButton
				aria-label={messages.editor.displaySettings}
				sx={{
					display: "flex",
					width: DISPLAY_CONFIG_SETTING_BUTTON_SIZE,
					height: DISPLAY_CONFIG_SETTING_BUTTON_SIZE,
					p: 0,
				}}
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
						{messages.editor.displaySettings}
					</Typography>
					<FormLabel component="div" sx={{ mb: 0.5 }}>
						{messages.editor.resolution}
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
					<TextField
						select
						label={messages.editor.pixelOrder}
						value={newConfig.pixelOrder ?? "row-major"}
						onChange={(e) => {
							const pixelOrder = e.target.value;
							if (pixelOrder === "row-major" || pixelOrder === "column-major") {
								setNewConfig((prev) => ({ ...prev, pixelOrder }));
							}
						}}
						size="small"
						fullWidth
						sx={{ mt: 2 }}
					>
						<MenuItem value="row-major">{messages.editor.rowMajor}</MenuItem>
						<MenuItem value="column-major">
							{messages.editor.columnMajor}
						</MenuItem>
					</TextField>
					<Stack direction="row" justifyContent="flex-end" mt={2} gap={1}>
						<Button
							type="button"
							variant="outlined"
							size="small"
							onClick={() => setAnchorEl(null)}
						>
							{messages.common.cancel}
						</Button>
						<Button type="submit" variant="contained" size="small">
							{messages.common.apply}
						</Button>
					</Stack>
				</form>
			</Popover>
		</>
	);
}
