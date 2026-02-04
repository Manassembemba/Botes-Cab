-- Migration pour la gestion des bons de dépenses multi-lignes
-- Création le 04/02/2026

-- 1. Table des en-têtes de bons de dépense
CREATE TABLE IF NOT EXISTS public.tb_bons_depense (
    bon_id BIGSERIAL PRIMARY KEY,
    date_bon TIMESTAMPTZ DEFAULT NOW(),
    description_globale TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 2. Table des lignes de dépenses
CREATE TABLE IF NOT EXISTS public.tb_bon_items (
    item_id BIGSERIAL PRIMARY KEY,
    bon_id BIGINT REFERENCES public.tb_bons_depense(bon_id) ON DELETE CASCADE,
    qte NUMERIC(10,2) DEFAULT 1,
    description TEXT NOT NULL,
    pu_usd NUMERIC(12,2) DEFAULT 0,
    pu_cdf NUMERIC(12,2) DEFAULT 0,
    total_usd NUMERIC(12,2) GENERATED ALWAYS AS (qte * pu_usd) STORED,
    total_cdf NUMERIC(12,2) GENERATED ALWAYS AS (qte * pu_cdf) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Ajout du lien dans tb_depenses pour la traçabilité comptable
ALTER TABLE public.tb_depenses ADD COLUMN IF NOT EXISTS bon_id BIGINT REFERENCES public.tb_bons_depense(bon_id);

-- 4. Fonction pour valider un bon de dépense et créer les entrées comptables
CREATE OR REPLACE FUNCTION public.validate_multi_expense(
    p_date_bon TIMESTAMPTZ,
    p_description_globale TEXT,
    p_items JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_bon_id BIGINT;
    v_item RECORD;
BEGIN
    -- 1. Créer le bon
    INSERT INTO public.tb_bons_depense (date_bon, description_globale, created_by)
    VALUES (p_date_bon, p_description_globale, auth.uid())
    RETURNING bon_id INTO v_bon_id;

    -- 2. Insérer les items et créer les dépenses correspondantes
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        qte numeric, 
        description text, 
        pu_usd numeric, 
        pu_cdf numeric
    )
    LOOP
        -- Insérer la ligne de détail
        INSERT INTO public.tb_bon_items (bon_id, qte, description, pu_usd, pu_cdf)
        VALUES (v_bon_id, v_item.qte, v_item.description, v_item.pu_usd, v_item.pu_cdf);

        -- Créer la dépense USD si montant > 0
        IF (v_item.qte * v_item.pu_usd) > 0 THEN
            INSERT INTO public.tb_depenses (
                categorie,
                montant,
                devise,
                description,
                date_depense,
                bon_id
            ) VALUES (
                'Divers',
                v_item.qte * v_item.pu_usd,
                'USD',
                CONCAT('[Bon #', v_bon_id, '] ', v_item.description, ' (Qte: ', v_item.qte, ')'),
                p_date_bon,
                v_bon_id
            );
        END IF;

        -- Créer la dépense CDF si montant > 0
        IF (v_item.qte * v_item.pu_cdf) > 0 THEN
            INSERT INTO public.tb_depenses (
                categorie,
                montant,
                devise,
                description,
                date_depense,
                bon_id
            ) VALUES (
                'Divers',
                v_item.qte * v_item.pu_cdf,
                'CDF',
                CONCAT('[Bon #', v_bon_id, '] ', v_item.description, ' (Qte: ', v_item.qte, ')'),
                p_date_bon,
                v_bon_id
            );
        END IF;
    END LOOP;

    RETURN v_bon_id;
END;
$$;
