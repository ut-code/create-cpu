import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	TextField,
} from "@mui/material";
import { useState } from "react";

export type ComponentPropertyDialogProps = {
	defaultName: string;
	onAccept(newName: string): void;
	onCancel(): void;
};

export function ComponentPropertyDialog({
	defaultName,
	onAccept,
	onCancel,
}: ComponentPropertyDialogProps) {
	const [newName, setNewName] = useState(defaultName);

	return (
		<Dialog maxWidth="xs" fullWidth open onClose={onCancel}>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					if (!newName) return;
					onAccept(newName);
				}}
			>
				<DialogTitle>Component property</DialogTitle>
				<DialogContent>
					<TextField
						label="Name"
						value={newName}
						fullWidth
						onChange={(e) => setNewName(e.target.value)}
						placeholder="Name"
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={onCancel} color="inherit">
						Cancel
					</Button>
					<Button
						variant="outlined"
						color="inherit"
						type="submit"
						disabled={!newName}
					>
						Create
					</Button>
				</DialogActions>
			</form>
		</Dialog>
	);
}
