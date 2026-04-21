import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export type BrowserMode = "headless" | "headed" | "connect";

export type Transport = {
	mode: BrowserMode;
	connectUrl?: string;
	ignoreHttpsErrors?: boolean;
};

export type TransportParams = {
	mode?: BrowserMode;
	connectUrl?: string;
	ignoreHttpsErrors?: boolean;
};

export type ParsedCommand = {
	action: string;
	args: string[];
};

export type BuiltCommand = {
	action: string;
	script: string;
};

export const DEFAULT_MODE: BrowserMode = "headless";
export const DEFAULT_TIMEOUT_MS = 60_000;
export const PAGE_NAME = "main";

export const TOOL_DESCRIPTION = `Browser automation via dev-browser CLI.
Default: headless managed Chromium.
Workflow: open URL → snapshot -i (get @refs like @e1) → interact → re-snapshot after page changes.
Supported commands:
  open <url> - Navigate to URL
  snapshot [-i] - AI snapshot with @refs
  click <@ref> - Click element by @ref
  fill <@ref> <text> - Clear and fill text
  type <@ref> <text> - Type without clearing
  select <@ref> <value> - Select option
  press <key> - Press key on page keyboard
  scroll <dir> [px] - Scroll viewport
  get text|url|title [@ref] - Get information
  wait <@ref|ms> - Wait for ref or time
  screenshot [--full] - Take screenshot (image returned inline)
  close - Close named browser page
Extra params:
  mode=headless|headed|connect
  connectUrl=<cdp-endpoint> for connect mode
  ignoreHttpsErrors=true for managed browsers`;

export function writeTempFile(
	content: string,
	prefix: string,
	extension = "txt",
): string {
	const dir = mkdtempSync(join(tmpdir(), `pi-dev-browser-${prefix}-`));
	const file = join(dir, `output.${extension}`);
	writeFileSync(file, content);
	return file;
}

export function removeTempFile(filePath: string): void {
	try {
		rmSync(dirname(filePath), { recursive: true, force: true });
	} catch {
		// Ignore temp cleanup failures.
	}
}

export function tokenizeCommand(input: string): string[] {
	const tokens: string[] = [];
	let current = "";
	let quote: '"' | "'" | null = null;
	let escaped = false;

	for (const char of input.trim()) {
		if (escaped) {
			current += char;
			escaped = false;
			continue;
		}

		if (char === "\\" && quote !== "'") {
			escaped = true;
			continue;
		}

		if (quote) {
			if (char === quote) {
				quote = null;
			} else {
				current += char;
			}
			continue;
		}

		if (char === '"' || char === "'") {
			quote = char;
			continue;
		}

		if (/\s/.test(char)) {
			if (current.length > 0) {
				tokens.push(current);
				current = "";
			}
			continue;
		}

		current += char;
	}

	if (escaped) {
		current += "\\";
	}

	if (current.length > 0) {
		tokens.push(current);
	}

	return tokens;
}

export function parseCommand(command: string): ParsedCommand {
	const tokens = tokenizeCommand(command);
	if (tokens.length === 0) {
		throw new Error("Browser command cannot be empty");
	}

	const [action, ...args] = tokens;
	return {
		action: action.toLowerCase(),
		args,
	};
}

function toRef(token?: string): string {
	if (!token) {
		throw new Error("Missing @ref argument");
	}

	const normalized = token.startsWith("@") ? token.slice(1) : token;
	if (!/^e\d+$/i.test(normalized)) {
		throw new Error(`Invalid ref: ${token}`);
	}

	return normalized.toLowerCase();
}

function firstArg(args: string[], help: string): string {
	const value = args[0];
	if (!value) {
		throw new Error(help);
	}
	return value;
}

function expectArgCount(args: string[], counts: number[], usage: string): void {
	if (!counts.includes(args.length)) {
		throw new Error(usage);
	}
}

function expectNoExtraArgs(args: string[], usage: string): void {
	if (args.length > 0) {
		throw new Error(usage);
	}
}

function getLocatorScript(ref: string): string {
	return `page.locator(${JSON.stringify(`aria-ref=${ref}`)})`;
}

export function buildCommand(
	parsed: ParsedCommand,
	browserName: string,
): BuiltCommand {
	const { action, args } = parsed;

	switch (action) {
		case "open": {
			expectArgCount(args, [1], "Usage: open <url>");
			const url = firstArg(args, "Usage: open <url>");
			return {
				action,
				script: `
const page = await browser.getPage(${JSON.stringify(PAGE_NAME)});
await page.goto(${JSON.stringify(url)}, { waitUntil: "domcontentloaded" });
console.log(JSON.stringify({
  url: page.url(),
  title: await page.title(),
}, null, 2));
`.trim(),
			};
		}
		case "snapshot": {
			expectArgCount(args, [0, 1], "Usage: snapshot [-i]");
			if (args[0] && args[0] !== "-i") {
				throw new Error("Usage: snapshot [-i]");
			}
			return {
				action,
				script: `
const page = await browser.getPage(${JSON.stringify(PAGE_NAME)});
const snapshot = await page.snapshotForAI({ track: ${JSON.stringify(PAGE_NAME)} });
console.log(snapshot.full);
`.trim(),
			};
		}
		case "click": {
			expectArgCount(args, [1], "Usage: click <@ref>");
			const ref = toRef(args[0]);
			return {
				action,
				script: `
const page = await browser.getPage(${JSON.stringify(PAGE_NAME)});
await ${getLocatorScript(ref)}.click();
await page.waitForTimeout(250);
console.log(${JSON.stringify(`Clicked @${ref}`)});
`.trim(),
			};
		}
		case "fill": {
			if (args.length < 2) {
				throw new Error("Usage: fill <@ref> <text>");
			}
			const ref = toRef(args[0]);
			const text = args.slice(1).join(" ");
			return {
				action,
				script: `
const page = await browser.getPage(${JSON.stringify(PAGE_NAME)});
await ${getLocatorScript(ref)}.fill(${JSON.stringify(text)});
await page.waitForTimeout(150);
console.log(${JSON.stringify(`Filled @${ref}`)});
`.trim(),
			};
		}
		case "type": {
			if (args.length < 2) {
				throw new Error("Usage: type <@ref> <text>");
			}
			const ref = toRef(args[0]);
			const text = args.slice(1).join(" ");
			return {
				action,
				script: `
const page = await browser.getPage(${JSON.stringify(PAGE_NAME)});
await ${getLocatorScript(ref)}.type(${JSON.stringify(text)});
await page.waitForTimeout(150);
console.log(${JSON.stringify(`Typed into @${ref}`)});
`.trim(),
			};
		}
		case "select": {
			if (args.length < 2) {
				throw new Error("Usage: select <@ref> <value>");
			}
			const ref = toRef(args[0]);
			const value = args.slice(1).join(" ");
			return {
				action,
				script: `
const page = await browser.getPage(${JSON.stringify(PAGE_NAME)});
const locator = ${getLocatorScript(ref)};
let selected = false;
try {
  await locator.selectOption({ label: ${JSON.stringify(value)} });
  selected = true;
} catch {
  // Try value fallback below.
}
if (!selected) {
  await locator.selectOption(${JSON.stringify(value)});
}
await page.waitForTimeout(150);
console.log(${JSON.stringify(`Selected ${value} on @${ref}`)});
`.trim(),
			};
		}
		case "press": {
			expectArgCount(args, [1], "Usage: press <key>");
			const key = firstArg(args, "Usage: press <key>");
			return {
				action,
				script: `
const page = await browser.getPage(${JSON.stringify(PAGE_NAME)});
await page.keyboard.press(${JSON.stringify(key)});
await page.waitForTimeout(150);
console.log(${JSON.stringify(`Pressed ${key}`)});
`.trim(),
			};
		}
		case "scroll": {
			expectArgCount(args, [1, 2], "Usage: scroll <up|down|left|right> [px]");
			const direction = firstArg(
				args,
				"Usage: scroll <up|down|left|right> [px]",
			).toLowerCase();
			const pixels = args[1] ? Number.parseInt(args[1], 10) : 500;
			if (!Number.isFinite(pixels) || pixels <= 0) {
				throw new Error("Scroll pixels must be a positive integer");
			}
			if (!["up", "down", "left", "right"].includes(direction)) {
				throw new Error("Scroll direction must be up, down, left, or right");
			}

			return {
				action,
				script: `
const page = await browser.getPage(${JSON.stringify(PAGE_NAME)});
const position = await page.evaluate(({ direction, pixels }) => {
  let x = 0;
  let y = 0;

  if (direction === "down") y = pixels;
  if (direction === "up") y = -pixels;
  if (direction === "right") x = pixels;
  if (direction === "left") x = -pixels;

  window.scrollBy(x, y);
  return { x: window.scrollX, y: window.scrollY };
}, { direction: ${JSON.stringify(direction)}, pixels: ${pixels} });
console.log(JSON.stringify(position, null, 2));
`.trim(),
			};
		}
		case "get": {
			if (args.length === 0 || args.length > 2) {
				throw new Error("Usage: get text|url|title [@ref]");
			}

			const field = firstArg(
				args,
				"Usage: get text|url|title [@ref]",
			).toLowerCase();
			if (field === "url") {
				if (args.length !== 1) {
					throw new Error("Usage: get url");
				}
				return {
					action,
					script: `
const page = await browser.getPage(${JSON.stringify(PAGE_NAME)});
console.log(page.url());
`.trim(),
				};
			}

			if (field === "title") {
				if (args.length !== 1) {
					throw new Error("Usage: get title");
				}
				return {
					action,
					script: `
const page = await browser.getPage(${JSON.stringify(PAGE_NAME)});
console.log(await page.title());
`.trim(),
				};
			}

			if (field === "text") {
				const refArg = args[1];
				if (refArg) {
					const ref = toRef(refArg);
					return {
						action,
						script: `
const page = await browser.getPage(${JSON.stringify(PAGE_NAME)});
const text = await ${getLocatorScript(ref)}.innerText();
console.log(text ?? "");
`.trim(),
					};
				}

				return {
					action,
					script: `
const page = await browser.getPage(${JSON.stringify(PAGE_NAME)});
console.log(await page.locator("body").innerText());
`.trim(),
				};
			}

			throw new Error("Usage: get text|url|title [@ref]");
		}
		case "wait": {
			expectArgCount(args, [1], "Usage: wait <@ref|ms>");
			const value = firstArg(args, "Usage: wait <@ref|ms>");
			if (/^\d+$/.test(value)) {
				const ms = Number.parseInt(value, 10);
				return {
					action,
					script: `
const page = await browser.getPage(${JSON.stringify(PAGE_NAME)});
await page.waitForTimeout(${ms});
console.log(${JSON.stringify(`Waited ${ms}ms`)});
`.trim(),
				};
			}

			const ref = toRef(value);
			return {
				action,
				script: `
const page = await browser.getPage(${JSON.stringify(PAGE_NAME)});
await ${getLocatorScript(ref)}.waitFor({ state: "visible" });
console.log(${JSON.stringify(`Waited for @${ref}`)});
`.trim(),
			};
		}
		case "screenshot": {
			expectArgCount(args, [0, 1], "Usage: screenshot [--full]");
			if (args[0] && args[0] !== "--full") {
				throw new Error("Usage: screenshot [--full]");
			}
			const fullPage = args[0] === "--full";
			const fileName = `${browserName}-${Date.now()}.png`;
			return {
				action,
				script: `
const page = await browser.getPage(${JSON.stringify(PAGE_NAME)});
const buffer = await page.screenshot({ fullPage: ${fullPage ? "true" : "false"} });
const path = await saveScreenshot(buffer, ${JSON.stringify(fileName)});
console.log(path);
`.trim(),
			};
		}
		case "close": {
			expectNoExtraArgs(args, "Usage: close");
			return {
				action,
				script: `
const pages = await browser.listPages();
const main = pages.find((entry) => entry.name === ${JSON.stringify(PAGE_NAME)});
if (main) {
  await browser.closePage(${JSON.stringify(PAGE_NAME)});
}
console.log(${JSON.stringify("Closed browser page")});
`.trim(),
			};
		}
		default:
			throw new Error(`Unsupported browser command: ${action}`);
	}
}

export function resolveTransport(params: TransportParams): Transport {
	if (params.connectUrl && params.mode !== "connect") {
		throw new Error('connectUrl requires mode "connect"');
	}

	if (params.mode === "connect") {
		if (params.ignoreHttpsErrors !== undefined) {
			throw new Error('ignoreHttpsErrors cannot be used with mode "connect"');
		}
		return {
			mode: "connect",
			connectUrl: params.connectUrl?.trim() || undefined,
		};
	}

	return {
		mode: params.mode ?? DEFAULT_MODE,
		ignoreHttpsErrors: params.ignoreHttpsErrors,
	};
}

export function buildDevBrowserArgs(
	transport: Transport,
	browserName: string,
	scriptPath: string,
): string[] {
	const args = [
		"--browser",
		browserName,
		"--timeout",
		String(Math.ceil(DEFAULT_TIMEOUT_MS / 1000)),
	];

	if (transport.mode === "headless") {
		args.push("--headless");
	}

	if (transport.mode === "connect") {
		args.push("--connect");
		if (transport.connectUrl?.trim()) {
			args.push(transport.connectUrl.trim());
		}
	} else if (transport.ignoreHttpsErrors) {
		args.push("--ignore-https-errors");
	}

	args.push("run", scriptPath);
	return args;
}

export function transformSnapshotOutput(output: string): string {
	return output.replace(/\[ref=(e\d+)\]/gi, "@$1");
}

export function extractScreenshotPath(output: string): string | undefined {
	const lines = output
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);

	for (let index = lines.length - 1; index >= 0; index -= 1) {
		const line = lines[index];
		if (/\.(png|jpe?g|webp)$/i.test(line)) {
			return line;
		}
	}

	return undefined;
}
