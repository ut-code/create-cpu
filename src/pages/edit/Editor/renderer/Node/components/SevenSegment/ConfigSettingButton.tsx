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
import { useMessages } from "../../../../../../../i18n";
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
	const messages = useMessages();
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
	const [newConfig, setNewConfig] = useState(props.config);

	return (
		<>
			<IconButton
				aria-label={messages.editor.sevenSegmentSettings}
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
						{messages.editor.sevenSegmentSettings}
					</Typography>
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
						sx={{ mt: 1 }}
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
