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
import { downloadJson } from "../../common/downloadJson";
import { isStorageFull } from "../../common/storageError";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useMessages } from "../../i18n";
import {
	type CCComponent,
	type CCComponentId,
	CCComponentStore,
} from "../../store/component";
import { useStore } from "../../store/react";
import { useComponents } from "../../store/react/selectors";
import { importStoreJson } from "../../store/savedStore";
import { describeComponentDeletion } from "./componentDeletion";
import { describeHomeError, type HomeError } from "./homeError";

type PendingAction =
	| { type: "reset" }
	| { type: "import"; fileName: string; json: string }
	| { type: "delete"; componentId: CCComponentId };

export default function HomePage() {
	const { store, resetStore } = useStore();
	const messages = useMessages();
	const navigate = useNavigate();
	const components = useComponents().filter(
		(component) => !component.intrinsicType,
	);

	const [pendingAction, setPendingAction] = useState<PendingAction | null>(
		null,
	);
	// The error stays while the snackbar slides out
	const [errorNotice, setErrorNotice] = useState<{
		error: HomeError | null;
		isShown: boolean;
	}>({ error: null, isShown: false });
	const showError = (error: HomeError) =>
		setErrorNotice({ error, isShown: true });

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
			showError({ type: "read", fileName: file.name });
			return;
		}
		try {
			importStoreJson(json);
		} catch (importError) {
			console.error(importError);
			showError({ type: "notImportable", fileName: file.name });
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
				isStorageFull(replaceError)
					? { type: "storageFull" }
					: file
						? { type: "importFailed", fileName: file.name }
						: { type: "resetFailed" },
			);
		}
	};

	const deleteComponent = (component: CCComponent) => {
		store.components.unregister(component.id).catch((deleteError) => {
			console.error(deleteError);
			showError({ type: "deleteFailed", componentName: component.name });
		});
	};

	const componentToDelete =
		pendingAction?.type === "delete"
			? store.components.get(pendingAction.componentId)
			: undefined;

	const inputRef = useRef<HTMLInputElement>(null);

	const onCreateComponent = () => {
		const component = CCComponentStore.create({
			name: messages.common.newComponentName,
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
					{messages.home.file}
				</Typography>
				<Box sx={{ display: "flex", gap: 1 }}>
					<Button
						variant="outlined"
						color="inherit"
						onClick={() => downloadJson(store.toJSON(), "store.json")}
						startIcon={<DownloadIcon />}
					>
						{messages.home.export}
					</Button>
					<input
						ref={inputRef}
						type="file"
						accept=".json,application/json"
						style={{ display: "none" }}
						onChange={chooseFileToImport}
					/>
					<Button
						variant="outlined"
						color="inherit"
						onClick={() => inputRef.current?.click()}
						startIcon={<UploadIcon />}
					>
						{messages.home.import}
					</Button>
					<div style={{ flexGrow: 1 }} />
					<Button
						variant="text"
						color="error"
						onClick={() => setPendingAction({ type: "reset" })}
					>
						{messages.home.reset}
					</Button>
				</Box>
				<Box sx={{ display: "flex", alignItems: "center", mt: 4 }}>
					<div style={{ flexGrow: 1 }}>
						<Typography variant="h2" typography="h4">
							{messages.common.components}
						</Typography>
						<Typography color="textSecondary">
							{messages.home.selectToEdit}
						</Typography>
					</div>
					<div>
						<Button
							onClick={onCreateComponent}
							variant="contained"
							startIcon={<AddIcon />}
						>
							{messages.home.create}
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
									{messages.home.nodeCount(
										store.nodes.getManyByParentComponentId(component.id).length,
									)}
								</Typography>
							</CardActionArea>
							<IconButton
								aria-label={messages.home.componentMenu}
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
							{messages.common.delete}
						</MenuItem>
					</Menu>
				)}
				{pendingAction?.type === "reset" && (
					<ConfirmDialog
						title={messages.home.resetDialog.title}
						confirmLabel={messages.home.reset}
						onCancel={() => setPendingAction(null)}
						onConfirm={() => {
							setPendingAction(null);
							replaceStore();
						}}
					>
						{messages.home.resetDialog.body}
					</ConfirmDialog>
				)}
				{pendingAction?.type === "import" && (
					<ConfirmDialog
						title={messages.home.importDialog.title(pendingAction.fileName)}
						confirmLabel={messages.home.import}
						onCancel={() => setPendingAction(null)}
						onConfirm={() => {
							setPendingAction(null);
							replaceStore({
								name: pendingAction.fileName,
								json: pendingAction.json,
							});
						}}
					>
						{messages.home.importDialog.body}
					</ConfirmDialog>
				)}
				{componentToDelete && (
					<ConfirmDialog
						title={messages.home.deleteDialog.title(componentToDelete.name)}
						confirmLabel={messages.common.delete}
						onCancel={() => setPendingAction(null)}
						onConfirm={() => {
							setPendingAction(null);
							deleteComponent(componentToDelete);
						}}
					>
						{describeComponentDeletion(store, componentToDelete.id, messages)}
					</ConfirmDialog>
				)}
				<Snackbar
					open={errorNotice.isShown}
					anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
				>
					<Alert
						severity="error"
						variant="filled"
						sx={{ maxWidth: "600px" }}
						onClose={() =>
							setErrorNotice((notice) => ({ ...notice, isShown: false }))
						}
					>
						{errorNotice.error &&
							describeHomeError(errorNotice.error, messages)}
					</Alert>
				</Snackbar>
			</Container>
		</div>
	);
}
