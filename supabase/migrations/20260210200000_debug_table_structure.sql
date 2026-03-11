-- Migration: 20260210200000_debug_table_structure.sql
-- Description: Script pour inspecter la structure des tables et identifier les colonnes NOT NULL

-- Vérifier les colonnes NOT NULL dans tb_depenses
SELECT 
    column_name, 
    is_nullable, 
    data_type,
    column_default,
    CASE 
        WHEN is_nullable = 'NO' AND column_default IS NULL 
        THEN 'REQUISE SANS VALEUR PAR DEFAUT' 
        ELSE 'OK' 
    END AS statut
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tb_depenses' 
ORDER BY ordinal_position;

-- Vérifier les colonnes NOT NULL dans tb_journal_bord
SELECT 
    column_name, 
    is_nullable, 
    data_type,
    column_default,
    CASE 
        WHEN is_nullable = 'NO' AND column_default IS NULL 
        THEN 'REQUISE SANS VALEUR PAR DEFAUT' 
        ELSE 'OK' 
    END AS statut
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tb_journal_bord' 
ORDER BY ordinal_position;

-- Vérifier les colonnes NOT NULL dans tb_missions
SELECT 
    column_name, 
    is_nullable, 
    data_type,
    column_default,
    CASE 
        WHEN is_nullable = 'NO' AND column_default IS NULL 
        THEN 'REQUISE SANS VALEUR PAR DEFAUT' 
        ELSE 'OK' 
    END AS statut
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tb_missions' 
ORDER BY ordinal_position;