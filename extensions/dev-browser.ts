import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { extname } from "node:path";
import type {
	AgentToolResult,
	ExtensionAPI,
	ExtensionContext,
	Theme,
	ToolRenderResultOptions,
} from "@mariozechner/pi-coding-agent";
import {
	DEFAULT_MAX_BYTES,
	DEFAULT_MAX_LINES,
	formatSize,
	truncateHead,
} from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { Type } from "typebox";
import {
	type BrowserMode,
	buildCommand,
	buildDevBrowserArgs,
	DEFAULT_MODE,
	DEFAULT_TIMEOUT_MS,
	extractScreenshotPath,
	parseCommand,
	removeTempFile,
	resolveTransport,
	TOOL_DESCRIPTION,
	type Transport,
	transformSnapshotOutput,
	writeTempFile,
} from "./dev-browser-core";
import {
	createSerialExecutor,
	createSessionRuntimeState,
	recordSuccessfulAction,
} from "./dev-browser-runtime";

type BrowserToolParams = {
	command: string;
	mode?: BrowserMode;
	connectUrl?: string;
	ignoreHttpsErrors?: boolean;
};

type BrowserResultDetails = {
	action?: string;
	command?: string;
	error?: string;
	exitCode?: number;
	mode?: BrowserMode;
	truncated?: boolean;
	screenshotPath?: string;
	readError?: string;
};

type BrowserToolResult = AgentToolResult<BrowserResultDetails> & {
	isError?: boolean;
};

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}

	return String(error);
}

function throwIfAborted(signal?: AbortSignal): void {
	if (!signal) {
		return;
	}

	if (typeof signal.throwIfAborted === "function") {
		signal.throwIfAborted();
		return;
	}

	if (signal.aborted) {
		throw new Error("Operation aborted");
	}
}

function createErrorResult(
	text: string,
	details: BrowserResultDetails,
): BrowserToolResult {
	return {
		content: [{ type: "text", text }],
		details,
		isError: true,
	};
}

function getResultText(result: BrowserToolResult): string {
	const first = result.content[0];
	return first?.type === "text" ? first.text : "";
}

async function ensureInstalled(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
): Promise<boolean> {
	const check = await pi.exec("which", ["dev-browser"], { timeout: 5_000 });
	if (check.code === 0 && check.stdout.trim()) {
		return true;
	}

	if (!ctx.hasUI) {
		return false;
	}

	const ok = await ctx.ui.confirm(
		"dev-browser not found",
		"Install dev-browser globally with npm? (npm install -g dev-browser && dev-browser install)",
	);
	if (!ok) {
		return false;
	}

	ctx.ui.notify("Installing dev-browser...", "info");
	const install = await pi.exec("npm", ["install", "-g", "dev-browser"], {
		timeout: 120_000,
	});
	if (install.code !== 0) {
		ctx.ui.notify(
			`Installation failed: ${install.stderr || install.stdout}`,
			"error",
		);
		return false;
	}

	ctx.ui.notify("Installing Playwright Chromium for dev-browser...", "info");
	const runtime = await pi.exec("dev-browser", ["install"], {
		timeout: 120_000,
	});
	if (runtime.code !== 0) {
		ctx.ui.notify(
			`Browser runtime install failed: ${runtime.stderr || runtime.stdout}`,
			"error",
		);
		return false;
	}

	ctx.ui.notify("dev-browser installed successfully!", "info");
	return true;
}

async function closeOwnedPage(
	pi: ExtensionAPI,
	browserName: string,
	transport: Transport,
): Promise<void> {
	const built = buildCommand(parseCommand("close"), browserName);
	const scriptPath = writeTempFile(built.script, "cleanup", "js");

	try {
		await pi.exec(
			"dev-browser",
			buildDevBrowserArgs(transport, browserName, scriptPath),
			{
				timeout: 15_000,
			},
		);
	} finally {
		removeTempFile(scriptPath);
	}
}

export default function devBrowserExtension(pi: ExtensionAPI) {
	const browserName = `pi-dev-browser-${randomUUID().slice(0, 8)}`;
	const runtimeState = createSessionRuntimeState();
	const executor = createSerialExecutor();
	let cleanupTransport: Transport = { mode: DEFAULT_MODE };

	pi.registerTool({
		name: "browser",
		label: "Browser",
		description: TOOL_DESCRIPTION,
		parameters: Type.Object({
			command: Type.String({
				description: "Browser command, eg: open https://example.com",
			}),
			mode: Type.Optional(
				Type.Union(
					[
						Type.Literal("headless"),
						Type.Literal("headed"),
						Type.Literal("connect"),
					],
					{
						description:
							"Transport mode. Default: headless. Use connect only for existing Chrome state.",
					},
				),
			),
			connectUrl: Type.Optional(
				Type.String({
					description:
						"Optional CDP endpoint for connect mode, eg: http://localhost:9222",
				}),
			),
			ignoreHttpsErrors: Type.Optional(
				Type.Boolean({
					description: "Ignore HTTPS certificate errors for managed browsers",
				}),
			),
		}),

		renderCall(args: { command: string; mode?: BrowserMode }, theme: Theme) {
			const modeSuffix = args.mode
				? theme.fg("warning", ` [${args.mode}]`)
				: "";
			const text =
				theme.fg("toolTitle", theme.bold("browser ")) +
				theme.fg("accent", args.command) +
				modeSuffix;
			return new Text(text, 0, 0);
		},

		renderResult(
			result: BrowserToolResult,
			{ expanded, isPartial }: ToolRenderResultOptions,
			theme: Theme,
		) {
			if (isPartial) {
				return new Text(theme.fg("warning", "Running..."), 0, 0);
			}

			const details = result.details;
			if (result.isError || details.error) {
				const errorText = details.error || getResultText(result) || "Error";
				return new Text(theme.fg("error", errorText), 0, 0);
			}

			const action = details.action || "";
			const content = getResultText(result);

			if (action === "screenshot") {
				return new Text(
					theme.fg(
						"success",
						`Screenshot saved: ${details.screenshotPath || "unknown"}`,
					),
					0,
					0,
				);
			}

			if (action === "snapshot") {
				const refCount = (content.match(/@e\d+/g) || []).length;
				let text = theme.fg("success", `${refCount} interactive refs`);
				if (details.truncated) {
					text += theme.fg("warning", " (truncated)");
				}
				if (expanded) {
					text += `\n${theme.fg("dim", content)}`;
				}
				return new Text(text, 0, 0);
			}

			if (expanded) {
				return new Text(theme.fg("dim", content), 0, 0);
			}

			const firstLine = content.split("\n")[0] || "(no output)";
			const truncated = content.includes("\n") ? "…" : "";
			return new Text(theme.fg("dim", firstLine + truncated), 0, 0);
		},

		async execute(
			_toolCallId: string,
			rawParams: BrowserToolParams,
			signal: AbortSignal | undefined,
			_onUpdate: unknown,
			ctx: ExtensionContext,
		) {
			const params = rawParams;
			return executor.run(async () => {
				try {
					throwIfAborted(signal);

					const installed = await ensureInstalled(pi, ctx);
					if (!installed) {
						return createErrorResult(
							"dev-browser is not installed. Install manually with: npm install -g dev-browser && dev-browser install",
							{ error: "not-installed" },
						);
					}

					throwIfAborted(signal);

					const parsed = parseCommand(params.command.trim());
					const transport = resolveTransport(params);
					const built = buildCommand(parsed, browserName);
					const scriptPath = writeTempFile(built.script, built.action, "js");

					try {
						const result = await pi.exec(
							"dev-browser",
							buildDevBrowserArgs(transport, browserName, scriptPath),
							{
								signal,
								timeout: DEFAULT_TIMEOUT_MS,
							},
						);

						if (result.code !== 0) {
							const errorOutput = (result.stderr || result.stdout).trim();
							return createErrorResult(
								errorOutput || `Command failed with exit code ${result.code}`,
								{
									action: built.action,
									command: params.command,
									error: errorOutput,
									exitCode: result.code,
									mode: transport.mode,
								},
							);
						}

						cleanupTransport = transport;
						recordSuccessfulAction(runtimeState, built.action);

						let output = result.stdout.trim();
						if (built.action === "snapshot") {
							output = transformSnapshotOutput(output);
						}

						if (built.action === "screenshot") {
							const screenshotPath = extractScreenshotPath(output);
							if (screenshotPath) {
								try {
									const imageData = readFileSync(screenshotPath);
									const base64 = imageData.toString("base64");
									const ext = extname(screenshotPath).toLowerCase();
									const mimeType =
										ext === ".jpg" || ext === ".jpeg"
											? "image/jpeg"
											: ext === ".webp"
												? "image/webp"
												: "image/png";
									return {
										content: [
											{
												type: "text",
												text: `Screenshot saved: ${screenshotPath}`,
											},
											{ type: "image", data: base64, mimeType },
										],
										details: {
											action: built.action,
											command: params.command,
											mode: transport.mode,
											screenshotPath,
										},
									};
								} catch (error: unknown) {
									const readError = getErrorMessage(error);
									return {
										content: [
											{
												type: "text",
												text: `Screenshot saved to ${screenshotPath} but could not read file: ${readError}`,
											},
										],
										details: {
											action: built.action,
											command: params.command,
											mode: transport.mode,
											screenshotPath,
											readError,
										},
									};
								}
							}
						}

						const truncation = truncateHead(output, {
							maxLines: DEFAULT_MAX_LINES,
							maxBytes: DEFAULT_MAX_BYTES,
						});

						let resultText = truncation.content;
						if (truncation.truncated) {
							const tempFile = writeTempFile(output, built.action);
							resultText += `\n\n[Output truncated: ${truncation.outputLines} of ${truncation.totalLines} lines (${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)}). Full output saved to: ${tempFile}]`;
						}

						return {
							content: [{ type: "text", text: resultText || "(no output)" }],
							details: {
								action: built.action,
								command: params.command,
								mode: transport.mode,
								truncated: truncation.truncated,
							},
						};
					} finally {
						removeTempFile(scriptPath);
					}
				} catch (error: unknown) {
					const message = getErrorMessage(error);
					return createErrorResult(message, {
						error: message,
						command: params.command,
					});
				}
			});
		},
	});

	pi.on("session_shutdown", async () => {
		await executor.drain();
		if (!runtimeState.usedBrowser || !runtimeState.pageOpen) {
			return;
		}

		try {
			await closeOwnedPage(pi, browserName, cleanupTransport);
			runtimeState.pageOpen = false;
			// dev-browser stop is global and would kill unrelated browser instances.
			// Never auto-stop daemon from session cleanup.
		} catch {
			// Ignore cleanup failures during shutdown.
		}
	});
}
