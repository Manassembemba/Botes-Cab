-- Migration pour la gestion des bons d'entrées multi-lignes
-- Création le 04/02/2026

-- 1. Table des en-têtes de bons d'entrée
CREATE TABLE IF NOT EXISTS public.tb_bons_entree (
    entree_id BIGSERIAL PRIMARY KEY,
    date_entree TIMESTAMPTZ DEFAULT NOW(),
    description_globale TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 2. Table des lignes d'entrées
CREATE TABLE IF NOT EXISTS public.tb_entree_items (
    item_id BIGSERIAL PRIMARY KEY,
    entree_id BIGINT REFERENCES public.tb_bons_entree(entree_id) ON DELETE CASCADE,
    qte NUMERIC(10,2) DEFAULT 1,
    description TEXT NOT NULL,
    pu_usd NUMERIC(12,2) DEFAULT 0,
    pu_cdf NUMERIC(12,2) DEFAULT 0,
    total_usd NUMERIC(12,2) GENERATED ALWAYS AS (qte * pu_usd) STORED,
    total_cdf NUMERIC(12,2) GENERATED ALWAYS AS (qte * pu_cdf) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Fonction pour valider un bon d'entrée et créer les entrées comptables
CREATE OR REPLACE FUNCTION public.validate_multi_income(
    p_date_entree TIMESTAMPTZ,
    p_description_globale TEXT,
    p_items JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_entree_id BIGINT;
    v_item RECORD;
BEGIN
    -- 1. Créer le bon
    INSERT INTO public.tb_bons_entree (date_entree, description_globale, created_by)
    VALUES (p_date_entree, p_description_globale, auth.uid())
    RETURNING entree_id INTO v_entree_id;

    -- 2. Insérer les items et créer les entrées en caisse
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        qte numeric, 
        description text, 
        pu_usd numeric, 
        pu_cdf numeric
    )
    LOOP
        -- Insérer la ligne de détail
        INSERT INTO public.tb_entree_items (entree_id, qte, description, pu_usd, pu_cdf)
        VALUES (v_entree_id, v_item.qte, v_item.description, v_item.pu_usd, v_item.pu_cdf);

        -- Créer l'entrée USD si montant > 0
        IF (v_item.qte * v_item.pu_usd) > 0 THEN
            INSERT INTO public.tb_caisse (
                type,
                montant,
                devise,
                source_type,
                source_id,
                description,
                date_transaction
            ) VALUES (
                'Entrée',
                v_item.qte * v_item.pu_usd,
                'USD',
                'Manuel',
                v_entree_id,
                CONCAT('[Bon d''entrée #', v_entree_id, '] ', v_item.description, ' (Qte: ', v_item.qte, ')'),
                p_date_entree
            );
        END IF;

        -- Créer l'entrée CDF si montant > 0
        IF (v_item.qte * v_item.pu_cdf) > 0 THEN
            INSERT INTO public.tb_caisse (
                type,
                montant,
                devise,
                source_type,
                source_id,
                description,
                date_transaction
            ) VALUES (
                'Entrée',
                v_item.qte * v_item.pu_cdf,
                'CDF',
                'Manuel',
                v_entree_id,
                CONCAT('[Bon d''entrée #', v_entree_id, '] ', v_item.description, ' (Qte: ', v_item.qte, ')'),
                p_date_entree
            );
        END IF;
    END LOOP;

    RETURN v_entree_id;
END;
$$;
