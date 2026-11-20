import type { ButtonProps, ToggleButtonProps } from "@mui/material";
import { theme } from "../style";

// The looks of controls a stage text draws too, so that the two cannot drift apart

export const checkButtonLook = {
	variant: "contained",
	sx: { background: theme.colors.tutorial },
} as const satisfies ButtonProps;

export const valueApplyButtonLook = {
	variant: "outlined",
	size: "small",
	sx: { py: 0.25 },
} as const satisfies ButtonProps;

export const pinApplyButtonLook = {
	variant: "contained",
	size: "small",
} as const satisfies ButtonProps;

export const autoToggleButtonLook = {
	size: "small",
} as const satisfies Partial<ToggleButtonProps>;
