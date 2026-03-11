-- Script pour inspecter les structures des tables
-- Vérifier les colonnes NOT NULL dans tb_depenses
SELECT 
    column_name, 
    is_nullable, 
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tb_depenses' 
ORDER BY ordinal_position;

-- Vérifier les colonnes NOT NULL dans tb_journal_bord
SELECT 
    column_name, 
    is_nullable, 
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tb_journal_bord' 
ORDER BY ordinal_position;

-- Vérifier les colonnes NOT NULL dans tb_missions
SELECT 
    column_name, 
    is_nullable, 
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tb_missions' 
ORDER BY ordinal_position;