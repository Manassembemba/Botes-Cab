-- Script pour vérifier la fonction create_mission_with_transaction
-- et s'assurer qu'elle respecte les contraintes de disponibilité

-- Vérifier la définition actuelle de la fonction
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public' 
AND routine_name = 'create_mission_with_transaction'
AND routine_type = 'FUNCTION';