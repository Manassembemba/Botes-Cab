-- Requête pour vérifier les détails de la Mission #17 et les réservations/conflicts potentiels
SELECT 
    m.mission_id,
    m.vehicule_id,
    m.chauffeur_id,
    m.date_depart_prevue,
    m.date_arrivee_prevue,
    m.statut_mission,
    v.immatriculation,
    c.nom as nom_chauffeur,
    c.prenom as prenom_chauffeur
FROM public.tb_missions m
LEFT JOIN public.tb_vehicules v ON m.vehicule_id = v.vehicule_id
LEFT JOIN public.tb_chauffeurs c ON m.chauffeur_id = c.chauffeur_id
WHERE m.mission_id = 17;

-- Vérifier les réservations potentielles pour le même véhicule (ID 2) et chauffeur (ID 1)
SELECT 
    r.reservation_id,
    r.vehicule_id,
    r.chauffeur_id,
    r.date_depart_prevue,
    r.date_arrivee_prevue,
    r.statut_reservation,
    v.immatriculation,
    c.nom as nom_chauffeur,
    c.prenom as prenom_chauffeur
FROM public.tb_reservations r
LEFT JOIN public.tb_vehicules v ON r.vehicule_id = v.vehicule_id
LEFT JOIN public.tb_chauffeurs c ON r.chauffeur_id = c.chauffeur_id
WHERE r.vehicule_id = 2 OR r.chauffeur_id = 1
ORDER BY r.date_depart_prevue;

-- Vérifier toutes les missions pour le véhicule ID 2
SELECT 
    mission_id,
    date_depart_prevue,
    date_arrivee_prevue,
    statut_mission
FROM public.tb_missions
WHERE vehicule_id = 2
ORDER BY date_depart_prevue;

-- Vérifier toutes les réservations pour le véhicule ID 2
SELECT 
    reservation_id,
    date_depart_prevue,
    date_arrivee_prevue,
    statut_reservation
FROM public.tb_reservations
WHERE vehicule_id = 2
ORDER BY date_depart_prevue;