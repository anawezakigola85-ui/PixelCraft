import { useEffect, useState } from 'react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { useSettings, saveSettings } from '../store/settings'
import { useLanguage } from '../lib/i18n2'
import { useAuth } from '../store/authStore'
import { SignOutButton } from './SettingsSignOut'

export default function SettingsPage() {
  const s = useSettings()
  const { language, setLanguage } = useLanguage()
  const [key, setKey] = useState(s.aiApiKey)
  const [model, setModel] = useState(s.aiModel)

  useEffect(() => {
    setKey(s.aiApiKey)
    setModel(s.aiModel)
  }, [s.aiApiKey, s.aiModel])

  const save = async () => {
    await saveSettings({ ...s, aiApiKey: key, aiModel: model })
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="sticky top-0 z-10 flex items-center gap-4 px-8 py-4 glass-strong border-b border-[var(--color-border)]">
        <button onClick={() => (window.location.pathname = '/')} className="text-[var(--color-text)] text-sm">
          ← Dashboard
        </button>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
      </header>
      <main className="max-w-3xl mx-auto px-8 py-8 space-y-8">
        {/* Appearance */}
        <section className="glass-strong rounded-2xl p-6 animate-slide-up">
          <h2 className="font-display text-lg font-semibold">Appearance</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-xs text-[var(--color-text-muted)] flex items-center gap-2 glass rounded-lg p-3">
              Theme
              <Select
                value={s.theme}
                options={[
                  { value: 'dark', label: 'Dark' },
                  { value: 'light', label: 'Light' },
                ]}
                onChange={(e) => void saveSettings({ ...s, theme: e.target.value as 'dark' | 'light' })}
                className="w-32"
              />
            </label>
            <label className="text-xs text-[var(--color-text-muted)] flex items-center gap-2 glass rounded-lg p-3">
              Language
              <Select
                value={language}
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'sw', label: 'Kiswahili' },
                ]}
                onChange={(e) => setLanguage(e.target.value as 'en' | 'sw')}
                className="w-40"
              />
            </label>
          </div>
        </section>

        {/* AI Provider */}
        <section className="glass-strong rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h2 className="font-display text-lg font-semibold">AI Provider</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Keys stay in the backend environment (<code className="font-mono text-[var(--color-accent-2)]">backend/.env</code>), never in the browser.
          </p>
          <div className="mt-4 space-y-3">
            <label className="text-xs text-[var(--color-text-muted)]">Provider</label>
            <Select
              value={s.aiProvider}
              options={[
                { value: 'openai', label: 'OpenAI (paid · chat + image)' },
                { value: 'gemini', label: 'Google Gemini (FREE chat + transcription)' },
              ]}
              onChange={(e) => void saveSettings({ ...s, aiProvider: e.target.value })}
              className="w-64"
            />
            <label className="text-xs text-[var(--color-text-muted)]">Model</label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={s.aiProvider === 'gemini' ? 'gemini-3.5-flash-lite' : 'gpt-4o-mini'}
              className="mt-1 w-64 h-10"
            />
            <label className="text-xs text-[var(--color-text-muted)]">Local note only — the real key is NOT entered here</label>
            <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="Optional note, e.g. 'key added in Render'" className="mt-1 w-64 h-10" />
            <Button onClick={save} disabled={!key && !model} className="mt-2 brand-gradient text-black">
              Save AI Settings
            </Button>

            <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-xs text-[var(--color-text-muted)] space-y-2">
              <p className="font-semibold text-[var(--color-text)]">Free option (no card needed)</p>
              <p>
                Get a free key at{' '}
                <a href="https://aistudio.google.com/api-keys" target="_blank" rel="noreferrer" className="text-[var(--color-accent-2)] underline">aistudio.google.com/api-keys</a>
                {' '}→ in Render set <code>GEMINI_API_KEY</code> → choose provider <b>Google Gemini (FREE)</b> above → model <code>gemini-3.5-flash-lite</code>.
                This powers the AI Assistant chat and audio transcription for free. Image generation still needs an OpenAI key because Gemini image models are paid.
              </p>
              <p className="font-semibold text-[var(--color-text)] pt-1">Paid option (OpenAI · chat + images)</p>
              <ol className="list-decimal pl-5 space-y-1.5">
                <li>
                  Create your key at{' '}
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-[var(--color-accent-2)] underline">platform.openai.com/api-keys</a>
                  {' '}→ <b>Login</b> → <b>Create new secret key</b> → copy it (starts with <code>sk-</code>).
                </li>
                <li>
                  Add a payment method at{' '}
                  <a href="https://platform.openai.com/settings/organization/billing/overview" target="_blank" rel="noreferrer" className="text-[var(--color-accent-2)] underline">OpenAI Billing</a>
                  {' '}(image generation is paid; chat is very cheap).
                </li>
                <li>
                  Go to{' '}
                  <a href="https://dashboard.render.com" target="_blank" rel="noreferrer" className="text-[var(--color-accent-2)] underline">Render Dashboard</a>
                  {' '}→ service <b>pixelcraft-ehto</b> → <b>Environment</b> → <b>Add Environment Variable</b>.
                  Set key <code>OPENAI_API_KEY</code> and value = your copied key → <b>Save Changes</b>. Wait for deploy.
                </li>
              </ol>
              <p>
                Test:{' '}
                <a href="https://pixelcraft-ehto.onrender.com/health" target="_blank" rel="noreferrer" className="text-[var(--color-accent-2)] underline">Backend health</a>
                {' '}·{' '}
                <a href="https://pixel-craft-blue.vercel.app/ai" target="_blank" rel="noreferrer" className="text-[var(--color-accent-2)] underline">AI Studio</a>
                . Never paste the key into this browser field — it stays on Render only.
              </p>
            </div>
          </div>
        </section>

        {/* Export preferences */}
        <section className="glass-strong rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <h2 className="font-display text-lg font-semibold">Export Preferences</h2>
          <div className="mt-4 space-y-3">
            <label className="text-xs text-[var(--color-text-muted)] flex items-center justify-between">
              Default format
              <Select
                value={s.exportFormat}
                options={[
                  { value: 'png', label: 'PNG' },
                  { value: 'jpeg', label: 'JPEG' },
                  { value: 'webp', label: 'WebP' },
                ]}
                onChange={(e) => void saveSettings({ ...s, exportFormat: e.target.value as 'png' | 'jpeg' | 'webp' })}
                className="w-32"
              />
            </label>
            <label className="text-xs text-[var(--color-text-muted)] flex items-center justify-between">
              Quality
              <input
                type="range"
                min={70}
                max={100}
                value={s.exportQuality}
                onChange={(e) => void saveSettings({ ...s, exportQuality: Number(e.target.value) })}
                className="w-40"
              />
            </label>
          </div>
        </section>

        {/* Account */}
        <section className="glass-strong rounded-2xl p-6 animate-slide-up">
          <h2 className="font-display text-lg font-semibold">Account</h2>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{useAuth((s) => s.session?.name || 'No account')}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{useAuth((s) => s.session?.email || '')}</p>
            </div>
            <SignOutButton />
          </div>
        </section>

        {/* Shortcuts */}
        <section className="glass-strong rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <h2 className="font-display text-lg font-semibold">Keyboard Shortcuts</h2>
          <div className="mt-4 space-y-2">
            {Object.entries(s.shortcuts).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-[var(--color-text-muted)] capitalize">{k}</span>
                <kbd className="px-2 py-0.5 rounded-lg bg-[var(--color-panel)] border border-[var(--color-border)] text-[var(--color-text)]">{v}</kbd>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
