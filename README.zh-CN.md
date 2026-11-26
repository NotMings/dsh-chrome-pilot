# dsh-chrome-pilot

给 DSH 的 agent 一个真实的 Chrome。

[English](README.md) | 中文

它走 CDP，所以点击、输入、滚轮、拖拽都是浏览器原生事件（`isTrusted === true`），不是扩展合成出来的 DOM 事件。浏览器是独立进程、独立 profile，登录过的东西会一直留着。

## 安装

需要先有 [agent-browser](https://github.com/vercel-labs/agent-browser)：

```sh
npm i -g agent-browser
```

然后装插件：

```sh
dsh plugin --profile desktop add dsh-chrome-pilot
```

装完重启 DSH。第一次调 `chrome_open` 会开一个空白的 Chrome，profile 默认在 `~/.dsh/chrome-pilot/profile`。在里面登录一次，之后关窗口、重启 DSH、隔天再来都还是登录状态。

## 工具

| 工具 | 干什么 |
|---|---|
| `chrome_open` | 开浏览器、打开 URL，返回带 `@e1` 引用的可交互快照 |
| `chrome_snapshot` | 重新读快照，刷新引用（点击前先取一次） |
| `chrome_click` | 点击，支持右键、中键、修饰键、`human` 真人轨迹 |
| `chrome_fill` / `chrome_type` | 填写 / 逐字输入，可设每字延迟 |
| `chrome_press` | 按键和组合键 |
| `chrome_mouse` / `chrome_wheel` | 坐标级鼠标移动、像素级滚轮 |
| `chrome_scroll` | 按方向滚动页面或元素 |
| `chrome_screenshot` | 截图到文件，返回路径 |
| `chrome_eval` | 执行 JavaScript |
| `chrome_tabs` | 列 / 开 / 切 / 关标签页 |
| `chrome_sync_profile` | 从日常 Chrome 复制登录态（要先退干净 Chrome） |
| `chrome_close` | 关浏览器，下次调用自动拉起 |

工具名带 `chrome_` 前缀，避免和别的浏览器插件抢 `browser_*` 这个名字。

## 设置

插件页（插件 → dsh-chrome-pilot）有配置面板：profile 目录、Chrome 路径、截图目录、超时、会话名，加一个“显示浏览器窗口”的开关。保存后写进 profile 的 `cordis.patch.yml`，下一次工具调用就生效，不用重启。

也可以直接改 YAML：

```yaml
- id: chrome-pilot
  config:
    headed: false
    timeoutMs: 60000
```

| 字段 | 默认 | 说明 |
|---|---|---|
| `profileDir` | `~/.dsh/chrome-pilot/profile` | 登录态在这里 |
| `executablePath` | 自动探测 | 用哪个 chrome.exe 开 |
| `screenshotDir` | `<profileDir>/../screenshots` | 截图目录 |
| `timeoutMs` | `120000` | 单条命令超时 |
| `headed` | `true` | 关掉就是无头 |
| `session` | `dsh-pilot` | 会话名，不同名字互相隔离 |
| `profileSync` | `false` | 从日常 Chrome 复制登录态，仅 YAML |
| `syncIndexedDb` | `false` | 复制时带不带 IndexedDB，仅 YAML |
| `sourceUserData` | 自动探测 | 复制来源，仅 YAML |
| `binary` | 自动探测 | agent-browser 路径，仅 YAML |

## 实现

插件把 `chrome_*` 注册进 DSH。每次调用时它启动一条 agent-browser 命令，带上 `--profile` 和 `--session`；命令通过本地 socket 交给常驻的 daemon，daemon 再用 CDP 操作 Chrome。浏览器因此一直开着，单次调用大概 150–300ms。

```
DSH  ──chrome_* 工具──►  agent-browser CLI  ──socket──►  daemon  ──CDP──►  Chrome
```

快照取自 CDP 的可访问性树，每个可交互节点会被分配一个 `@eN` 引用。点击时用引用找到元素的包围盒中心，再往那个坐标发鼠标事件。`human` 模式会把一次移动拆成多个 `mouseMoved` 事件，沿曲线插值。

## 注意事项

Chrome 运行时会独占锁住 `Default\Network\Cookies`，所以没法从开着的浏览器复制 cookie，复制直接失败。

Chrome 127 之后加了 App-Bound 加密，cookie 的密钥和 `chrome.exe` 的路径绑定。用 Chrome for Testing 打开同一份 profile 解不开这些 cookie，而且不报错，只会丢掉。所以插件用你本机的 Chrome 打开 profile，默认流程也是让你在受控窗口里登录一次，而不是复制。

同一个 `session` 名会共用标签页。两个 DSH 会话同时用会互相抢焦点，要并行就给它俩不同的名字。

## 限制

- 只在 Windows 上实测过，macOS 和 Linux 的路径探测写了但没验证。
- 不做 OCR、验证码、反检测。需要人工的登录还是得你自己来。
- 插件没接 agent-browser 的全部能力，`pdf`、`record`、`trace`、`har` 这些还没暴露成工具。