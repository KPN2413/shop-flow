-- ============================================================
-- Migration: Live Support Chat
-- Run in Supabase SQL Editor
-- ============================================================

-- ── Chat sessions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_chats (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- NULL for guests
  guest_name   TEXT,                                                -- for guests
  guest_email  TEXT,
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  last_message TEXT,
  unread_admin INTEGER NOT NULL DEFAULT 0,  -- unread count for admin
  unread_user  INTEGER NOT NULL DEFAULT 0,  -- unread count for user
  created_at   TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_support_chats_user   ON support_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_support_chats_status ON support_chats(status);

DROP TRIGGER IF EXISTS set_support_chats_updated_at ON support_chats;
CREATE TRIGGER set_support_chats_updated_at
  BEFORE UPDATE ON support_chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Messages ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id    UUID NOT NULL REFERENCES support_chats(id) ON DELETE CASCADE,
  sender     TEXT NOT NULL CHECK (sender IN ('user', 'admin')),
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_support_messages_chat ON support_messages(chat_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE support_chats    ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own chats
CREATE POLICY "Users can read own chats"
  ON support_chats FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can insert chats"
  ON support_chats FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own chats"
  ON support_chats FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Messages: users can read messages from their chat
CREATE POLICY "Users can read own messages"
  ON support_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_chats
      WHERE support_chats.id = support_messages.chat_id
        AND (support_chats.user_id = auth.uid() OR support_chats.user_id IS NULL)
    )
  );

CREATE POLICY "Users can insert messages"
  ON support_messages FOR INSERT WITH CHECK (true);

-- Admins can do everything
CREATE POLICY "Admins can manage all chats"
  ON support_chats FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can manage all messages"
  ON support_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'ADMIN'
    )
  );

-- ── Enable Realtime ───────────────────────────────────────────────────────────
-- Run these in the Supabase Dashboard → Database → Replication
-- OR uncomment if your Supabase version supports it via SQL:
-- ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE support_chats;

-- NOTE: After running this migration, go to:
-- Supabase Dashboard → Database → Replication → supabase_realtime
-- and enable both "support_messages" and "support_chats" tables.
