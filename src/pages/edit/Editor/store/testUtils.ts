import { afterAll, beforeAll, vi } from "vitest";

export function stubResizeObserver() {
	// The perspective slice observes the size of the renderer, which there is none of here
	beforeAll(() => {
		vi.stubGlobal(
			"ResizeObserver",
			class {
				observe() {}
				unobserve() {}
				disconnect() {}
			},
		);
	});
	afterAll(() => {
		vi.unstubAllGlobals();
	});
}
