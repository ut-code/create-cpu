let isLoaded = false;

// Only Japanese needs the font, and its stylesheet alone is about 100 kB, so it is not
// part of the stylesheet every first visit waits for
export function loadJapaneseFont(): void {
	if (isLoaded) return;
	isLoaded = true;
	Promise.all([
		import("@fontsource/noto-sans-jp/400.css"),
		import("@fontsource/noto-sans-jp/500.css"),
		import("@fontsource/noto-sans-jp/700.css"),
	]).catch((error) => {
		console.warn("Could not load the Japanese font", error);
	});
}
