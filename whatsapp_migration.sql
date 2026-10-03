-- Feature D: WhatsApp Statement Sender
-- Add WhatsApp number column to members table
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
