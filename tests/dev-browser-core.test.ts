import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	buildCommand,
	buildDevBrowserArgs,
	extractScreenshotPath,
	parseCommand,
	removeTempFile,
	resolveTransport,
	transformSnapshotOutput,
	writeTempFile,
} from "../extensions/dev-browser-core";
import {
	createSerialExecutor,
	createSessionRuntimeState,
	recordSuccessfulAction,
} from "../extensions/dev-browser-runtime";

describe("resolveTransport", () => {
	it("defaults to headless on mode-less calls", () => {
		expect(resolveTransport({})).toEqual({ mode: "headless" });
		expect(resolveTransport({ ignoreHttpsErrors: true })).toEqual({
			mode: "headless",
			ignoreHttpsErrors: true,
		});
	});

	it("rejects invalid transport parameter combinations", () => {
		expect(() =>
			resolveTransport({ connectUrl: "http://localhost:9222" }),
		).toThrow('connectUrl requires mode "connect"');
		expect(() =>
			resolveTransport({ mode: "connect", ignoreHttpsErrors: true }),
		).toThrow('ignoreHttpsErrors cannot be used with mode "connect"');
	});

	it("builds connect transport only when explicitly requested", () => {
		expect(
			resolveTransport({
				mode: "connect",
				connectUrl: " http://localhost:9222 ",
			}),
		).toEqual({
			mode: "connect",
			connectUrl: "http://localhost:9222",
		});
	});
});

describe("command grammar", () => {
	it("accepts documented snapshot syntax only", () => {
		expect(buildCommand(parseCommand("snapshot"), "browser").action).toBe(
			"snapshot",
		);
		expect(buildCommand(parseCommand("snapshot -i"), "browser").action).toBe(
			"snapshot",
		);
		expect(() => buildCommand(parseCommand("snapshot foo"), "browser")).toThrow(
			"Usage: snapshot [-i]",
		);
	});

	it("rejects malformed close and screenshot commands", () => {
		expect(() => buildCommand(parseCommand("close now"), "browser")).toThrow(
			"Usage: close",
		);
		expect(() =>
			buildCommand(parseCommand("screenshot --ful"), "browser"),
		).toThrow("Usage: screenshot [--full]");
	});

	it("rejects malformed get and scroll commands", () => {
		expect(() =>
			buildCommand(parseCommand("get title now"), "browser"),
		).toThrow("Usage: get title");
		expect(() =>
			buildCommand(parseCommand("scroll down 100 nope"), "browser"),
		).toThrow("Usage: scroll <up|down|left|right> [px]");
	});
});

describe("dev-browser args", () => {
	it("builds managed and connect invocations correctly", () => {
		expect(
			buildDevBrowserArgs(
				{ mode: "headless", ignoreHttpsErrors: true },
				"browser",
				"script.js",
			),
		).toEqual([
			"--browser",
			"browser",
			"--timeout",
			"60",
			"--headless",
			"--ignore-https-errors",
			"run",
			"script.js",
		]);

		expect(
			buildDevBrowserArgs(
				{ mode: "connect", connectUrl: "http://localhost:9222" },
				"browser",
				"script.js",
			),
		).toEqual([
			"--browser",
			"browser",
			"--timeout",
			"60",
			"--connect",
			"http://localhost:9222",
			"run",
			"script.js",
		]);
	});
});

describe("output helpers", () => {
	it("rewrites snapshot refs and finds screenshot path", () => {
		expect(transformSnapshotOutput("button [ref=e12]")).toBe("button @e12");
		expect(
			extractScreenshotPath("noise\n/Users/test/home.png\nmore noise"),
		).toBe("/Users/test/home.png");
	});
});

describe("temp file cleanup", () => {
	it("removes generated temp directory after use", () => {
		const filePath = writeTempFile("hello", "vitest", "txt");
		expect(existsSync(filePath)).toBe(true);
		removeTempFile(filePath);
		expect(existsSync(filePath)).toBe(false);
	});
});

describe("runtime state", () => {
	it("tracks page lifecycle", () => {
		const state = createSessionRuntimeState();
		recordSuccessfulAction(state, "snapshot");
		expect(state).toEqual({ pageOpen: true, usedBrowser: true });
		recordSuccessfulAction(state, "close");
		expect(state).toEqual({ pageOpen: false, usedBrowser: true });
	});

	it("serializes concurrent executions", async () => {
		const executor = createSerialExecutor();
		const order: string[] = [];
		let releaseFirst!: () => void;

		const first = executor.run(async () => {
			order.push("first:start");
			await new Promise<void>((resolve) => {
				releaseFirst = resolve;
			});
			order.push("first:end");
		});

		const second = executor.run(async () => {
			order.push("second:start");
			order.push("second:end");
		});

		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(order).toEqual(["first:start"]);

		releaseFirst();
		await Promise.all([first, second]);
		await executor.drain();
		expect(order).toEqual([
			"first:start",
			"first:end",
			"second:start",
			"second:end",
		]);
	});
});
