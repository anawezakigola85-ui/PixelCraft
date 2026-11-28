import { useEffect, useRef, useState } from 'react'
import { Sparkles, Send, Lightbulb, Wand2, Palette } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { askAI, SUGGESTIONS } from '../../lib/ai'
import { useSettings } from '../../store/settings'
import { useUI } from '../../store/ui'
import { cn } from '../../lib/utils'

interface Msg {
  role: 'user' | 'assistant'
  text: string
}

const CHAT_KEY = 'pixelcraft-ai-chat'

function loadChat(): Msg[] {
  try {
    const raw = window.sessionStorage.getItem(CHAT_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (m): m is Msg =>
        !!m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string',
    )
  } catch {
    return []
  }
}

export default function AIAssistant() {
  // Chat survives Hide/Show and any unmount/remount within the same browser tab.
  const [messages, setMessages] = useState<Msg[]>(loadChat)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<Msg[]>(messages)
  const { aiProvider, aiModel } = useSettings()

  useEffect(() => {
    messagesRef.current = messages
    try {
      window.sessionStorage.setItem(CHAT_KEY, JSON.stringify(messages))
    } catch {
      // Private browsing / full storage: chat still works for this session.
    }
  }, [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy])

  const send = async (text?: string) => {
    const q = text || input.trim()
    if (!q || busy) return
    setInput('')
    const history: Msg[] = [...messagesRef.current, { role: 'user', text: q }]
    messagesRef.current = history
    setMessages(history)
    setBusy(true)
    try {
      const reply = await askAI([
        {
          role: 'system',
          content:
            'You are Nova, the creative AI assistant for Pixelcraft, a video/image editor. ' +
            'Help users with design ideas, colors, fonts, text, storyboards, transitions, captions and editing suggestions. ' +
            'Answer concisely and practically. Never claim to have edited anything or access user projects unless told.',
        },
        ...history.map((m) => ({ role: m.role, content: m.text })),
      ])
      setMessages((m) => [...m, { role: 'assistant', text: reply }])
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: `I couldn't reach the AI provider (${(e as Error).message}). Check AI provider settings in Settings.` },
      ])
    } finally {
      setBusy(false)
    }
  }

  return (
    <aside className="absolute right-0 top-0 h-full w-96 glass-strong border-l border-[var(--color-border)] rounded-l-xl z-30 shadow-2xl animate-slide-in">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)]">
        <Sparkles className="h-4 w-4 text-[var(--color-accent-2)]" />
        <h3 className="font-display font-semibold text-sm">Pixel AI Assistant</h3>
        <button
          className="ml-auto text-[10px] text-[var(--color-text-muted)] underline"
          onClick={() => {
            messagesRef.current = []
            setMessages([])
            try { window.sessionStorage.removeItem(CHAT_KEY) } catch { /* ignore */ }
          }}
        >
          Clear chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-[var(--color-text-muted)]">Ask me anything about your design or project:</p>
            <div className="flex flex-col gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="text-left text-xs px-2.5 py-1.5 rounded-lg glass-strong hover:border-[var(--color-accent-3)] transition text-[var(--color-text)]"
                  onClick={() => send(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn(`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`)}>
            <span
              className={cn(
                'max-w-[85%] rounded-xl px-3 py-2 text-xs whitespace-pre-wrap shadow-sm',
                m.role === 'user' ? 'brand-gradient text-black font-medium' : 'glass text-[var(--color-text)]',
              )}
            >
              {m.text}
            </span>
          </div>
        ))}
        {busy && <span className="text-[10px] text-[var(--color-text-muted)] glass rounded px-2 py-1">…thinking</span>}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t border-[var(--color-border)] space-y-2">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your project…"
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void send()
              }
            }}
          />
          <Button size="sm" onClick={() => void send()} disabled={busy || !input.trim()} className="h-9">
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex gap-1 text-[9px] text-[var(--color-text-muted)]">
          <Lightbulb className="h-3 w-3" /> Provider: {aiProvider} ({aiModel})
          <Wand2 className="h-3 w-3 ml-1" /> Keys configured in backend/.env
        </div>
        <div className="flex gap-1 text-[9px] text-[var(--color-text-muted)]">
          <Palette className="h-3 w-3" />
          <button className="underline" onClick={() => window.open('/settings', '_self')}>
            Settings
          </button>
          <button className="underline ml-2" onClick={() => useUI.getState().setAIPanelOpen(false)}>
            Hide panel
          </button>
        </div>
      </div>
    </aside>
  )
}
