![Dev Browser](docs/pi-dev-browser.png)
# pi-dev-browser

Pi package. Adds `browser` tool backed by [`dev-browser`](https://github.com/SawyerHood/dev-browser) for page navigation, AI snapshots, interaction, screenshots, and session-scoped browser state.

Repo root = package root. Important because Pi installs GitHub packages by cloning repo and reading root `package.json`.

## Install

From GitHub:

```bash
pi install git:github.com/magimetal/pi-dev-browser
# or
pi install https://github.com/magimetal/pi-dev-browser
```

Project-local install:

```bash
pi install -l git:github.com/magimetal/pi-dev-browser
```

From local checkout:

```bash
pi install /absolute/path/to/pi-dev-browser
# or project-local
pi install -l /absolute/path/to/pi-dev-browser
```

## Prerequisites

Install Pi 0.77.0 and Node.js `>=22.19.0` first. Package also requires `dev-browser` CLI and browser runtime before first use.

```bash
npm install -g dev-browser
dev-browser install
```

What this does:

- installs `dev-browser` CLI globally
- installs browser runtime used by managed `headless` and `headed` modes

If `dev-browser` is missing during an interactive Pi session, the extension can offer global install automatically. Non-UI runs must satisfy the prerequisite manually. Missing CLI/install infrastructure failures throw tool execution errors; browser command failures from `dev-browser` are returned as recoverable content with error details so the agent can inspect and continue.

## Tool workflow

Typical flow:

1. `open <url>`
2. `snapshot -i`
3. interact with `@e...` refs via `click`, `fill`, `type`, or `select`
4. `snapshot -i` again after page changes
5. `screenshot [--full]`
6. `close`

Example tool calls:

```text
browser({ command: "open https://example.com" })
browser({ command: "snapshot -i" })
browser({ command: "click @e12" })
browser({ command: "screenshot --full" })
```

## Supported commands

- `open <url>`
- `snapshot [-i]`
- `click <@ref>`
- `fill <@ref> <text>`
- `type <@ref> <text>`
- `select <@ref> <value>`
- `press <key>`
- `scroll <up|down|left|right> [px]`
- `get text|url|title [@ref]`
- `wait <@ref|ms>`
- `screenshot [--full]`
- `close`

Detailed grammar: [`docs/commands.md`](./docs/commands.md)

## Transport parameters

Tool supports `dev-browser` transport selection:

- `mode: "headless"` — default managed Chromium
- `mode: "headed"` — visible managed Chromium
- `mode: "connect"` — attach to existing Chrome/CDP browser
- `connectUrl` — optional CDP endpoint when `mode: "connect"`
- `ignoreHttpsErrors` — managed mode helper for localhost or self-signed certs

Example:

```text
browser({ command: "open https://localhost:3000", mode: "headed", ignoreHttpsErrors: true })
browser({ command: "snapshot -i", mode: "connect", connectUrl: "http://localhost:9222" })
```

## Troubleshooting

### `dev-browser` not found

Cause: CLI missing from `PATH`.

Fix:

```bash
npm install -g dev-browser
```

Restart shell or Pi after install if command still missing.

### Browser runtime missing

Cause: `dev-browser install` not run yet.

Fix:

```bash
dev-browser install
```

### `connectUrl requires mode "connect"`

Cause: `connectUrl` passed without `mode: "connect"`.

Fix: move CDP endpoint into call with `mode: "connect"`.

### `ignoreHttpsErrors cannot be used with mode "connect"`

Cause: HTTPS ignore flag only works for managed `headless` and `headed` launches.

Fix: remove `ignoreHttpsErrors` or switch away from `connect` mode.

## Develop

Install deps:

```bash
npm install
```

Run quality gates:

```bash
npm run lint
npm run typecheck
npm test
npm run check
npm pack --dry-run
```

## Verification shape

Local installability proof should use isolated temp `HOME` and project-local install target so existing global Pi settings cannot false-pass discovery.

Verification commands used for this package:

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run check
npm pack --dry-run
HOME="$TMP_HOME" pi install -l /absolute/path/to/pi-dev-browser
HOME="$TMP_HOME" pi list
HOME="$TMP_HOME" pi config
```

## Repo layout

```text
.
├── extensions/
│   ├── dev-browser.ts
│   ├── dev-browser-core.ts
│   └── dev-browser-runtime.ts
├── tests/
│   └── dev-browser-core.test.ts
├── docs/
│   └── commands.md
├── package.json
├── CHANGELOG.md
├── LICENSE
└── README.md
```
