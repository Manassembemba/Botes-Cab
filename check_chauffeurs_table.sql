-- Vérifier la structure de la table des chauffeurs
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    constraint_name
FROM information_schema.columns 
LEFT JOIN information_schema.constraint_column_usage 
    ON columns.column_name = constraint_column_usage.column_name
    AND columns.table_name = constraint_column_usage.table_name
WHERE columns.table_name = 'tb_chauffeurs'
ORDER BY ordinal_position;