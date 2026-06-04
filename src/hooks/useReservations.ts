import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Reservation {
  reservation_id: number;
  vehicule_id: number;
  chauffeur_id: number | null;
  client_id: number | null;
  client_nom: string | null;
  lieu_depart: string;
  lieu_arrivee: string;
  date_depart_prevue: string;
  date_arrivee_prevue: string;
  date_depart_reelle: string | null;
  date_arrivee_reelle: string | null;
  statut_reservation: 'brouillon' | 'confirmée' | 'en_cours' | 'terminée' | 'annulée' | 'convertie_en_mission';
  type_course: string | null;
  montant_total: number | null;
  acompte: number | null;
  solde: number | null;
  devise: string | null;
  methode_paiement: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReservationWithDetails extends Reservation {
  vehicule?: { immatriculation: string; marque: string; modele: string; categorie: string | null } | null;
  chauffeur?: { nom: string; prenom: string; tel: string | null } | null;
  client?: { nom: string; prenom: string | null; telephone: string | null; titre: string | null } | null;
}

export type ReservationInsert = Omit<Reservation, 'reservation_id' | 'created_at' | 'updated_at'>;
export type ReservationUpdate = Partial<ReservationInsert>;

export function useReservations() {
  return useQuery({
    queryKey: ['reservations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tb_reservations')
        .select(`
          *,
          vehicule:tb_vehicules(immatriculation, marque, modele, categorie),
          chauffeur:tb_chauffeurs(nom, prenom, tel),
          client:tb_clients(nom, prenom, telephone, titre)
        `)
        .order('date_depart_prevue', { ascending: false });

      if (error) throw error;
      return data as ReservationWithDetails[];
    },
  });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reservation: ReservationInsert) => {
      const { data, error } = await supabase
        .from('tb_reservations')
        .insert(reservation)
        .select(`
          *,
          vehicule:tb_vehicules(immatriculation, marque, modele, categorie),
          chauffeur:tb_chauffeurs(nom, prenom, tel),
          client:tb_clients(nom, prenom, telephone, titre)
        `)
        .single();

      if (error) throw error;
      return data as ReservationWithDetails;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-stats'] });
    },
  });
}

export function useCreateReservationWithTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reservationData, paymentAmount, paymentMethodId }: { 
      reservationData: ReservationInsert, 
      paymentAmount: number, 
      paymentMethodId: number | null 
    }) => {
      const formattedData = {
        ...reservationData,
        date_depart_prevue: new Date(reservationData.date_depart_prevue).toISOString(),
        date_arrivee_prevue: new Date(reservationData.date_arrivee_prevue).toISOString(),
      };

      const { data, error } = await supabase.rpc('create_reservation_with_transaction', {
        reservation_data: formattedData,
        payment_amount: paymentAmount,
        payment_method_id: paymentMethodId
      });

      if (error) throw error;
      
      // Récupérer les détails complets car l'RPC renvoie l'objet simple
      const { data: fullDetails, error: fetchError } = await supabase
        .from('tb_reservations')
        .select(`
          *,
          vehicule:tb_vehicules(immatriculation, marque, modele, categorie),
          chauffeur:tb_chauffeurs(nom, prenom, tel),
          client:tb_clients(nom, prenom, telephone, titre)
        `)
        .eq('reservation_id', (data as any).reservation_id)
        .single();
        
      if (fetchError) throw fetchError;
      return fullDetails as ReservationWithDetails;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['caisse'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-stats'] });
    },
  });
}

export function useUpdateReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ReservationUpdate & { id: number }) => {
      const { data, error } = await supabase
        .from('tb_reservations')
        .update(updates)
        .eq('reservation_id', id)
        .select(`
          *,
          vehicule:tb_vehicules(immatriculation, marque, modele, categorie),
          chauffeur:tb_chauffeurs(nom, prenom, tel),
          client:tb_clients(nom, prenom, telephone, titre)
        `)
        .single();

      if (error) throw error;
      return data as ReservationWithDetails;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
}

export function useDeleteReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('tb_reservations')
        .delete()
        .eq('reservation_id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
}

export function useConvertReservationToMission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reservationId: number) => {
      const { data, error } = await supabase
        .rpc('convert_reservation_to_mission', {
          p_reservation_id: reservationId,
        });

      if (error) throw error;
      return data as number; // Retourne le mission_id créé
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['vehicules'] });
    },
  });
}
