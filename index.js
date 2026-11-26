import { spawn } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import z from '@deepseek-ai/schemastery'

export const name = 'dsh-chrome-pilot'
export const inject = ['tools']

// `.volatile()` is what makes a field editable from the Plugins page: the
// settings service exposes only volatile fields, and an entry without any is
// not served at all (its form renders as "configuration service unavailable").
export const Config = z.object({
  profileDir: z.string().default('').description(
    '浏览器 profile 目录，登录态保存在这里。留空 = <DSH_HOME>/chrome-pilot/profile'
  ).volatile(),
  executablePath: z.string().default('').description(
    '用哪个 Chrome 可执行文件打开 profile。留空 = 自动探测本机 Chrome'
  ).volatile(),
  screenshotDir: z.string().default('').description(
    '截图默认保存目录。留空 = <profileDir 的上一级>/screenshots'
  ).volatile(),
  timeoutMs: z.number().step(1).min(1000).default(120000).description(
    '单条命令的超时毫秒数'
  ).volatile(),
  headed: z.boolean().default(true).description('是否显示浏览器窗口').volatile(),
  session: z.string().default('dsh-pilot').description(
    'agent-browser 会话名，用于隔离浏览器状态'
  ).volatile(),
  // YAML-only: these decide where logins come from, which is not a live concern.
  sourceUserData: z.string().default('').description(
    'profileSync 打开时，从哪个 Chrome User Data 目录复制。留空 = 自动探测'
  ),
  profileSync: z.boolean().default(false).description(
    '首次启动时从日常 Chrome 复制登录态。默认关闭：Chrome 会锁 Cookies，且 App-Bound 加密让复制不可靠'
  ),
  syncIndexedDb: z.boolean().default(false).description(
    '复制登录态时是否一并复制 IndexedDB（约 900 MB，少部分站点需要）'
  ),
  binary: z.string().default('').description(
    'agent-browser 可执行文件路径。留空 = 自动探测'
  )
})

// Chrome keeps its cookies in a SQLite database that is exclusively locked while
// the browser runs, and (Chrome 127+) encrypts the values with a key bound to the
// browser executable path. Copying a live profile is therefore unreliable, which
// is why the default flow is a dedicated profile the user logs into once.
const LOGIN_DIRS = ['Network', 'Local Storage', 'Storage']
const LOGIN_FILES = ['Preferences', 'Secure Preferences', 'Login Data', 'Web Data']

const text = (value) => [{
  type: 'text',
  text: typeof value === 'string' ? value : JSON.stringify(value, null, 2)
}]
const output = { schema: { type: 'object' }, render: (_args, value) => text(value) }

function object(properties, required = []) {
  return {
    type: 'object',
    additionalProperties: false,
    properties,
    ...(required.length ? { required } : {})
  }
}

/** A volatile field is a live reference; a plain value is used as-is. */
const read = (value) => (value !== null && typeof value === 'object' && typeof value.get === 'function'
  ? value.get()
  : value)

const dshHome = () => process.env.DSH_HOME || join(homedir(), '.dsh')

function chromeUserDataCandidates() {
  if (process.platform === 'win32') {
    const local = process.env.LOCALAPPDATA || ''
    return [join(local, 'Google', 'Chrome', 'User Data')]
  }
  if (process.platform === 'darwin') {
    return [join(homedir(), 'Library', 'Application Support', 'Google', 'Chrome')]
  }
  return [join(homedir(), '.config', 'google-chrome')]
}

function chromeExecutableCandidates() {
  if (process.platform === 'win32') {
    const bases = [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.LOCALAPPDATA]
    return bases.filter(Boolean).map((base) => join(base, 'Google', 'Chrome', 'Application', 'chrome.exe'))
  }
  if (process.platform === 'darwin') {
    return ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
  }
  return ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium']
}

function agentBrowserCandidates() {
  if (process.platform === 'win32') {
    const appdata = process.env.APPDATA || ''
    return [
      join(appdata, 'npm', 'node_modules', 'agent-browser', 'node_modules', '@agent-browser',
        'cli-win32-x64-msvc', 'bin', 'agent-browser.exe'),
      join(appdata, 'npm', 'node_modules', 'agent-browser', 'bin', 'agent-browser-win32-x64.exe')
    ]
  }
  return ['/usr/local/bin/agent-browser', '/opt/homebrew/bin/agent-browser', 'agent-browser']
}

const firstExisting = (candidates) => candidates.find((candidate) => candidate && existsSync(candidate)) || ''

export function apply(ctx, config = {}) {
  const logger = ctx.logger
  let started = false
  let indexDbOverride = false

  // Read on every use: volatile fields can change while the plugin stays loaded,
  // so the next tool call already sees a saved setting.
  const setting = (key) => read(config[key])
  const flag = (value, fallback) => {
    if (value === undefined || value === null || value === '' || value === ' ') return fallback
    if (typeof value === 'boolean') return value
    return !/^(false|0|off|no)$/i.test(String(value).trim())
  }
  const ms = (value, fallback) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
  }

  const profileDir = () => {
    const configured = String(setting('profileDir') ?? '').trim()
    return configured ? configured : join(dshHome(), 'chrome-pilot', 'profile')
  }
  const configuredScreenshotDir = () => String(setting('screenshotDir') ?? '').trim()
  const screenshotDir = () => configuredScreenshotDir() || join(profileDir(), '..', 'screenshots')
  const sessionName = () => String(setting('session') ?? '').trim() || 'dsh-pilot'
  const headed = () => flag(setting('headed'), true)
  const syncEnabled = () => flag(setting('profileSync'), false)
  const indexDbWanted = () => indexDbOverride || flag(setting('syncIndexedDb'), false)
  const sourceUserData = () => String(setting('sourceUserData') ?? '').trim()
    || firstExisting(chromeUserDataCandidates())
  const browserExecutable = () => String(setting('executablePath') ?? '').trim()
    || firstExisting(chromeExecutableCandidates())
  const cookiePath = () => join(profileDir(), 'Default', 'Network', 'Cookies')

  function engine() {
    const configured = String(setting('binary') ?? '').trim()
    if (configured) return configured
    const found = firstExisting(agentBrowserCandidates())
    if (!found) {
      throw new Error(
        'agent-browser 引擎没找到。先安装：npm i -g agent-browser；或在插件配置里把 binary 指向 agent-browser 可执行文件。'
      )
    }
    return found
  }

  // Best-effort copy: a locked or unreadable file is skipped and reported, never
  // fatal, because the managed browser is usable without it.
  function syncProfile() {
    const source = sourceUserData()
    const sourceDefault = join(source, 'Default')
    if (!source || !existsSync(sourceDefault)) {
      throw new Error(`源 Chrome profile 不存在：${sourceDefault || '(未探测到)'}`)
    }
    const targetDefault = join(profileDir(), 'Default')
    mkdirSync(targetDefault, { recursive: true })

    const copied = []
    const skipped = []

    const copyTree = (from, to) => {
      let stat
      try {
        stat = statSync(from)
      } catch (error) {
        skipped.push(`${from} (${error.code || 'error'})`)
        return
      }
      if (stat.isDirectory()) {
        try {
          mkdirSync(to, { recursive: true })
        } catch (error) {
          skipped.push(`${to} (${error.code || 'error'})`)
          return
        }
        for (const entry of readdirSync(from)) copyTree(join(from, entry), join(to, entry))
        return
      }
      try {
        copyFileSync(from, to)
        copied.push(to)
      } catch (error) {
        skipped.push(`${from} (${error.code || 'error'})`)
      }
    }

    const localState = join(source, 'Local State')
    if (existsSync(localState)) copyTree(localState, join(profileDir(), 'Local State'))
    for (const directory of LOGIN_DIRS) {
      const from = join(sourceDefault, directory)
      if (existsSync(from)) copyTree(from, join(targetDefault, directory))
    }
    for (const file of LOGIN_FILES) {
      const from = join(sourceDefault, file)
      if (existsSync(from)) copyTree(from, join(targetDefault, file))
    }
    if (indexDbWanted()) {
      const from = join(sourceDefault, 'IndexedDB')
      if (existsSync(from)) copyTree(from, join(targetDefault, 'IndexedDB'))
    }
    logger?.info?.(`dsh-chrome-pilot: 同步 ${copied.length} 个文件，跳过 ${skipped.length} 个`)
    return {
      copied: copied.length,
      skipped: skipped.slice(0, 12),
      skippedTotal: skipped.length,
      cookiesLocked: skipped.some((entry) => /Cookies/i.test(entry))
    }
  }

  function ensureProfile() {
    if (!syncEnabled()) return { synced: false }
    if (existsSync(cookiePath())) return { synced: false }
    return { synced: true, ...syncProfile() }
  }

  function runCli(args, options = {}) {
    const { json = true, timeoutMs = ms(setting('timeoutMs'), 120000) } = options
    const exe = engine()
    const browser = browserExecutable()
    const argv = [
      ...(json ? ['--json'] : []),
      '--session', sessionName(),
      '--profile', profileDir(),
      ...(browser ? ['--executable-path', browser] : []),
      ...(headed() ? ['--headed'] : []),
      ...args
    ]
    return new Promise((resolve, reject) => {
      let child
      try {
        child = spawn(exe, argv, {
          windowsHide: true,
          env: process.env,
          ...(/\.(cmd|bat)$/i.test(exe) ? { shell: true } : {})
        })
      } catch (error) {
        reject(error)
        return
      }
      let stdout = ''
      let stderr = ''
      const timer = setTimeout(() => {
        child.kill()
        reject(new Error(`agent-browser 超时（${timeoutMs} ms）：${args.join(' ')}`))
      }, timeoutMs)
      child.stdout.on('data', (chunk) => { stdout += chunk })
      child.stderr.on('data', (chunk) => { stderr += chunk })
      child.on('error', (error) => {
        clearTimeout(timer)
        reject(error)
      })
      child.on('close', (code) => {
        clearTimeout(timer)
        if (code !== 0) {
          const detail = (stderr || stdout).trim().split(/\r?\n/).slice(-8).join('\n')
          reject(new Error(detail || `agent-browser 退出码 ${code}`))
          return
        }
        if (!json) {
          resolve(stdout.trim())
          return
        }
        try {
          resolve(JSON.parse(stdout))
        } catch {
          resolve(stdout.trim())
        }
      })
    })
  }

  const snapshotText = (extra = []) => runCli(['snapshot', ...extra], { json: false })
  const simple = async (args, options) => ({ ok: true, output: await runCli(args, { json: false, ...options }) })

  async function launch(url) {
    const profile = ensureProfile()
    await runCli(url ? ['open', url] : ['open'])
    started = true
    return { profile, snapshot: await snapshotText(['--interactive']) }
  }

  const profileNote = (profile) => {
    if (!profile?.synced || !profile.cookiesLocked) return null
    return '日常 Chrome 正在运行，Cookies 被它独占锁定，本次没复制到登录态。'
      + '可以在这个窗口里登录一次（登录态会留在独立 profile 里），或完全退出 Chrome 后调用 chrome_sync_profile。'
  }

  const register = (spec) => ctx.tools.register(spec)

  register({
    name: 'chrome_open',
    description: '启动（或复用）受控 Chrome 并打开页面，返回可交互元素快照（元素带 @e1 这类引用）。',
    parameters: object({ url: { type: 'string', description: '要打开的 URL；省略则停在空白页' } }),
    output,
    async execute({ url }) {
      const { snapshot, profile } = await launch(url)
      const current = await runCli(['get', 'url'])
      return {
        ok: true,
        url: current?.data?.url ?? String(current ?? ''),
        note: profileNote(profile),
        profileDir: profileDir(),
        snapshot
      }
    }
  })

  register({
    name: 'chrome_snapshot',
    description: '读取当前页面的可访问性树并刷新 @e1 引用；点击/输入前先取一次。',
    parameters: object({
      interactive: { type: 'boolean', description: '只列可交互元素，默认 true' },
      compact: { type: 'boolean', description: '压掉空结构节点' }
    }),
    output,
    async execute({ interactive = true, compact = false }) {
      const extra = []
      if (interactive) extra.push('--interactive')
      if (compact) extra.push('--compact')
      return snapshotText(extra)
    }
  })

  register({
    name: 'chrome_click',
    description: '点击元素（@引用或 CSS 选择器），可用右键/中键、修饰键，human=true 走真人曲线轨迹。',
    parameters: object({
      selector: { type: 'string' },
      button: { type: 'string', enum: ['left', 'right', 'middle', 'back', 'forward'] },
      human: { type: 'boolean' },
      newTab: { type: 'boolean' }
    }, ['selector']),
    output,
    async execute({ selector, button, human, newTab }) {
      const args = ['click', selector]
      if (button) args.push('--button', button)
      if (human) args.push('--human')
      if (newTab) args.push('--new-tab')
      return simple(args)
    }
  })

  register({
    name: 'chrome_fill',
    description: '清空并填写输入框，兼容 React/Vue 受控组件与日期/颜色/范围等原生输入。',
    parameters: object({ selector: { type: 'string' }, text: { type: 'string' } }, ['selector', 'text']),
    output,
    async execute({ selector, text: value }) {
      return simple(['fill', selector, value])
    }
  })

  register({
    name: 'chrome_type',
    description: '在元素里逐字输入（不清空），可设每字延迟以模拟真人打字。',
    parameters: object({
      selector: { type: 'string' },
      text: { type: 'string' },
      delayMs: { type: 'number' }
    }, ['selector', 'text']),
    output,
    async execute({ selector, text: value, delayMs }) {
      const args = ['type', selector, value]
      if (typeof delayMs === 'number') args.push('--delay', String(delayMs))
      return simple(args)
    }
  })

  register({
    name: 'chrome_press',
    description: '在当前焦点按一个键或组合键（Enter、Tab、Control+a、Escape…）。',
    parameters: object({ key: { type: 'string' } }, ['key']),
    output,
    async execute({ key }) {
      return simple(['press', key])
    }
  })

  register({
    name: 'chrome_mouse',
    description: '把鼠标移动到页面坐标，human=true 走贝塞尔曲线，可用 steps/durationMs 控制节奏。',
    parameters: object({
      x: { type: 'number' },
      y: { type: 'number' },
      human: { type: 'boolean' },
      steps: { type: 'number' },
      durationMs: { type: 'number' }
    }, ['x', 'y']),
    output,
    async execute({ x, y, human, steps, durationMs }) {
      const args = ['mouse', 'move', String(x), String(y)]
      if (human) args.push('--human')
      if (typeof steps === 'number') args.push('--steps', String(steps))
      if (typeof durationMs === 'number') args.push('--duration', String(durationMs))
      return simple(args)
    }
  })

  register({
    name: 'chrome_wheel',
    description: '在当前鼠标位置发滚轮事件（像素级，可横竖）。',
    parameters: object({
      dy: { type: 'number', description: '纵向像素，向下为正' },
      dx: { type: 'number' }
    }, ['dy']),
    output,
    async execute({ dy, dx }) {
      const args = ['mouse', 'wheel', String(dy)]
      if (typeof dx === 'number') args.push(String(dx))
      return simple(args)
    }
  })

  register({
    name: 'chrome_scroll',
    description: '按方向滚动页面或指定元素。',
    parameters: object({
      direction: { type: 'string', enum: ['up', 'down', 'left', 'right'] },
      amount: { type: 'number' },
      selector: { type: 'string' }
    }),
    output,
    async execute({ direction = 'down', amount = 300, selector }) {
      const args = ['scroll', direction, String(amount)]
      if (selector) args.push('--selector', selector)
      return simple(args)
    }
  })

  register({
    name: 'chrome_screenshot',
    description: '截图到文件并返回路径；fullPage=true 截整页。',
    parameters: object({ path: { type: 'string' }, fullPage: { type: 'boolean' } }),
    output,
    async execute({ path, fullPage }) {
      const dir = screenshotDir()
      mkdirSync(dir, { recursive: true })
      const target = path || join(dir, `shot-${Date.now()}.png`)
      const args = ['screenshot', target]
      if (fullPage) args.push('--full')
      await runCli(args, { json: false })
      return { ok: true, path: target }
    }
  })

  register({
    name: 'chrome_eval',
    description: '在当前页面执行 JavaScript，返回 JSON 可序列化的结果。',
    parameters: object({ script: { type: 'string' } }, ['script']),
    output,
    async execute({ script }) {
      return { ok: true, result: await runCli(['eval', script]) }
    }
  })

  register({
    name: 'chrome_tabs',
    description: '标签页管理：list 列出、new 新建、switch 切换、close 关闭。',
    parameters: object({
      action: { type: 'string', enum: ['list', 'new', 'switch', 'close'] },
      url: { type: 'string' },
      target: { type: 'string' }
    }, ['action']),
    output,
    async execute({ action, url, target }) {
      const args = ['tab', action]
      if (action === 'new' && url) args.push(url)
      if ((action === 'switch' || action === 'close') && target) args.push(target)
      return simple(args)
    }
  })

  register({
    name: 'chrome_sync_profile',
    description: '从日常 Chrome 复制登录态（Cookies、Local Storage、登录数据）。必须先完全退出 Chrome。',
    parameters: object({ includeIndexedDb: { type: 'boolean' } }),
    output,
    async execute({ includeIndexedDb }) {
      try {
        await runCli(['close'], { json: false })
      } catch {
        // No browser was open; that is not an error here.
      }
      started = false
      if (includeIndexedDb) indexDbOverride = true
      return { ok: true, profileDir: profileDir(), ...syncProfile() }
    }
  })

  register({
    name: 'chrome_close',
    description: '关闭受控浏览器（下次调用工具会自动拉起，登录态保留在 profile 里）。',
    parameters: object({}),
    output,
    async execute() {
      const printed = await runCli(['close'], { json: false })
      started = false
      return { ok: true, output: printed }
    }
  })

  // This bundle ships its own page, so it opts out of any schema-generated form.
  ctx.inject(['settings'], (settingsCtx) => {
    try {
      settingsCtx.settings.configure({ auto: false }, ctx.fiber)
    } catch (error) {
      logger?.warn?.(`dsh-chrome-pilot: 无法关闭自动表单：${error instanceof Error ? error.message : String(error)}`)
    }
  })

  ctx.effect(() => async () => {
    if (!started) return
    try {
      await runCli(['close'], { json: false })
    } catch (error) {
      logger?.warn?.(`dsh-chrome-pilot: 关闭失败：${error instanceof Error ? error.message : String(error)}`)
    }
  })
}
