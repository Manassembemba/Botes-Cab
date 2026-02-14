-- Vérifier la définition actuelle de la fonction de vérification
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public' 
AND routine_name = 'check_mission_overlap'
AND routine_type = 'FUNCTION';