-- 1. Adapter tb_missions
ALTER TABLE public.tb_missions ALTER COLUMN chauffeur_id DROP NOT NULL;
ALTER TABLE public.tb_missions ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.tb_missions ADD COLUMN IF NOT EXISTS caution NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.tb_missions ADD COLUMN IF NOT EXISTS methode_paiement TEXT;
ALTER TABLE public.tb_missions ADD COLUMN IF NOT EXISTS reservation_id_legacy INTEGER;

-- 2. Migrer les données de tb_reservations vers tb_missions
INSERT INTO public.tb_missions (
    chauffeur_id, vehicule_id, client_id, client_nom, lieu_depart, lieu_arrivee,
    date_depart_prevue, date_arrivee_prevue, date_depart_reelle, date_arrivee_reelle,
    statut_mission, type_course, montant_total, acompte, solde, devise,
    notes, caution, methode_paiement, created_at, updated_at, reservation_id_legacy
)
SELECT 
    chauffeur_id, vehicule_id, client_id, client_nom, lieu_depart, lieu_arrivee,
    date_depart_prevue, date_arrivee_prevue, date_depart_reelle, date_arrivee_reelle,
    CASE 
        WHEN statut_reservation = 'brouillon' THEN 'Brouillon'
        WHEN statut_reservation = 'confirmée' THEN 'Planifiée'
        WHEN statut_reservation = 'en_cours' THEN 'En cours'
        WHEN statut_reservation = 'terminée' THEN 'Terminée'
        WHEN statut_reservation = 'annulée' THEN 'Annulée'
        ELSE 'Planifiée'
    END,
    type_course, montant_total, acompte, solde, devise,
    notes, caution, methode_paiement, created_at, updated_at, reservation_id
FROM public.tb_reservations
WHERE statut_reservation != 'convertie_en_mission';

-- 3. Mettre à jour les paiements liés aux réservations
UPDATE public.tb_paiements p
SET mission_id = m.mission_id
FROM public.tb_missions m
WHERE p.reservation_id = m.reservation_id_legacy
AND p.mission_id IS NULL;

-- 4. Supprimer la table tb_reservations et les objets liés
DROP TABLE IF EXISTS public.tb_reservations CASCADE;
DROP FUNCTION IF EXISTS public.convert_reservation_to_mission(integer) CASCADE;
DROP FUNCTION IF EXISTS public.create_reservation_with_transaction(jsonb, numeric, integer) CASCADE;

-- 5. Mettre à jour les fonctions de disponibilité
CREATE OR REPLACE FUNCTION public.get_available_vehicules_in_range(
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE
)
RETURNS SETOF public.tb_vehicules AS $$
BEGIN
    RETURN QUERY
    SELECT v.*
    FROM public.tb_vehicules v
    WHERE NOT EXISTS (
        -- Vérifier les missions existantes
        SELECT 1 
        FROM public.tb_missions m
        WHERE m.vehicule_id = v.vehicule_id
        AND m.statut_mission NOT IN ('Terminée', 'Annulée')
        AND (
            (m.date_depart_prevue < end_date AND m.date_arrivee_prevue > start_date)
            OR 
            (start_date < m.date_arrivee_prevue AND end_date > m.date_depart_prevue)
        )
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_available_chauffeurs_in_range(
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE
)
RETURNS SETOF public.tb_chauffeurs AS $$
BEGIN
    RETURN QUERY
    SELECT c.*
    FROM public.tb_chauffeurs c
    WHERE NOT EXISTS (
        -- Vérifier les missions existantes
        SELECT 1 
        FROM public.tb_missions m
        WHERE m.chauffeur_id = c.chauffeur_id
        AND m.statut_mission NOT IN ('Terminée', 'Annulée')
        AND (
            (m.date_depart_prevue < end_date AND m.date_arrivee_prevue > start_date)
            OR 
            (start_date < m.date_arrivee_prevue AND end_date > m.date_depart_prevue)
        )
    );
END;
$$ LANGUAGE plpgsql;
