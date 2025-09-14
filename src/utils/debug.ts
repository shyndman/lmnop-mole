declare const DEBUG_MODE: boolean;

const debugMode: boolean = DEBUG_MODE;

export const debugLog = (filterName: string, ...args: any[]) => {
	if (debugMode) {
		console.log(`[${filterName}]`, ...args);
	}
};
