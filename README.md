# dsh-chrome-pilot

A real Chrome for DSH agents.

English | [中文](README.zh-CN.md)

It drives Chrome over CDP, so clicks, typing, wheel and drags are native browser events (`isTrusted === true`), not DOM events synthesized by an extension. The browser runs as its own process with its own profile, so whatever you log into stays logged in.

## Install

You need [agent-browser](https://github.com/vercel-labs/agent-browser) first:

```sh
npm i -g agent-browser
```

Then the plugin:

```sh
dsh plugin --profile desktop add dsh-chrome-pilot
```

Restart DSH. The first `chrome_open` starts a blank Chrome; the profile defaults to `~/.dsh/chrome-pilot/profile`. Log in there once. Closing the window, restarting DSH, or coming back tomorrow keeps the session.

## Tools

| Tool | What it does |
|---|---|
| `chrome_open` | Start the browser, open a URL, return an interactive snapshot with `@e1` refs |
| `chrome_snapshot` | Re-read the snapshot and refresh refs (do this before clicking) |
| `chrome_click` | Click; right/middle button, modifier keys, `human` pointer path |
| `chrome_fill` / `chrome_type` | Fill / type character by character, with an optional per-key delay |
| `chrome_press` | A key or a chord |
| `chrome_mouse` / `chrome_wheel` | Move the pointer to coordinates, pixel-level wheel |
| `chrome_scroll` | Scroll the page or an element in a direction |
| `chrome_screenshot` | Save a screenshot, return the path |
| `chrome_eval` | Run JavaScript in the page |
| `chrome_tabs` | List / open / switch / close tabs |
| `chrome_sync_profile` | Copy logins from your daily Chrome (quit it first) |
| `chrome_close` | Close the browser; the next call starts it again |

The `chrome_` prefix keeps these from colliding with other plugins that claim `browser_*`.

## Settings

The plugin page (Plugins → dsh-chrome-pilot) has a config panel: profile directory, Chrome path, screenshot directory, timeout, session name, and a "show the browser window" switch. Saving writes to the profile's `cordis.patch.yml` and applies on the next tool call, no restart.

You can also edit the YAML:

```yaml
- id: chrome-pilot
  config:
    headed: false
    timeoutMs: 60000
```

| Field | Default | Meaning |
|---|---|---|
| `profileDir` | `~/.dsh/chrome-pilot/profile` | Logins live here |
| `executablePath` | auto-detect | Which `chrome.exe` opens the profile |
| `screenshotDir` | `<profileDir>/../screenshots` | Where screenshots go |
| `timeoutMs` | `120000` | Timeout for one command |
| `headed` | `true` | Turn off for headless |
| `session` | `dsh-pilot` | Session name; different names stay isolated |
| `profileSync` | `false` | Copy logins from daily Chrome, YAML only |
| `syncIndexedDb` | `false` | Include IndexedDB in that copy, YAML only |
| `sourceUserData` | auto-detect | Where to copy from, YAML only |
| `binary` | auto-detect | Path to agent-browser, YAML only |

## How it works

The plugin registers the `chrome_*` tools. On each call it runs one agent-browser command with `--profile` and `--session`; the command hands work to a resident daemon over a local socket, and the daemon drives Chrome over CDP. The browser therefore stays open, and a call costs roughly 150–300 ms.

```
DSH  ──chrome_* tools──►  agent-browser CLI  ──socket──►  daemon  ──CDP──►  Chrome
```

A snapshot comes from the CDP accessibility tree, and each interactive node gets an `@eN` ref. A click resolves that ref to the node's box centre and dispatches mouse events there. `human` mode splits one movement into several `mouseMoved` events along a curved, eased path.

## Things to know

Chrome holds an exclusive lock on `Default\Network\Cookies` while it runs, so cookies cannot be copied out of a running browser — the copy just fails.

Since Chrome 127, App-Bound encryption ties the cookie key to the path of `chrome.exe`. Opening the same profile with Chrome for Testing cannot decrypt those cookies, reports no error, and simply drops them. That is why the plugin opens the profile with your own Chrome, and why the default flow is to log in once inside the controlled window rather than copy.

One `session` name means one set of tabs. Two DSH sessions sharing a name will fight over focus, so give parallel sessions different names.

## Limits

- Only tested on Windows. The macOS and Linux path detection is written but unverified.
- No OCR, no CAPTCHA solving, no anti-detection. Logins that need a human still need you.
- Not every agent-browser capability is exposed: `pdf`, `record`, `trace`, `har` aren't tools yet.
