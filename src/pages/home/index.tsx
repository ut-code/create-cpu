import {
	Add as AddIcon,
	Download as DownloadIcon,
	MoreVert as MoreVertIcon,
	Upload as UploadIcon,
} from "@mui/icons-material";
import {
	Alert,
	Box,
	Button,
	Card,
	CardActionArea,
	Container,
	IconButton,
	Menu,
	MenuItem,
	Snackbar,
	Typography,
} from "@mui/material";
import { type ChangeEvent, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import {
	type CCComponent,
	type CCComponentId,
	CCComponentStore,
} from "../../store/component";
import { useStore } from "../../store/react";
import { useComponents } from "../../store/react/selectors";
import { importStoreJson } from "../../store/savedStore";
import { describeComponentDeletion } from "./componentDeletion";

type PendingAction =
	| { type: "reset" }
	| { type: "import"; fileName: string; json: string }
	| { type: "delete"; componentId: CCComponentId };

export default function HomePage() {
	const { store, resetStore } = useStore();
	const navigate = useNavigate();
	const components = useComponents().filter(
		(component) => !component.intrinsicType,
	);
	const downloadStore = () => {
		const storeJSON = store.toJSON();
		const blob = new Blob([storeJSON], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "store.json";
		a.click();
		URL.revokeObjectURL(url);
	};

	const [pendingAction, setPendingAction] = useState<PendingAction | null>(
		null,
	);
	// The message stays while the snackbar slides out
	const [error, setError] = useState({ message: "", isShown: false });
	const showError = (message: string) => setError({ message, isShown: true });

	const chooseFileToImport = async (e: ChangeEvent<HTMLInputElement>) => {
		const input = e.currentTarget;
		const file = input.files?.[0];
		// Cleared so that choosing the same file again is noticed
		input.value = "";
		if (!file) return;
		let json: string;
		try {
			json = await file.text();
		} catch (readError) {
			console.error(readError);
			showError(`Could not read ${file.name}.`);
			return;
		}
		try {
			importStoreJson(json);
		} catch (importError) {
			console.error(importError);
			showError(
				`Could not import ${file.name}: it is not a file exported from this app, or it is damaged.`,
			);
			return;
		}
		setPendingAction({ type: "import", fileName: file.name, json });
	};

	const replaceStore = (file?: { name: string; json: string }) => {
		try {
			resetStore(file?.json);
		} catch (replaceError) {
			console.error(replaceError);
			showError(
				replaceError instanceof DOMException &&
					replaceError.name === "QuotaExceededError"
					? "The storage of this browser is full, so nothing was replaced."
					: `Could not ${file ? `import ${file.name}` : "reset the components"}.`,
			);
		}
	};

	const deleteComponent = (component: CCComponent) => {
		store.components.unregister(component.id).catch((deleteError) => {
			console.error(deleteError);
			showError(`Could not delete ${component.name}.`);
		});
	};

	const componentToDelete =
		pendingAction?.type === "delete"
			? store.components.get(pendingAction.componentId)
			: undefined;

	const inputRef = useRef<HTMLInputElement>(null);

	const onCreateComponent = () => {
		const component = CCComponentStore.create({
			name: "New Component",
		});
		store.components.register(component);
		navigate(`/components/${component.id}`);
	};

	const [componentMenuState, setComponentMenuState] = useState<{
		componentId: CCComponentId;
		anchorEl: HTMLElement | null;
	} | null>(null);

	return (
		<div style={{ overflowY: "auto" }}>
			<Container sx={{ px: 2, py: 6 }} maxWidth="md">
				<Typography variant="h2" typography="h4" gutterBottom>
					File
				</Typography>
				<Box sx={{ display: "flex", gap: 1 }}>
					<Button
						variant="outlined"
						color="inherit"
						onClick={downloadStore}
						startIcon={<DownloadIcon />}
					>
						Export
					</Button>
					<input
						ref={inputRef}
						type="file"
						style={{ display: "none" }}
						onChange={chooseFileToImport}
					/>
					<Button
						variant="outlined"
						color="inherit"
						onClick={() => inputRef.current?.click()}
						startIcon={<UploadIcon />}
					>
						Import
					</Button>
					<div style={{ flexGrow: 1 }} />
					<Button
						variant="text"
						color="error"
						onClick={() => setPendingAction({ type: "reset" })}
					>
						Reset
					</Button>
				</Box>
				<Box sx={{ display: "flex", alignItems: "center", mt: 4 }}>
					<div style={{ flexGrow: 1 }}>
						<Typography variant="h2" typography="h4">
							Components
						</Typography>
						<Typography color="textSecondary">
							Select a component to start editing.
						</Typography>
					</div>
					<div>
						<Button
							onClick={onCreateComponent}
							variant="contained"
							startIcon={<AddIcon />}
						>
							Create
						</Button>
					</div>
				</Box>
				<Box
					sx={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
						mt: 2,
						gap: 2,
					}}
				>
					{components.map((component) => (
						<Card
							key={component.id}
							variant="outlined"
							sx={{ position: "relative" }}
						>
							<CardActionArea
								component={Link}
								to={`/components/${component.id}`}
								sx={{
									display: "flex",
									flexDirection: "column",
									alignItems: "flex-start",
									justifyContent: "flex-start",
									height: "100%",
									p: 2,
								}}
							>
								<Typography variant="h6">{component.name}</Typography>
								<Typography variant="body2" color="text.secondary">
									{store.nodes.getManyByParentComponentId(component.id).length}{" "}
									nodes
								</Typography>
							</CardActionArea>
							<IconButton
								sx={{
									position: "absolute",
									top: (theme) => theme.spacing(1),
									right: (theme) => theme.spacing(1),
								}}
								onClick={(e) => {
									setComponentMenuState({
										componentId: component.id,
										anchorEl: e.currentTarget,
									});
								}}
							>
								<MoreVertIcon />
							</IconButton>
						</Card>
					))}
				</Box>
				{componentMenuState && (
					<Menu
						anchorEl={componentMenuState.anchorEl}
						open
						onClose={() => setComponentMenuState(null)}
						anchorOrigin={{
							vertical: "bottom",
							horizontal: "left",
						}}
					>
						<MenuItem
							onClick={() => {
								setPendingAction({
									type: "delete",
									componentId: componentMenuState.componentId,
								});
								setComponentMenuState(null);
							}}
						>
							Delete
						</MenuItem>
					</Menu>
				)}
				{pendingAction?.type === "reset" && (
					<ConfirmDialog
						title="Reset all components?"
						confirmLabel="Reset"
						onCancel={() => setPendingAction(null)}
						onConfirm={() => {
							setPendingAction(null);
							replaceStore();
						}}
					>
						Every component is replaced with the sample. This cannot be undone,
						so export first to keep a copy.
					</ConfirmDialog>
				)}
				{pendingAction?.type === "import" && (
					<ConfirmDialog
						title={`Import ${pendingAction.fileName}?`}
						confirmLabel="Import"
						onCancel={() => setPendingAction(null)}
						onConfirm={() => {
							setPendingAction(null);
							replaceStore({
								name: pendingAction.fileName,
								json: pendingAction.json,
							});
						}}
					>
						Every current component is replaced with the ones in the file. This
						cannot be undone, so export first to keep a copy.
					</ConfirmDialog>
				)}
				{componentToDelete && (
					<ConfirmDialog
						title={`Delete ${componentToDelete.name}?`}
						confirmLabel="Delete"
						onCancel={() => setPendingAction(null)}
						onConfirm={() => {
							setPendingAction(null);
							deleteComponent(componentToDelete);
						}}
					>
						{describeComponentDeletion(store, componentToDelete.id)}
					</ConfirmDialog>
				)}
				<Snackbar
					open={error.isShown}
					anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
				>
					<Alert
						severity="error"
						variant="filled"
						sx={{ maxWidth: "600px" }}
						onClose={() => setError((shown) => ({ ...shown, isShown: false }))}
					>
						{error.message}
					</Alert>
				</Snackbar>
			</Container>
		</div>
	);
}
