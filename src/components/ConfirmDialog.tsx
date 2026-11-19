import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
} from "@mui/material";
import type { ReactNode } from "react";
import { useMessages } from "../i18n";

export type ConfirmDialogProps = {
	title: string;
	children: ReactNode;
	confirmLabel: string;
	onConfirm(): void;
	onCancel(): void;
};

export function ConfirmDialog({
	title,
	children,
	confirmLabel,
	onConfirm,
	onCancel,
}: ConfirmDialogProps) {
	const messages = useMessages();
	return (
		<Dialog maxWidth="xs" fullWidth open onClose={onCancel}>
			<DialogTitle>{title}</DialogTitle>
			<DialogContent>
				<DialogContentText>{children}</DialogContentText>
			</DialogContent>
			<DialogActions>
				<Button onClick={onCancel} color="inherit" autoFocus>
					{messages.common.cancel}
				</Button>
				<Button onClick={onConfirm} color="error" variant="contained">
					{confirmLabel}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
