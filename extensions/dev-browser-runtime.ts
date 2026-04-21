export type SessionRuntimeState = {
	pageOpen: boolean;
	usedBrowser: boolean;
};

export function createSessionRuntimeState(): SessionRuntimeState {
	return {
		pageOpen: false,
		usedBrowser: false,
	};
}

export function recordSuccessfulAction(
	state: SessionRuntimeState,
	action: string,
): void {
	state.usedBrowser = true;
	if (action === "close") {
		state.pageOpen = false;
		return;
	}

	state.pageOpen = true;
}

export function createSerialExecutor() {
	let queue: Promise<void> = Promise.resolve();

	return {
		async run<T>(fn: () => Promise<T>): Promise<T> {
			const previous = queue;
			let release!: () => void;
			queue = new Promise<void>((resolve) => {
				release = resolve;
			});

			await previous.catch(() => undefined);

			try {
				return await fn();
			} finally {
				release();
			}
		},

		async drain(): Promise<void> {
			await queue.catch(() => undefined);
		},
	};
}
