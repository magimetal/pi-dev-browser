# browser command reference

All commands go through tool parameter `command`.

Command failures reported by `dev-browser` are returned as recoverable tool content with error details. Missing CLI prerequisites, aborts, and execution infrastructure failures throw tool execution errors.

## Navigation

### `open <url>`

Navigate named session page to URL.

## Inspection

### `snapshot [-i]`

Returns AI snapshot from dev-browser `page.snapshotForAI()`.
Refs like `[ref=e12]` get rewritten to `@e12`.
Only documented `snapshot` and `snapshot -i` forms are accepted.

### `get title`
### `get url`
### `get text [@ref]`

Read page metadata or text.

## Interaction

### `click <@ref>`
Clicks locator `aria-ref=<ref>`.

### `fill <@ref> <text>`
Clears field, then fills text.

### `type <@ref> <text>`
Types without clearing.

### `select <@ref> <value>`
Tries visible label first, then raw option value.

### `press <key>`
Uses Playwright keyboard press.

### `scroll <direction> [px]`
Scrolls viewport. Default distance `500`.

## Waiting

### `wait <@ref|ms>`
Waits for visible ref or fixed milliseconds.

## Visual

### `screenshot [--full]`
Creates screenshot via dev-browser `saveScreenshot(await page.screenshot(...))`.
Extension reads saved image, returns inline image block to pi.
Unknown screenshot flags are rejected.

## Cleanup

### `close`
Closes named page `main` for current session-owned browser.
Does not auto-stop global dev-browser daemon.

## Transport parameters

Tool parameters besides `command`:

- `mode: "headless" | "headed" | "connect"`
- `connectUrl?: string` — valid only with `mode: "connect"`
- `ignoreHttpsErrors?: boolean` — valid only for managed `headless`/`headed` modes

Calls without `mode` always use default `headless` transport.
`connect` should be used only when existing browser state matters.
