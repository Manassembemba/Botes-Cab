export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      tb_chauffeurs: {
        Row: {
          chauffeur_id: number
          created_at: string | null
          date_embauche: string
          disponibilite: string
          nom: string
          permis_exp_date: string
          prenom: string
          tel: string | null
          updated_at: string | null
          email: string | null
          type_contrat: string | null
        }
        Insert: {
          chauffeur_id?: number
          created_at?: string | null
          date_embauche: string
          disponibilite?: string
          nom: string
          permis_exp_date: string
          prenom: string
          tel?: string | null
          updated_at?: string | null
          email?: string | null
          type_contrat?: string | null
        }
        Update: {
          chauffeur_id?: number
          created_at?: string | null
          date_embauche?: string
          disponibilite?: string
          nom?: string
          permis_exp_date?: string
          prenom?: string
          tel?: string | null
          updated_at?: string | null
          email?: string | null
          type_contrat?: string | null
        }
        Relationships: []
      }
      tb_journal_bord: {
        Row: {
          chauffeur_id: number
          created_at: string | null
          date_heure: string
          details: string | null
          journal_id: number
          kilometrage_releve: number
          litres_carburant: number | null
          mission_id: number | null
          montant_carburant: number | null
          type_evenement: string
          updated_at: string | null
          vehicule_id: number
        }
        Insert: {
          chauffeur_id: number
          created_at?: string | null
          date_heure?: string
          details?: string | null
          journal_id?: number
          kilometrage_releve: number
          litres_carburant?: number | null
          mission_id?: number | null
          montant_carburant?: number | null
          type_evenement: string
          updated_at?: string | null
          vehicule_id: number
        }
        Update: {
          chauffeur_id?: number
          created_at?: string | null
          date_heure?: string
          details?: string | null
          journal_id?: number
          kilometrage_releve?: number
          litres_carburant?: number | null
          mission_id?: number | null
          montant_carburant?: number | null
          type_evenement?: string
          updated_at?: string | null
          vehicule_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "tb_journal_bord_chauffeur_id_fkey"
            columns: ["chauffeur_id"]
            isOneToOne: false
            referencedRelation: "tb_chauffeurs"
            referencedColumns: ["chauffeur_id"]
          },
          {
            foreignKeyName: "tb_journal_bord_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "tb_missions"
            referencedColumns: ["mission_id"]
          },
          {
            foreignKeyName: "tb_journal_bord_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "tb_vehicules"
            referencedColumns: ["vehicule_id"]
          },
        ]
      }
      tb_maintenance: {
        Row: {
          cout_total: number
          created_at: string | null
          date_debut: string
          date_fin: string | null
          description_travaux: string | null
          kilometrage_maintenance: number
          maintenance_id: number
          type_travail: string
          updated_at: string | null
          vehicule_id: number
        }
        Insert: {
          cout_total: number
          created_at?: string | null
          date_debut: string
          date_fin?: string | null
          description_travaux?: string | null
          kilometrage_maintenance: number
          maintenance_id?: number
          type_travail: string
          updated_at?: string | null
          vehicule_id: number
        }
        Update: {
          cout_total?: number
          created_at?: string | null
          date_debut?: string
          date_fin?: string | null
          description_travaux?: string | null
          kilometrage_maintenance?: number
          maintenance_id?: number
          type_travail?: string
          updated_at?: string | null
          vehicule_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "tb_maintenance_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "tb_vehicules"
            referencedColumns: ["vehicule_id"]
          },
        ]
      }
      tb_missions: {
        Row: {
          chauffeur_id: number
          client_nom: string | null
          created_at: string | null
          date_arrivee_prevue: string
          date_arrivee_reelle: string | null
          date_depart_prevue: string
          date_depart_reelle: string | null
          lieu_arrivee: string
          lieu_depart: string
          mission_id: number
          statut_mission: string
          updated_at: string | null
          vehicule_id: number
          montant_total: number | null
          acompte: number | null
          solde: number | null
          devise: string | null
          kilometrage_fin: number | null
        }
        Insert: {
          chauffeur_id: number
          client_nom?: string | null
          created_at?: string | null
          date_arrivee_prevue: string
          date_arrivee_reelle?: string | null
          date_depart_prevue: string
          date_depart_reelle?: string | null
          lieu_arrivee: string
          lieu_depart: string
          mission_id?: number
          statut_mission?: string
          updated_at?: string | null
          vehicule_id: number
          montant_total?: number | null
          acompte?: number | null
          solde?: number | null
          devise?: string | null
          kilometrage_fin?: number | null
        }
        Update: {
          chauffeur_id?: number
          client_nom?: string | null
          created_at?: string | null
          date_arrivee_prevue?: string
          date_arrivee_reelle?: string | null
          date_depart_prevue?: string
          date_depart_reelle?: string | null
          lieu_arrivee?: string
          lieu_depart?: string
          mission_id?: number
          statut_mission?: string
          updated_at?: string | null
          vehicule_id?: number
          montant_total?: number | null
          acompte?: number | null
          solde?: number | null
          devise?: string | null
          kilometrage_fin?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tb_missions_chauffeur_id_fkey"
            columns: ["chauffeur_id"]
            isOneToOne: false
            referencedRelation: "tb_chauffeurs"
            referencedColumns: ["chauffeur_id"]
          },
          {
            foreignKeyName: "tb_missions_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "tb_vehicules"
            referencedColumns: ["vehicule_id"]
          },
        ]
      }
      tb_remboursements: {
        Row: {
          client_nom: string
          created_at: string | null
          date_demande: string
          date_traitement: string | null
          mission_id: number | null
          montant: number
          motif: string
          notes: string | null
          remboursement_id: number
          statut: string
          updated_at: string | null
          devise: string | null
        }
        Insert: {
          client_nom: string
          created_at?: string | null
          date_demande?: string
          date_traitement?: string | null
          mission_id?: number | null
          montant: number
          motif: string
          notes?: string | null
          remboursement_id?: number
          statut?: string
          updated_at?: string | null
          devise?: string | null
        }
        Update: {
          client_nom?: string
          created_at?: string | null
          date_demande?: string
          date_traitement?: string | null
          mission_id?: number | null
          montant?: number
          motif?: string
          notes?: string | null
          remboursement_id?: number
          statut?: string
          updated_at?: string | null
          devise?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tb_remboursements_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "tb_missions"
            referencedColumns: ["mission_id"]
          },
        ]
      }
      tb_paiements: {
        Row: {
          paiement_id: number
          mission_id: number | null
          montant: number
          devise: string | null
          date_paiement: string | null
          methode_paiement: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          paiement_id?: number
          mission_id?: number | null
          montant: number
          devise?: string | null
          date_paiement?: string | null
          methode_paiement?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          paiement_id?: number
          mission_id?: number | null
          montant?: number
          devise?: string | null
          date_paiement?: string | null
          methode_paiement?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tb_paiements_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "tb_missions"
            referencedColumns: ["mission_id"]
          },
        ]
      }
      tb_depenses: {
        Row: {
          depense_id: number
          vehicule_id: number | null
          chauffeur_id: number | null
          maintenance_id: number | null
          categorie: string
          montant: number
          devise: string | null
          description: string | null
          date_depense: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          depense_id?: number
          vehicule_id?: number | null
          chauffeur_id?: number | null
          maintenance_id?: number | null
          categorie: string
          montant: number
          devise?: string | null
          description?: string | null
          date_depense?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          depense_id?: number
          vehicule_id?: number | null
          chauffeur_id?: number | null
          maintenance_id?: number | null
          categorie?: string
          montant?: number
          devise?: string | null
          description?: string | null
          date_depense?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tb_depenses_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "tb_vehicules"
            referencedColumns: ["vehicule_id"]
          },
          {
            foreignKeyName: "tb_depenses_chauffeur_id_fkey"
            columns: ["chauffeur_id"]
            isOneToOne: false
            referencedRelation: "tb_chauffeurs"
            referencedColumns: ["chauffeur_id"]
          },
          {
            foreignKeyName: "tb_depenses_maintenance_id_fkey"
            columns: ["maintenance_id"]
            isOneToOne: false
            referencedRelation: "tb_maintenance"
            referencedColumns: ["maintenance_id"]
          },
        ]
      }
      tb_caisse: {
        Row: {
          transaction_id: number
          type: string
          montant: number
          devise: string | null
          source_type: string | null
          source_id: number | null
          description: string | null
          date_transaction: string | null
          created_at: string | null
        }
        Insert: {
          transaction_id?: number
          type: string
          montant: number
          devise?: string | null
          source_type?: string | null
          source_id?: number | null
          description?: string | null
          date_transaction?: string | null
          created_at?: string | null
        }
        Update: {
          transaction_id?: number
          type?: string
          montant?: number
          devise?: string | null
          source_type?: string | null
          source_id?: number | null
          description?: string | null
          date_transaction?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      tb_vehicules: {
        Row: {
          annee_achat: number | null
          created_at: string | null
          date_prochaine_revision: string | null
          immatriculation: string
          kilometrage_actuel: number
          marque: string
          modele: string
          statut: string
          updated_at: string | null
          vehicule_id: number
          numero_chassis: string | null
          date_achat: string | null
          valeur_achat: number | null
          type_carburant: string | null
          capacite_reservoir: number | null
        }
        Insert: {
          annee_achat?: number | null
          created_at?: string | null
          date_prochaine_revision?: string | null
          immatriculation: string
          kilometrage_actuel?: number
          marque: string
          modele: string
          statut?: string
          updated_at?: string | null
          vehicule_id?: number
          numero_chassis?: string | null
          date_achat?: string | null
          valeur_achat?: number | null
          type_carburant?: string | null
          capacite_reservoir?: number | null
        }
        Update: {
          annee_achat?: number | null
          created_at?: string | null
          date_prochaine_revision?: string | null
          immatriculation?: string
          kilometrage_actuel?: number
          marque?: string
          modele?: string
          statut?: string
          updated_at?: string | null
          vehicule_id?: number
          numero_chassis?: string | null
          date_achat?: string | null
          valeur_achat?: number | null
          type_carburant?: string | null
          capacite_reservoir?: number | null
        }
        Relationships: []
      }
      tb_documents: {
        Row: {
          document_id: number
          nom: string
          type_document: string
          fichier_url: string
          date_expiration: string | null
          entite_type: string
          entite_id: number
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          document_id?: number
          nom: string
          type_document: string
          fichier_url: string
          date_expiration?: string | null
          entite_type: string
          entite_id: number
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          document_id?: number
          nom?: string
          type_document?: string
          fichier_url?: string
          date_expiration?: string | null
          entite_type?: string
          entite_id?: number
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
    DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
