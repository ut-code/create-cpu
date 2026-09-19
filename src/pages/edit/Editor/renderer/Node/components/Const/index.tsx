import { Stack, styled, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useState } from "react";
import type {
	CCIntrinsicComponentConstSpec,
	CCIntrinsicComponentConstSpecConfigViewMode as Mode,
} from "../../../../../../../store/intrinsics/types";
import { useStore } from "../../../../../../../store/react";
import type { CCComponentEditorRendererNodeRendererProps } from "../../types";
import { CCComponentEditorRendererNodeDefaultRenderer } from "../Default";
import { ccComponentEditorRendererNodeConstLayoutConstants as constants } from "./geometry";
import { formatConstData, parseConstData } from "./value";

const modes: Record<Mode, string> = {
	binary: "Binary",
	hex: "Hex",
	"utf-8": "UTF-8",
};

const Editor = styled("textarea")(({ theme }) => ({
	padding: theme.spacing(1),
	flex: 1,
	resize: "none",
	borderStyle: "solid",
	borderWidth: "1px",
	borderRadius: theme.shape.borderRadius,
	outline: "none",
	fontFamily: "monospace",
	wordBreak: "break-all",
}));

export function CCComponentEditorRendererNodeConstRenderer(
	props: CCComponentEditorRendererNodeRendererProps,
) {
	const { store } = useStore();
	const config = props.node.config as CCIntrinsicComponentConstSpec["config"];

	const [text, setText] = useState(() =>
		formatConstData(config.data, config.mode),
	);
	const [isInvalid, setIsInvalid] = useState(false);

	const updateConfig = (newConfig: CCIntrinsicComponentConstSpec["config"]) =>
		store.nodes.update(props.node.id, { config: newConfig });

	const changeMode = (mode: Mode) => {
		updateConfig({ ...config, mode });
		setText(formatConstData(config.data, mode));
		setIsInvalid(false);
	};

	const changeText = (newText: string) => {
		setText(newText);
		const data = parseConstData(newText, config.mode);
		setIsInvalid(!data);
		if (data) updateConfig({ ...config, data });
	};

	return (
		<>
			<CCComponentEditorRendererNodeDefaultRenderer {...props} />
			<foreignObject
				x={constants.padding}
				y={constants.padding}
				width={props.geometry.rect.size.x - constants.padding * 2 - 30}
				height={props.geometry.rect.size.y - constants.padding * 2}
				onPointerDown={(e) => e.stopPropagation()}
			>
				<Stack sx={{ height: "100%", gap: 0.5 }}>
					<ToggleButtonGroup
						value={config.mode}
						onChange={(_, value) => {
							if (!Object.hasOwn(modes, value)) return;
							changeMode(value as Mode);
						}}
						exclusive
						size="small"
						sx={{ width: "100%" }}
					>
						{Object.entries(modes).map(([mode, label]) => (
							<ToggleButton key={mode} value={mode} sx={{ flex: 1, p: 0.25 }}>
								{label}
							</ToggleButton>
						))}
					</ToggleButtonGroup>
					<Editor
						value={text}
						onChange={(e) => changeText(e.target.value)}
						spellCheck={false}
						sx={{ borderColor: isInvalid ? "error.main" : "divider" }}
					/>
				</Stack>
			</foreignObject>
		</>
	);
}
