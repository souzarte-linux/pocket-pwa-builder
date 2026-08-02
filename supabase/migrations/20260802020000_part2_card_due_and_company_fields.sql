-- Migration Part 2: Card due day/date tracking and expanded company details

-- 1. Add card_due_day to card_operators
ALTER TABLE public.card_operators ADD COLUMN IF NOT EXISTS card_due_day INTEGER NULL CHECK (card_due_day >= 1 AND card_due_day <= 31);

-- 2. Add card_due_day and card_due_date to expenses
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS card_due_day INTEGER NULL;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS card_due_date DATE NULL;

-- 3. Add address, cnpj, phone, is_whatsapp, social_media, website to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS address TEXT NULL;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS cnpj TEXT NULL;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS phone TEXT NULL;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS is_whatsapp BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS social_media TEXT NULL;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS website TEXT NULL;
