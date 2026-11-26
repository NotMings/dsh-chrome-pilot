window.__ModuleLoader__.load({
	id: 'dsh-chrome-pilot',
	factory: (require) => {
		const module = { exports: {} }
		const exports = module.exports
		const React = require('react')
		const h = React.createElement
		let P = {}
		try {
			P = require('@deepseek-ai/dsh-client-ui-primitives') || {}
		} catch {
			P = {}
		}
		const has = (name) => P[name] !== undefined && P[name] !== null

		const PACKAGE = 'dsh-chrome-pilot'
		const ENTRY = 'chrome-pilot'
		const NS = 'dshChromePilot'
		const DOCS = 'https://github.com/vercel-labs/agent-browser'

		const MESSAGES = {
			zh: {
				summary: '让 agent 驾驶一个真实的 Chrome：原生鼠标/键盘/滚轮，登录态存在独立 profile 里。',
				statusTitle: '当前配置',
				statusDesc: '留空的项使用平台默认值，改完保存即生效（下次启动浏览器时应用）。',
				engineLabel: '浏览器引擎',
				engineValue: 'agent-browser（外部命令，需全局安装）',
				chromeLabel: 'Chrome 可执行文件',
				chromeValue: '未指定，自动探测本机 Chrome',
				profileLabel: 'profile 目录',
				profileValue: '默认：<DSH_HOME>/chrome-pilot/profile',
				tryTitle: '试一试',
				tryDesc: '在对话里直接这样说，模型会调用 chrome_* 工具：',
				try1: '打开 https://news.ycombinator.com，把首页标题读给我',
				try2: '在这个页面搜索「deepseek」，点第一个结果，告诉我标题',
				try3: '把当前页面整页截图，存到工作区',
				settingsTitle: '设置',
				settingsDesc: '保存后立即写入插件配置；下次调用工具时生效。',
				profileDir: 'profile 目录',
				profileDirHint: '登录态保存在这里。留空用默认路径（<DSH_HOME>/chrome-pilot/profile）。',
				executablePath: 'Chrome 可执行文件',
				executablePathHint: '留空自动探测。要带着本机 Chrome 的加密 cookie 时必须指向你自己的 chrome.exe。',
				screenshotDir: '截图目录',
				screenshotDirHint: '留空用 <profileDir 的上一级>/screenshots。',
				timeoutMs: '单条命令超时（毫秒）',
				timeoutMsHint: '默认 120000。网页很慢时调大，例如 300000。',
				headed: '显示浏览器窗口',
				headedHint: 'true / false。无头模式看不到界面，但更快。',
				headedOn: '开：显示浏览器窗口',
				headedOff: '关：无头运行，看不到界面',
				headedUnknown: '读取中…',
				session: '浏览器会话名',
				sessionHint: '默认 dsh-pilot。不同名字的会话互相隔离标签页与登录态。',
				overridden: '已修改',
				reset: '恢复默认',
				invalidNumber: '请输入数字',
				unavailable: '配置服务不可用',
				readOnly: '当前不可写',
				saveFailed: '保存失败',
				save: '保存',
				saving: '保存中…',
				noForm: '当前 DSH 版本不提供设置表单组件，请直接编辑 profile 的 cordis.patch.yml。',
				toolsHint: '工具：chrome_open / chrome_snapshot / chrome_click / chrome_fill / chrome_type / chrome_press / chrome_mouse / chrome_wheel / chrome_scroll / chrome_screenshot / chrome_eval / chrome_tabs / chrome_close'
			},
			en: {
				summary: 'Lets the agent drive a real Chrome with native input, keeping logins in a dedicated profile.',
				statusTitle: 'Current configuration',
				statusDesc: 'Empty values fall back to platform defaults; changes apply the next time the browser starts.',
				engineLabel: 'Browser engine',
				engineValue: 'agent-browser (external command, install globally)',
				chromeLabel: 'Chrome executable',
				chromeValue: 'Not set — detected automatically',
				profileLabel: 'Profile directory',
				profileValue: 'Default: <DSH_HOME>/chrome-pilot/profile',
				tryTitle: 'Try it',
				tryDesc: 'Say this in a conversation and the model calls chrome_* tools:',
				try1: 'Open https://news.ycombinator.com and read me the front-page titles',
				try2: 'Search this page for "deepseek", click the first result, and tell me its title',
				try3: 'Take a full-page screenshot and save it into the workspace',
				settingsTitle: 'Settings',
				settingsDesc: 'Saved straight into the plugin configuration; applied on the next tool call.',
				profileDir: 'Profile directory',
				profileDirHint: 'Logins live here. Leave empty for <DSH_HOME>/chrome-pilot/profile.',
				executablePath: 'Chrome executable',
				executablePathHint: 'Leave empty to auto-detect. Point at your own chrome.exe to read that profile\'s encrypted cookies.',
				screenshotDir: 'Screenshot directory',
				screenshotDirHint: 'Leave empty for <profileDir>/../screenshots.',
				timeoutMs: 'Command timeout (ms)',
				timeoutMsHint: 'Default 120000. Raise it for very slow pages, e.g. 300000.',
				headed: 'Show the browser window',
				headedHint: 'true / false. Headless is faster but invisible.',
				headedOn: 'On: the browser window is visible',
				headedOff: 'Off: headless, no window',
				headedUnknown: 'Reading…',
				session: 'Browser session name',
				sessionHint: 'Default dsh-pilot. Different names isolate tabs and logins.',
				overridden: 'Modified',
				reset: 'Reset',
				invalidNumber: 'Enter a number',
				unavailable: 'Configuration service unavailable',
				readOnly: 'Read only',
				saveFailed: 'Save failed',
				save: 'Save',
				saving: 'Saving…',
				noForm: 'This DSH build does not provide the settings form; edit cordis.patch.yml directly.',
				toolsHint: 'Tools: chrome_open / chrome_snapshot / chrome_click / chrome_fill / chrome_type / chrome_press / chrome_mouse / chrome_wheel / chrome_scroll / chrome_screenshot / chrome_eval / chrome_tabs / chrome_close'
			}
		}

		const CSS = `
.cpx{display:flex;flex-direction:column;gap:22px;font-size:13px;line-height:1.55;color:var(--dsw-alias-label-primary)}
.cpx-section{display:flex;flex-direction:column;gap:8px}
.cpx-title{margin:0;font-size:13px;font-weight:600}
.cpx-desc{margin:0;font-size:12px;color:var(--dsw-alias-label-tertiary)}
.cpx-rows{display:flex;flex-direction:column;border-top:0.5px solid var(--dsw-alias-border-l2)}
.cpx-row{display:flex;gap:12px;padding:9px 2px;border-bottom:0.5px solid var(--dsw-alias-border-l2)}
.cpx-key{flex:none;width:150px;color:var(--dsw-alias-label-secondary)}
.cpx-val{flex:1;min-width:0;overflow-wrap:anywhere}
.cpx-mono{font-family:var(--dsw-font-mono,ui-monospace,monospace);font-size:12px;color:var(--dsw-alias-label-secondary)}
.cpx-try{display:flex;flex-direction:column;gap:6px;margin:0;padding:0;list-style:none}
.cpx-try li{background:var(--dsw-alias-bg-l2,rgba(127,127,127,.1));border-radius:6px;padding:8px 10px}
.cpx-hint{font-size:12px;color:var(--dsw-alias-label-tertiary)}
.cpx-toggle{display:flex;align-items:center;gap:12px;padding:12px 2px;border-top:0.5px solid var(--dsw-alias-border-l2);margin-top:6px}
.cpx-toggle-text{flex:1;min-width:0}
.cpx-toggle-label{font-size:13px}
.cpx-switch{flex:none;width:40px;height:22px;border-radius:11px;border:0;padding:0;cursor:pointer;position:relative;background:var(--dsw-alias-border-l2);transition:background .15s ease}
.cpx-switch:disabled{cursor:not-allowed;opacity:.5}
.cpx-switch.is-on{background:var(--dsw-alias-label-accent,#4dabf7)}
.cpx-knob{position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform .15s ease;box-shadow:0 1px 2px rgba(0,0,0,.3)}
.cpx-switch.is-on .cpx-knob{transform:translateX(18px)}
.cpx-err{margin-top:6px;font-size:12px;color:var(--dsw-alias-label-danger,#ff6b6b)}
`

		function useStyles() {
			React.useMemo(() => {
				if (typeof document === 'undefined') return
				if (document.getElementById('dsh-chrome-pilot-style')) return
				const style = document.createElement('style')
				style.id = 'dsh-chrome-pilot-style'
				style.textContent = CSS
				document.head.appendChild(style)
			}, [])
		}

		function Section({ title, desc, children }) {
			return h('section', { className: 'cpx-section' },
				h('h3', { className: 'cpx-title' }, title),
				desc ? h('p', { className: 'cpx-desc' }, desc) : null,
				children)
		}

		function Row({ label, value, mono }) {
			return h('div', { className: 'cpx-row' },
				h('div', { className: 'cpx-key' }, label),
				h('div', { className: mono ? 'cpx-val cpx-mono' : 'cpx-val' }, value))
		}

		function StatusSection({ t, state }) {
			const value = (key, fallback) => {
				const raw = state && state[key] && state[key].value
				return raw === undefined || raw === null || raw === '' ? fallback : String(raw)
			}
			return h(Section, { title: t('statusTitle'), desc: t('statusDesc') },
				h('div', { className: 'cpx-rows' },
					h(Row, { label: t('engineLabel'), value: t('engineValue') }),
					h(Row, { label: t('chromeLabel'), value: value('executablePath', t('chromeValue')), mono: true }),
					h(Row, { label: t('profileLabel'), value: value('profileDir', t('profileValue')), mono: true }),
					h(Row, { label: t('session'), value: value('session', 'dsh-pilot'), mono: true })))
		}

		function TrySection({ t }) {
			return h(Section, { title: t('tryTitle'), desc: t('tryDesc') },
				h('ul', { className: 'cpx-try' },
					h('li', null, t('try1')),
					h('li', null, t('try2')),
					h('li', null, t('try3'))),
				h('p', { className: 'cpx-hint' }, t('toolsHint')))
		}

		// No boolean field type ships with the client primitives, so this control
		// reads the form handle's own store and writes a typed boolean through
		// set(key, value); the settings service validates it like any other field.
		// Layout is inline so host button/stylesheet rules cannot reshape it.
		function HeadedToggle({ t, handle }) {
			const [error, setError] = React.useState('')
			const [busy, setBusy] = React.useState(false)
			const [shape, setShape] = React.useState('')
			const subscribe = React.useCallback((listener) => {
				if (!handle || !handle.store || typeof handle.store.subscribe !== 'function') return () => {}
				const off = handle.store.subscribe(listener)
				return typeof off === 'function' ? off : () => {}
			}, [handle])
			const getSnapshot = React.useCallback(() => {
				if (!handle || !handle.store || typeof handle.store.getSnapshot !== 'function') return null
				try {
					return handle.store.getSnapshot()
				} catch {
					return null
				}
			}, [handle])
			const snapshot = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
			const candidates = [
				snapshot && snapshot.value && snapshot.value.headed,
				snapshot && snapshot.config && snapshot.config.headed,
				snapshot && snapshot.headed,
				snapshot && snapshot.value && snapshot.value.value && snapshot.value.value.headed
			]
			const current = candidates.find((candidate) => typeof candidate === 'boolean')
			const known = typeof current === 'boolean'
			const on = known ? current : false
			const writable = !snapshot || snapshot.writable !== false
			if (!known && snapshot && !shape) {
				try {
					setShape('snapshot 键: ' + Object.keys(snapshot).join(',')
						+ (snapshot.value && typeof snapshot.value === 'object'
							? ' ｜ value 键: ' + Object.keys(snapshot.value).slice(0, 12).join(',')
							: ''))
				} catch {
					setShape('snapshot 不可枚举')
				}
			}
			const toggle = () => {
				if (!handle || busy) return
				setBusy(true)
				setError('')
				const finish = (failure) => {
					setBusy(false)
					if (failure) setError(failure && failure.message ? failure.message : String(failure))
				}
				try {
					const result = handle.set('headed', known ? !on : true)
					if (result && typeof result.then === 'function') result.then(() => finish(null), finish)
					else finish(null)
				} catch (failure) {
					finish(failure)
				}
			}
			const track = {
				display: 'flex',
				alignItems: 'center',
				gap: '12px',
				padding: '12px 2px',
				marginTop: '6px',
				borderTop: '0.5px solid var(--dsw-alias-border-l2)'
			}
			const knob = {
				position: 'absolute',
				top: '3px',
				left: '3px',
				width: '16px',
				height: '16px',
				borderRadius: '50%',
				background: '#fff',
				transform: on ? 'translateX(18px)' : 'none',
				transition: 'transform .15s ease'
			}
			const switchStyle = {
				flex: 'none',
				width: '40px',
				height: '22px',
				minWidth: '40px',
				borderRadius: '11px',
				border: '0',
				padding: '0',
				cursor: writable ? 'pointer' : 'not-allowed',
				position: 'relative',
				background: on ? '#4dabf7' : 'rgba(127,127,127,.45)',
				opacity: writable ? 1 : 0.5
			}
			return h('div', { style: track },
				h('div', { style: { flex: '1 1 auto', minWidth: '0' } },
					h('div', { style: { fontSize: '13px' } }, t('headed')),
					h('div', { className: 'cpx-hint' },
						known ? (on ? t('headedOn') : t('headedOff')) : (shape || t('headedUnknown')))),
				h('button', {
					type: 'button',
					role: 'switch',
					'aria-checked': on,
					'aria-label': t('headed'),
					style: switchStyle,
					disabled: busy || !writable,
					onClick: toggle
				}, h('span', { style: knob })),
				error ? h('div', { className: 'cpx-err' }, error) : null)
		}

		function SettingsSection(props) {
			const { t } = props
			const state = props.useChromePilotSettings
				? props.useChromePilotSettings((snapshot) => snapshot)
				: null
			if (state === null || !has('SettingsForm') || !has('SettingsValueField')) {
				return h(Section, { title: t('settingsTitle'), desc: t('settingsDesc') }, h('p', { className: 'cpx-hint' }, t('noForm')))
			}
			const disabled = !state.writable
			const field = (key, id, label, hint, numeric) => h(P.SettingsValueField, Object.assign({
				id,
				label,
				hint,
				numeric,
				disabled,
				overriddenLabel: t('overridden'),
				resetLabel: t('reset'),
				invalidLabel: t('invalidNumber')
			}, state[key], {
				onEdit: (text) => props.edit(key, text),
				onReset: () => props.resetField(key)
			}))
			return h(Section, { title: t('settingsTitle'), desc: t('settingsDesc') },
				h(P.SettingsForm, {
					labels: {
						unavailable: t('unavailable'),
						readOnly: t('readOnly'),
						saveFailed: t('saveFailed'),
						save: t('save'),
						saving: t('saving')
					},
					state,
					onSave: props.save,
					onDiscard: props.discard,
					children: [
						field('profileDir', 'chrome-pilot-profileDir', t('profileDir'), t('profileDirHint'), false),
						field('executablePath', 'chrome-pilot-executablePath', t('executablePath'), t('executablePathHint'), false),
						field('screenshotDir', 'chrome-pilot-screenshotDir', t('screenshotDir'), t('screenshotDirHint'), false),
						field('timeoutMs', 'chrome-pilot-timeoutMs', t('timeoutMs'), t('timeoutMsHint'), true),
						field('session', 'chrome-pilot-session', t('session'), t('sessionHint'), false)
					]
				}),
				h(HeadedToggle, { t, handle: props.formHandle }))
		}

		function ChromePilotPage(props) {
			useStyles()
			const t = props.t
			if (props.view === 'summary') return t('summary')
			const state = props.useChromePilotSettings
				? props.useChromePilotSettings((snapshot) => snapshot)
				: null
			return h('div', { className: 'cpx' },
				h('p', { className: 'cpx-hint' }, props.debug || ''),
				h(StatusSection, { t, state }),
				h(TrySection, { t }),
				h(SettingsSection, props))
		}

		const inject = ['slots', 'locale', 'configForms']

		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, MESSAGES), 'dsh-chrome-pilot: dictionaries')

			// No boolean field type ships with the client primitives, so the headed
			// toggle talks to the form handle directly: its store is a
			// getSnapshot/subscribe pair, and set(key, value) writes one operation.
			let formHandle = null
			try {
				formHandle = ctx.configForms ? ctx.configForms.get(ENTRY) : null
			} catch {
				formHandle = null
			}
			const debugLine = formHandle ? '' : '配置服务不可用：拿不到 chrome-pilot 的配置句柄。'

			let face = () => ({ formHandle, debug: debugLine })
			if (formHandle && has('SettingsFormModel') && has('settingsTextField') && has('settingsNumberField')) {
				const form = new P.SettingsFormModel(
					formHandle,
					[
						P.settingsTextField('profileDir'),
						P.settingsTextField('executablePath'),
						P.settingsTextField('screenshotDir'),
						P.settingsNumberField('timeoutMs'),
						P.settingsTextField('session')
					]
				)
				const store = form.bind(() => Object.assign({}, form.shell(), {
					profileDir: form.field('profileDir'),
					executablePath: form.field('executablePath'),
					screenshotDir: form.field('screenshotDir'),
					timeoutMs: form.field('timeoutMs'),
					session: form.field('session')
				}))
				ctx.effect(() => () => form.dispose(), 'dsh-chrome-pilot: settings form')
				face = () => Object.assign({ formHandle, debug: debugLine, hooks: { chromePilotSettings: store } }, form.actions())
			}

			ctx.effect(() => ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
				name: 'plugins.bundle.config',
				key: PACKAGE,
				locale: NS,
				inject: face
			}, ChromePilotPage)), 'dsh-chrome-pilot: plugin page')
		}

		exports.apply = apply
		exports.inject = inject
		return module.exports
	}
})
