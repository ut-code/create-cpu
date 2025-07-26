import {
	Add as AddIcon,
	Upload as UploadIcon,
	Download as DownloadIcon,
	MoreVert,
} from "@mui/icons-material";
import {
	Box,
	Button,
	Card,
	CardActionArea,
	Container,
	IconButton,
	Menu,
	MenuItem,
	Typography,
} from "@mui/material";
import { useRef, useState } from "react";
import { ComponentPropertyDialog } from "../../components/ComponentPropertyDialog";
import type { CCStorePropsFromJson } from "../../store";
import { type CCComponentId, CCComponentStore } from "../../store/component";
import { useStore } from "../../store/react";
import { useComponents } from "../../store/react/selectors";

export type HomePageProps = {
	onComponentSelected: (componentId: CCComponentId) => void;
};

export default function HomePage({ onComponentSelected }: HomePageProps) {
	const { store, resetStore } = useStore();
	const components = useComponents().filter(
		(component) => !component.intrinsicType
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

	const uploadStore = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			const storeJSON = reader.result as string;
			const storeData = JSON.parse(storeJSON);
			resetStore(storeData as CCStorePropsFromJson);
		};
		reader.readAsText(file);
	};

	const inputRef = useRef<HTMLInputElement>(null);

	const [isComponentPropertyDialogOpen, setIsComponentPropertyDialogOpen] =
		useState(false);

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
						onChange={(e) => uploadStore(e)}
					/>
					<Button
						variant="outlined"
						color="inherit"
						onClick={() => inputRef.current?.click()}
						startIcon={<UploadIcon />}
					>
						Import
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
							variant="outlined"
							onClick={() => setIsComponentPropertyDialogOpen(true)}
							startIcon={<AddIcon />}
						>
							Create new...
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
								sx={{
									display: "flex",
									flexDirection: "column",
									alignItems: "flex-start",
									justifyContent: "flex-start",
									height: "100%",
									p: 2,
								}}
								onClick={() => onComponentSelected(component.id)}
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
								<MoreVert />
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
								setIsComponentPropertyDialogOpen(true);
								setComponentMenuState(null);
							}}
						>
							Rename
						</MenuItem>
						<MenuItem
							onClick={() => {
								store.components.unregister(componentMenuState.componentId);
								setComponentMenuState(null);
							}}
						>
							Delete
						</MenuItem>
					</Menu>
				)}
				{isComponentPropertyDialogOpen && (
					<ComponentPropertyDialog
						defaultName=""
						onAccept={(newName) => {
							const newComponent = CCComponentStore.create({
								name: newName,
							});
							store.components.register(newComponent);
							onComponentSelected(newComponent.id);
						}}
						onCancel={() => {
							setIsComponentPropertyDialogOpen(false);
						}}
					/>
				)}
			</Container>
		</div>
	);
}
