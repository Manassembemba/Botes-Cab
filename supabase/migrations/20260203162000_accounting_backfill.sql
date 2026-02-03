-- Script de Backfill : Synchronisation de l'historique comptable
-- Description : Remplit la table tb_caisse avec les paiements et dépenses existants

-- 1. Nettoyer la caisse pour éviter les doublons (Optionnel, à utiliser avec prudence)
-- DELETE FROM public.tb_caisse WHERE source_type IN ('Paiement', 'Depense', 'Remboursement');

-- 2. Insérer les paiements de missions existants
INSERT INTO public.tb_caisse (
    type,
    montant,
    devise,
    source_type,
    source_id,
    description,
    date_transaction,
    created_at
)
SELECT 
    'Entrée',
    p.montant,
    COALESCE(p.devise, 'USD'),
    'Paiement',
    p.paiement_id,
    CONCAT('Paiement mission #', p.mission_id, 
           CASE WHEN p.notes IS NOT NULL THEN ' - ' || p.notes ELSE '' END),
    p.date_paiement,
    p.created_at
FROM public.tb_paiements p
WHERE NOT EXISTS (
    SELECT 1 FROM public.tb_caisse c 
    WHERE c.source_type = 'Paiement' AND c.source_id = p.paiement_id
);

-- 3. Insérer les dépenses existantes
INSERT INTO public.tb_depenses (
            vehicule_id,
            maintenance_id,
            categorie,
            montant,
            devise,
            description,
            date_depense
        )
SELECT 
    m.vehicule_id,
    m.maintenance_id,
    'Maintenance',
    m.cout_total,
    'USD',
    CONCAT('Maintenance: ', m.type_travail),
    COALESCE(m.date_fin, m.date_debut)
FROM public.tb_maintenance m
WHERE m.cout_total > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.tb_depenses d 
    WHERE d.maintenance_id = m.maintenance_id
);

INSERT INTO public.tb_caisse (
    type,
    montant,
    devise,
    source_type,
    source_id,
    description,
    date_transaction,
    created_at
)
SELECT 
    'Sortie',
    d.montant,
    COALESCE(d.devise, 'USD'),
    'Depense',
    d.depense_id,
    CONCAT(d.categorie, 
           CASE WHEN d.description IS NOT NULL THEN ' - ' || d.description ELSE '' END),
    d.date_depense,
    d.created_at
FROM public.tb_depenses d
WHERE NOT EXISTS (
    SELECT 1 FROM public.tb_caisse c 
    WHERE c.source_type = 'Depense' AND c.source_id = d.depense_id
);

-- 4. Insérer les remboursements validés existants
INSERT INTO public.tb_caisse (
    type,
    montant,
    devise,
    source_type,
    source_id,
    description,
    date_transaction,
    created_at
)
SELECT 
    'Sortie',
    r.montant,
    'USD', -- Devise par défaut si non spécifiée
    'Remboursement',
    r.remboursement_id,
    CONCAT('Remboursement - Chauffeur #', m.chauffeur_id),
    COALESCE(r.date_traitement, r.date_demande),
    r.created_at
FROM public.tb_remboursements r
JOIN public.tb_missions m ON r.mission_id = m.mission_id
WHERE r.statut = 'Validé'
  AND NOT EXISTS (
    SELECT 1 FROM public.tb_caisse c 
    WHERE c.source_type = 'Remboursement' AND c.source_id = r.remboursement_id
);

-- 5. Recalculer les soldes de toutes les missions
UPDATE public.tb_missions m
SET 
    acompte = (
        SELECT COALESCE(SUM(p.montant), 0)
        FROM public.tb_paiements p
        WHERE p.mission_id = m.mission_id
    ),
    solde = m.montant_total - (
        SELECT COALESCE(SUM(p.montant), 0)
        FROM public.tb_paiements p
        WHERE p.mission_id = m.mission_id
    );

-- 6. Afficher un résumé
SELECT 
    (SELECT COUNT(*) FROM public.tb_caisse) as total_caisse_entries,
    (SELECT SUM(montant) FROM public.tb_caisse WHERE type = 'Entrée' AND devise = 'USD') as total_entrees_usd,
    (SELECT SUM(montant) FROM public.tb_caisse WHERE type = 'Sortie' AND devise = 'USD') as total_sorties_usd;
