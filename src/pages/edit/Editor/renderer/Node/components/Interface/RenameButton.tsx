import { Edit } from "@mui/icons-material";
import {
	Button,
	IconButton,
	Popover,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import { useState } from "react";

type Props = {
	name: string;
	onNameChange: (name: string) => void;
};

export function CCComponentEditorRendererNodeInterfaceRendererRenameButton(
	props: Props,
) {
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
	const [newName, setNewName] = useState(props.name);
	const trimmedNewName = newName.trim();

	return (
		<>
			<IconButton
				sx={{ width: "14px", height: "14px" }}
				// Prevent the drag behavior of the parent node when clicking the button
				onPointerDown={(e) => e.stopPropagation()}
				onClick={(e) => {
					e.stopPropagation();
					setAnchorEl(e.currentTarget);
					setNewName(props.name);
				}}
			>
				<Edit sx={{ width: "10px", height: "12px" }} />
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
						if (!trimmedNewName) return;
						props.onNameChange(trimmedNewName);
						setAnchorEl(null);
					}}
				>
					<Typography variant="h6" gutterBottom>
						Rename Pin
					</Typography>
					<TextField
						value={newName}
						onChange={(e) => setNewName(e.target.value)}
						size="small"
						fullWidth
						autoFocus
					/>
					<Stack direction="row" justifyContent="flex-end" mt={2} gap={1}>
						<Button
							type="button"
							variant="outlined"
							size="small"
							onClick={() => setAnchorEl(null)}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							variant="contained"
							size="small"
							disabled={!trimmedNewName}
						>
							Apply
						</Button>
					</Stack>
				</form>
			</Popover>
		</>
	);
}
