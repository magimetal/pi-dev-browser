import type {
	AgentToolResult,
	ExecOptions,
	ExecResult,
	ExtensionAPI,
	ExtensionContext,
	ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { describe, expect, it } from "vitest";
import devBrowserExtension from "../extensions/dev-browser";

type BrowserResultDetails = {
	action?: string;
	command?: string;
	error?: string;
	exitCode?: number;
	mode?: string;
};

type BrowserExecuteTool = Pick<ToolDefinition, "name"> & {
	execute: (
		toolCallId: string,
		params: { command: string },
		signal: AbortSignal | undefined,
		onUpdate: undefined,
		ctx: ExtensionContext,
	) => Promise<AgentToolResult<BrowserResultDetails>>;
};

type ExecCall = {
	command: string;
	args: string[];
	options: ExecOptions | undefined;
};

function execResult(result: Partial<ExecResult>): ExecResult {
	return {
		stdout: "",
		stderr: "",
		code: 0,
		killed: false,
		...result,
	};
}

function createHarness(results: ExecResult[]) {
	const calls: ExecCall[] = [];
	let registeredTool: BrowserExecuteTool | undefined;

	const pi = {
		async exec(command: string, args: string[], options?: ExecOptions) {
			calls.push({ command, args, options });
			const next = results.shift();
			if (!next) {
				throw new Error(`Unexpected exec call: ${command}`);
			}
			return next;
		},
		registerTool(tool: ToolDefinition) {
			registeredTool = tool as BrowserExecuteTool;
		},
		on() {},
	};

	devBrowserExtension(pi as unknown as ExtensionAPI);
	if (!registeredTool) {
		throw new Error("browser tool was not registered");
	}

	return { calls, tool: registeredTool };
}

const nonUiContext = {
	hasUI: false,
} as ExtensionContext;

describe("dev-browser extension failure semantics", () => {
	it("throws when dev-browser is missing in a non-UI session", async () => {
		const { tool } = createHarness([execResult({ code: 1 })]);

		await expect(
			tool.execute(
				"call-1",
				{ command: "snapshot -i" },
				undefined,
				undefined,
				nonUiContext,
			),
		).rejects.toThrow("dev-browser is not installed");
	});

	it("returns non-zero browser command failures as recoverable content", async () => {
		const { tool } = createHarness([
			execResult({ stdout: "/usr/local/bin/dev-browser\n" }),
			execResult({ code: 1, stderr: "locator not found\n" }),
		]);

		const result = await tool.execute(
			"call-1",
			{ command: "click @e1" },
			undefined,
			undefined,
			nonUiContext,
		);

		expect(result.content).toEqual([
			{ type: "text", text: "locator not found" },
		]);
		expect(result.details).toMatchObject({
			action: "click",
			command: "click @e1",
			error: "locator not found",
			exitCode: 1,
			mode: "headless",
		});
		expect("isError" in result).toBe(false);
	});

	it("throws when browser command execution is killed", async () => {
		const { tool } = createHarness([
			execResult({ stdout: "/usr/local/bin/dev-browser\n" }),
			execResult({ code: 1, killed: true }),
		]);

		await expect(
			tool.execute(
				"call-1",
				{ command: "click @e1" },
				undefined,
				undefined,
				nonUiContext,
			),
		).rejects.toThrow("dev-browser command timed out or was killed");
	});

	it("throws before shell execution when already aborted", async () => {
		const { calls, tool } = createHarness([]);
		const controller = new AbortController();
		controller.abort(new Error("stopped"));

		await expect(
			tool.execute(
				"call-1",
				{ command: "snapshot -i" },
				controller.signal,
				undefined,
				nonUiContext,
			),
		).rejects.toThrow("stopped");
		expect(calls).toEqual([]);
	});
});
