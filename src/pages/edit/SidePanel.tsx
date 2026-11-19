import { Search } from "@mui/icons-material";
import { Box, InputAdornment, TextField } from "@mui/material";
import { useState } from "react";
import invariant from "tiny-invariant";
import { setDataTransferAsComponent } from "../../common/serialization";
import { useMessages } from "../../i18n";
import type { CCComponent, CCComponentId } from "../../store/component";
import { ccPinTypes } from "../../store/componentPin";
import { useStore } from "../../store/react";
import { useComponents } from "../../store/react/selectors";
import { theme } from "../../style";
import { canPlaceComponent } from "./placement";

export type SidePanelProps = {
	editedComponentId: CCComponentId;
	isOffered?: (
		component: CCComponent,
		editedComponentId: CCComponentId,
	) => boolean;
};

function ComponentRenderer({ componentId }: { componentId: CCComponentId }) {
	const { store } = useStore();
	const messages = useMessages();
	const component = store.components.get(componentId);
	invariant(component);
	const pins = store.componentPins.getManyByComponentId(componentId);

	return (
		<div aria-label={messages.sidePanel.component} role="img">
			<div>{component.name}</div>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr 1fr",
					alignItems: "center",
					marginTop: "4px",
					border: `2px solid ${theme.colors.black}`,
					borderRadius: "2px",
					background: theme.colors.white,
				}}
			>
				{ccPinTypes.map((type) => (
					<div
						key={type}
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "6px",
							padding: "6px 0",
						}}
					>
						{pins
							.filter((pin) => pin.type === type)
							.map((pin) => (
								<div
									key={pin.id}
									style={{
										display: "flex",
										alignItems: "center",
										gap: "3px",
										...(
											{
												input: {
													flexDirection: "row",
													marginInlineStart: "-8px",
												},
												output: {
													flexDirection: "row-reverse",
													marginInlineEnd: "-8px",
												},
											} as const
										)[pin.type],
									}}
								>
									<div
										style={{
											width: "10px",
											height: "10px",
											border: `2px solid ${theme.colors.black}`,
											borderRadius: "4px",
											background: theme.colors.white,
										}}
									/>
									<div>{pin.name}</div>
								</div>
							))}
					</div>
				))}
			</div>
		</div>
	);
}

export default function SidePanel(sidePanelProps: SidePanelProps) {
	const { editedComponentId, isOffered = () => true } = sidePanelProps;
	const { store } = useStore();
	const messages = useMessages();
	const components = useComponents();
	const [searchText, setSearchText] = useState("");

	return (
		<Box sx={{ overflowY: "auto" }}>
			<TextField
				size="small"
				sx={{ m: 1 }}
				placeholder={messages.sidePanel.search}
				slotProps={{
					htmlInput: { "aria-label": messages.sidePanel.search },
					input: {
						startAdornment: (
							<InputAdornment position="start">
								<Search />
							</InputAdornment>
						),
					},
				}}
				value={searchText}
				onChange={(e) => {
					setSearchText(e.target.value);
				}}
			/>
			<Box component="ul" sx={{ m: 0, p: 0, listStyleType: "none" }}>
				{components
					.filter((component) => component.name.includes(searchText))
					.filter((component) =>
						canPlaceComponent(
							store,
							editedComponentId,
							component.id,
							isOffered,
						),
					)
					.map((component) => (
						<Box
							key={component.id}
							component="li"
							draggable
							sx={{ cursor: "grab", p: 2 }}
							onDragStart={(e) => {
								setDataTransferAsComponent(e.dataTransfer, component.id);
							}}
						>
							<ComponentRenderer componentId={component.id} />
						</Box>
					))}
			</Box>
		</Box>
	);
}
