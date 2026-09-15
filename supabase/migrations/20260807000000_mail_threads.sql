-- Threads de conversation e-mail (staff ↔ clients).
-- Chaque thread = un fil de messages entre Ooble et un client donné.

CREATE TABLE IF NOT EXISTS public.mail_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  client_email text NOT NULL,
  client_name text,
  subject text NOT NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  message_count int NOT NULL DEFAULT 0,
  has_unread boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mail_threads_client ON public.mail_threads(client_email);
CREATE INDEX idx_mail_threads_last ON public.mail_threads(last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.mail_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.mail_threads(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_email text NOT NULL,
  from_name text,
  to_email text NOT NULL,
  subject text,
  body_text text,
  body_html text,
  resend_id text,
  staff_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mail_messages_thread ON public.mail_messages(thread_id, created_at);

-- Trigger : met à jour le thread à chaque nouveau message.
CREATE OR REPLACE FUNCTION public.update_thread_on_message()
RETURNS trigger AS $$
BEGIN
  UPDATE public.mail_threads
  SET message_count = message_count + 1,
      last_message_at = NEW.created_at,
      has_unread = CASE WHEN NEW.direction = 'inbound' THEN true ELSE has_unread END
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_thread_on_message
  AFTER INSERT ON public.mail_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_thread_on_message();

-- RLS : staff uniquement.
ALTER TABLE public.mail_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_read_threads" ON public.mail_threads
  FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "staff_insert_threads" ON public.mail_threads
  FOR INSERT WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff_update_threads" ON public.mail_threads
  FOR UPDATE USING (public.is_staff(auth.uid()));

CREATE POLICY "staff_read_messages" ON public.mail_messages
  FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "staff_insert_messages" ON public.mail_messages
  FOR INSERT WITH CHECK (public.is_staff(auth.uid()));
