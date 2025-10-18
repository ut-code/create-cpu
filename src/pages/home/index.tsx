import {
	Add as AddIcon,
	Download as DownloadIcon,
	MoreVert as MoreVertIcon,
	NoteAdd as NoteAddIcon,
	Upload as UploadIcon,
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
import { type CCComponentId, CCComponentStore } from "../../store/component";
import { useStore } from "../../store/react";
import { useComponents } from "../../store/react/selectors";

export type HomePageProps = {
	onComponentSelected: (componentId: CCComponentId) => void;
};

export default function HomePage({ onComponentSelected }: HomePageProps) {
	const { store, resetStore } = useStore();
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

	const uploadStore = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			resetStore(reader.result as string);
		};
		reader.readAsText(file);
	};

	const inputRef = useRef<HTMLInputElement>(null);

	const onCreateComponent = () => {
		const component = CCComponentStore.create({
			name: "New Component",
		});
		store.components.register(component);
		onComponentSelected(component.id);
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
					<Button variant="outlined" startIcon={<NoteAddIcon />} disabled>
						New File
					</Button>
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
								store.components.unregister(componentMenuState.componentId);
								setComponentMenuState(null);
							}}
						>
							Delete
						</MenuItem>
					</Menu>
				)}
			</Container>
		</div>
	);
}
