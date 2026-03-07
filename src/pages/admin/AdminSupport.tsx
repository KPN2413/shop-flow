import { useEffect, useRef, useState } from 'react'
import {
  MessageCircle, Send, Loader2, User, Clock,
  CheckCircle, Circle, Search,
} from 'lucide-react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { Button } from '../../components/ui/button'
import { Textarea } from '../../components/ui/textarea'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { supabase } from '../../lib/supabase'
import { formatDate } from '../../lib/format'
import { cn } from '../../lib/utils'
import toast from 'react-hot-toast'

interface Chat {
  id: string
  user_id: string | null
  guest_name: string | null
  guest_email: string | null
  status: 'open' | 'closed'
  last_message: string | null
  unread_admin: number
  created_at: string
  updated_at: string
  profiles?: { full_name: string | null; phone: string | null } | null
}

interface Message {
  id: string
  chat_id: string
  sender: 'user' | 'admin'
  body: string
  created_at: string
}

export function AdminSupport() {
  const [chats, setChats] = useState<Chat[]>([])
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingChats, setLoadingChats] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [search, setSearch] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // ── Load chats ───────────────────────────────────────────────────────────────
  async function fetchChats() {
    const { data } = await supabase
      .from('support_chats')
      .select('*, profiles(full_name, phone)')
      .order('updated_at', { ascending: false })
    setChats((data as Chat[]) ?? [])
    setLoadingChats(false)
  }

  useEffect(() => { fetchChats() }, [])

  // ── Realtime: new chats ──────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('admin-chats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_chats' }, fetchChats)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // ── Load messages for selected chat ─────────────────────────────────────────
  async function loadMessages(chatId: string) {
    setLoadingMsgs(true)
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
    setMessages((data as Message[]) ?? [])
    setLoadingMsgs(false)
    // Mark as read
    await supabase.from('support_chats').update({ unread_admin: 0 }).eq('id', chatId)
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, unread_admin: 0 } : c))
  }

  // ── Realtime: messages in selected chat ──────────────────────────────────────
  useEffect(() => {
    if (!selectedChat) return
    loadMessages(selectedChat.id)

    const channel = supabase
      .channel(`admin-msgs:${selectedChat.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `chat_id=eq.${selectedChat.id}` },
        (payload) => {
          const msg = payload.new as Message
          setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg])
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedChat?.id])

  // ── Auto scroll ──────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Send reply ───────────────────────────────────────────────────────────────
  async function handleSend() {
    const text = input.trim()
    if (!text || !selectedChat || sending) return
    setSending(true)
    setInput('')

    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      chat_id: selectedChat.id,
      sender: 'admin',
      body: text,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempMsg])

    const { error } = await supabase.from('support_messages').insert({
      chat_id: selectedChat.id,
      sender: 'admin',
      body: text,
    })
    if (error) toast.error('Failed to send message')
    else {
      await supabase.from('support_chats').update({
        last_message: text,
        unread_user: 1,
        updated_at: new Date().toISOString(),
      }).eq('id', selectedChat.id)
    }
    setSending(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // ── Toggle chat status ───────────────────────────────────────────────────────
  async function toggleStatus(chat: Chat) {
    const newStatus = chat.status === 'open' ? 'closed' : 'open'
    await supabase.from('support_chats').update({ status: newStatus }).eq('id', chat.id)
    setChats(prev => prev.map(c => c.id === chat.id ? { ...c, status: newStatus } : c))
    if (selectedChat?.id === chat.id) setSelectedChat(c => c ? { ...c, status: newStatus } : c)
    toast.success(`Chat marked as ${newStatus}`)
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function chatDisplayName(chat: Chat) {
    return chat.profiles?.full_name || chat.guest_name || 'Guest'
  }

  const filteredChats = chats.filter(c => {
    const name = chatDisplayName(c).toLowerCase()
    const msg = (c.last_message ?? '').toLowerCase()
    const q = search.toLowerCase()
    return name.includes(q) || msg.includes(q)
  })

  const totalUnread = chats.reduce((sum, c) => sum + (c.unread_admin || 0), 0)

  return (
    <AdminLayout
      breadcrumbs={[{ label: 'Support', href: '/admin/support' }]}
    >
      <div className="flex h-[calc(100vh-4rem-3rem)] gap-0 border border-border rounded-xl overflow-hidden bg-card">

        {/* ── Chat list ── */}
        <div className="w-72 border-r border-border flex flex-col shrink-0">
          <div className="p-3 border-b border-border space-y-2">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm flex-1">All Chats</p>
              {totalUnread > 0 && (
                <Badge className="bg-secondary text-white text-[10px] px-1.5">{totalUnread} new</Badge>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                className="pl-8 h-8 text-xs"
                placeholder="Search chats…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingChats ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                No chats yet
              </div>
            ) : (
              filteredChats.map(chat => (
                <button
                  key={chat.id}
                  className={cn(
                    'w-full text-left px-3 py-3 border-b border-border hover:bg-muted/50 transition-colors',
                    selectedChat?.id === chat.id && 'bg-muted',
                  )}
                  onClick={() => setSelectedChat(chat)}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-semibold truncate">{chatDisplayName(chat)}</p>
                        {chat.unread_admin > 0 && (
                          <span className="w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center shrink-0"
                            style={{ backgroundColor: 'hsl(var(--secondary))' }}>
                            {chat.unread_admin}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {chat.last_message ?? 'No messages yet'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={cn(
                          'text-[9px] font-semibold px-1.5 py-0.5 rounded-full',
                          chat.status === 'open'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-muted text-muted-foreground'
                        )}>
                          {chat.status}
                        </span>
                        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {formatDate(chat.updated_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Message area ── */}
        {selectedChat ? (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Chat header */}
            <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-muted/20 shrink-0">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{chatDisplayName(selectedChat)}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedChat.guest_email || selectedChat.profiles?.phone || 'No contact info'}
                  {' · '}Started {formatDate(selectedChat.created_at)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs shrink-0"
                onClick={() => toggleStatus(selectedChat)}
              >
                {selectedChat.status === 'open'
                  ? <><CheckCircle className="w-3.5 h-3.5" /> Close</>
                  : <><Circle className="w-3.5 h-3.5" /> Reopen</>}
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMsgs ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  No messages yet. Wait for the customer to reach out.
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={cn('flex', msg.sender === 'admin' ? 'justify-end' : 'justify-start gap-2')}>
                    {msg.sender === 'user' && (
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    )}
                    <div className={cn(
                      'px-3 py-2 rounded-2xl text-sm max-w-[70%] whitespace-pre-wrap break-words',
                      msg.sender === 'admin'
                        ? 'text-white rounded-tr-sm'
                        : 'bg-muted rounded-tl-sm'
                    )}
                      style={msg.sender === 'admin' ? { backgroundColor: 'hsl(var(--primary))' } : {}}
                    >
                      {msg.body}
                      <div className={cn(
                        'text-[9px] mt-1 opacity-60',
                        msg.sender === 'admin' ? 'text-right' : ''
                      )}>
                        {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {/* Reply input */}
            {selectedChat.status === 'open' ? (
              <div className="px-4 pb-4 pt-2 border-t border-border shrink-0">
                <div className="flex gap-2 items-end">
                  <Textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a reply… (Enter to send)"
                    className="resize-none text-sm min-h-[40px] max-h-32"
                    rows={2}
                  />
                  <Button
                    size="icon"
                    className="h-10 w-10 shrink-0"
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
            ) : (
              <div className="px-4 py-3 border-t border-border text-center text-xs text-muted-foreground bg-muted/20">
                This chat is closed. Reopen it to send a reply.
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" />
              <p className="font-medium text-muted-foreground">Select a chat to view messages</p>
              <p className="text-xs text-muted-foreground mt-1">Customer messages appear here in real time</p>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
