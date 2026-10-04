-- Add onboarding_completo flag to perfil_usuario
-- Existing users default to true (they already have data)
ALTER TABLE perfil_usuario
  ADD COLUMN IF NOT EXISTS onboarding_completo BOOLEAN NOT NULL DEFAULT false;

-- Mark existing users with a nome as having completed onboarding
UPDATE perfil_usuario
  SET onboarding_completo = true
  WHERE nome IS NOT NULL AND nome != '';

-- Index for fast lookup in useOnboarding hook
CREATE INDEX IF NOT EXISTS idx_perfil_usuario_onboarding
  ON perfil_usuario (user_id, onboarding_completo);
