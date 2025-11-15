-- Add grading categories to submissions table
ALTER TABLE public.submissions
ADD COLUMN grade_mao_direita integer CHECK (grade_mao_direita >= 1 AND grade_mao_direita <= 5),
ADD COLUMN grade_mao_esquerda integer CHECK (grade_mao_esquerda >= 1 AND grade_mao_esquerda <= 5),
ADD COLUMN grade_voz integer CHECK (grade_voz >= 1 AND grade_voz <= 5),
ADD COLUMN grade_video integer CHECK (grade_video >= 1 AND grade_video <= 5),
ADD COLUMN grade_interpretacao integer CHECK (grade_interpretacao >= 1 AND grade_interpretacao <= 5),
ADD COLUMN grade_audio integer CHECK (grade_audio >= 1 AND grade_audio <= 5),
ADD COLUMN obs_mao_direita text,
ADD COLUMN obs_mao_esquerda text,
ADD COLUMN obs_voz text,
ADD COLUMN obs_video text,
ADD COLUMN obs_interpretacao text,
ADD COLUMN obs_audio text;