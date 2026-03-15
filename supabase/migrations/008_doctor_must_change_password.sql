-- ============================================
-- Migration 008: Add must_change_password to doctors
-- Allows admin to set temporary passwords that
-- doctors must change on first login.
-- ============================================

ALTER TABLE public.doctors
ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
