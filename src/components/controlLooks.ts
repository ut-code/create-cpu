import type {
	ButtonProps,
	SxProps,
	Theme,
	ToggleButtonProps,
} from "@mui/material";
import { theme } from "../style";

// The looks of controls a marked text draws too, so that the two cannot drift apart

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

/** The look of "Add" and "Remove" in the pin editor */
export const pinFieldButtonLook = {
	variant: "outlined",
	size: "small",
} as const satisfies ButtonProps;

export const autoToggleButtonLook = {
	size: "small",
} as const satisfies Partial<ToggleButtonProps>;

const sxList = (sx: SxProps<Theme> | undefined) =>
	sx === undefined ? [] : Array.isArray(sx) ? sx : [sx];

/** The `sx` of `look` with `sx` after it, so that neither is dropped */
export function withLookSx(
	look: ButtonProps | Partial<ToggleButtonProps>,
	sx: SxProps<Theme>,
): SxProps<Theme> {
	return [...sxList(look.sx), ...sxList(sx)];
}
