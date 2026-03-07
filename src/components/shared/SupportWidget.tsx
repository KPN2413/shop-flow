import { useEffect, useRef, useState } from 'react'
import { MessageCircle, X, Send, Minimize2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Message {
  id: string
  chat_id: string
  sender: 'user' | 'admin'
  body: string
  created_at: string
}

const CHAT_ID_KEY = 'shopflow_support_chat_id'
const WIDGET_OPEN_KEY = 'shopflow_support_open'

// ── Main Widget ───────────────────────────────────────────────────────────────
export function SupportWidget() {
  const { user, profile } = useAuth()

  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(WIDGET_OPEN_KEY) === '1' } catch { return false }
  })
  const [chatId, setChatId] = useState<string | null>(() => {
    try { return localStorage.getItem(CHAT_ID_KEY) } catch { return null }
  })
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [unread, setUnread] = useState(0)

  // Guest info (shown before first message if not logged in)
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestInfoSubmitted, setGuestInfoSubmitted] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ── Persist open state ──────────────────────────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem(WIDGET_OPEN_KEY, open ? '1' : '0') } catch {}
    if (open && chatId) loadMessages()
    if (open) setUnread(0)
  }, [open])

  // ── Load messages ───────────────────────────────────────────────────────────
  async function loadMessages() {
    if (!chatId) return
    setLoading(true)
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
    setMessages((data as Message[]) ?? [])
    setLoading(false)
    // Mark as read
    await supabase.from('support_chats').update({ unread_user: 0 }).eq('id', chatId)
  }

  // ── Realtime subscription ───────────────────────────────────────────────────
  useEffect(() => {
    if (!chatId) return

    loadMessages()

    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const msg = payload.new as Message
          setMessages(prev => {
            if (prev.find(m => m.id === msg.id)) return prev
            return [...prev, msg]
          })
          if (!open && msg.sender === 'admin') {
            setUnread(n => n + 1)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [chatId])

  // ── Auto scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Create chat session ─────────────────────────────────────────────────────
  async function createChat(name?: string, email?: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('support_chats')
      .insert({
        user_id: user?.id ?? null,
        guest_name: name ?? profile?.full_name ?? null,
        guest_email: email ?? user?.email ?? null,
        status: 'open',
      })
      .select('id')
      .single()

    if (error || !data) return null
    const id = data.id
    setChatId(id)
    try { localStorage.setItem(CHAT_ID_KEY, id) } catch {}
    return id
  }

  // ── Send message ─────────────────────────────────────────────────────────────
  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return

    setSending(true)
    setInput('')

    let activeChatId = chatId

    // Create chat if needed
    if (!activeChatId) {
      activeChatId = await createChat(
        user ? undefined : guestName,
        user ? undefined : guestEmail
      )
      if (!activeChatId) { setSending(false); return }
    }

    // Optimistic update
    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      chat_id: activeChatId,
      sender: 'user',
      body: text,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempMsg])

    const { error } = await supabase.from('support_messages').insert({
      chat_id: activeChatId,
      sender: 'user',
      body: text,
    })

    if (!error) {
      await supabase
        .from('support_chats')
        .update({ last_message: text, unread_admin: 1, updated_at: new Date().toISOString() })
        .eq('id', activeChatId)
    }

    setSending(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Guest info form ──────────────────────────────────────────────────────────
  const needsGuestInfo = !user && !guestInfoSubmitted && !chatId

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Floating button */}
      <div className={cn(
        'fixed z-50 transition-all duration-300',
        'bottom-20 right-4 md:bottom-6 md:right-6'
      )}>
        {/* Unread badge */}
        {!open && unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold text-white z-10"
            style={{ backgroundColor: 'hsl(var(--secondary))' }}>
            {unread}
          </span>
        )}

        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95"
            style={{ backgroundColor: 'hsl(var(--primary))' }}
            aria-label="Open support chat"
          >
            <MessageCircle className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Chat window */}
      {open && (
        <div className={cn(
          'fixed z-50 flex flex-col',
          'bottom-20 right-2 left-2 md:left-auto md:bottom-6 md:right-6 md:w-80',
          'rounded-2xl shadow-2xl border border-border overflow-hidden',
          'bg-card',
        )}
          style={{ maxHeight: '480px', height: '480px' }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(222 47% 25%) 100%)' }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">ShopFlow Support</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <p className="text-[10px] text-white/70">Usually replies in minutes</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors">
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { setOpen(false); setChatId(null); setMessages([]); try { localStorage.removeItem(CHAT_ID_KEY) } catch {} }}
                className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                title="Close and clear chat"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Guest info form */}
          {needsGuestInfo ? (
            <div className="flex-1 flex flex-col justify-center p-5 gap-3">
              <p className="text-sm font-medium text-center">Before we start, tell us a bit about you</p>
              <Input
                placeholder="Your name"
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                className="text-sm"
              />
              <Input
                placeholder="Your email (optional)"
                type="email"
                value={guestEmail}
                onChange={e => setGuestEmail(e.target.value)}
                className="text-sm"
              />
              <Button
                onClick={() => setGuestInfoSubmitted(true)}
                disabled={!guestName.trim()}
                size="sm"
                className="w-full"
              >
                Start Chat
              </Button>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {/* Welcome message */}
                {messages.length === 0 && !loading && (
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <MessageCircle className="w-3 h-3 text-primary" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2 text-sm max-w-[85%]">
                      Hi {user ? (profile?.full_name?.split(' ')[0] || 'there') : (guestName || 'there')}! 👋<br />
                      How can we help you today?
                    </div>
                  </div>
                )}

                {loading && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                )}

                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={cn('flex', msg.sender === 'user' ? 'justify-end' : 'justify-start gap-2')}
                  >
                    {msg.sender === 'admin' && (
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <MessageCircle className="w-3 h-3 text-primary" />
                      </div>
                    )}
                    <div className={cn(
                      'px-3 py-2 rounded-2xl text-sm max-w-[85%] whitespace-pre-wrap break-words',
                      msg.sender === 'user'
                        ? 'text-white rounded-tr-sm'
                        : 'bg-muted rounded-tl-sm'
                    )}
                      style={msg.sender === 'user' ? { backgroundColor: 'hsl(var(--primary))' } : {}}
                    >
                      {msg.body}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="px-3 pb-3 pt-1 shrink-0 border-t">
                <div className="flex gap-2 items-end">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message… (Enter to send)"
                    className="resize-none text-sm min-h-[36px] max-h-24 py-2"
                    rows={1}
                  />
                  <Button
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                  >
                    {sending
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Send className="w-4 h-4" />
                    }
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
