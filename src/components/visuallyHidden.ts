/** For text only screen readers read, such as the label of something drawn as an icon */
export const visuallyHiddenSx = {
	position: "absolute",
	width: "1px",
	height: "1px",
	overflow: "hidden",
	clip: "rect(0 0 0 0)",
	whiteSpace: "nowrap",
} as const;
