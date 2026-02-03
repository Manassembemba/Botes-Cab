import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { addDays, isBefore, format } from 'date-fns';

export interface Alert {
    id: string;
    type: 'maintenance' | 'document' | 'license';
    title: string;
    description: string;
    severity: 'warning' | 'danger';
    dueDate: string;
}

export function useAlerts() {
    return useQuery({
        queryKey: ['dashboard-alerts'],
        queryFn: async () => {
            const now = new Date();
            const thirtyDaysFromNow = addDays(now, 30);

            const alerts: Alert[] = [];

            // 1. Alertes Documents
            const { data: docs } = await supabase
                .from('tb_documents')
                .select('*')
                .not('date_expiration', 'is', null);

            if (docs) {
                docs.forEach(doc => {
                    if (doc.date_expiration) {
                        const expDate = new Date(doc.date_expiration);
                        if (isBefore(expDate, thirtyDaysFromNow)) {
                            alerts.push({
                                id: `doc-${doc.document_id}`,
                                type: 'document',
                                title: `Expiration: ${doc.nom}`,
                                description: `${doc.entite_type === 'vehicule' ? 'Véhicule' : 'Chauffeur'} ID #${doc.entite_id}`,
                                severity: isBefore(expDate, now) ? 'danger' : 'warning',
                                dueDate: doc.date_expiration
                            });
                        }
                    }
                });
            }

            // 2. Alertes Maintenance (Prochaine révision)
            const { data: vehicules } = await supabase
                .from('tb_vehicules')
                .select('vehicule_id, immatriculation, marque, modele, date_prochaine_revision')
                .not('date_prochaine_revision', 'is', null);

            if (vehicules) {
                vehicules.forEach(v => {
                    if (v.date_prochaine_revision) {
                        const revDate = new Date(v.date_prochaine_revision);
                        if (isBefore(revDate, thirtyDaysFromNow)) {
                            alerts.push({
                                id: `veh-${v.vehicule_id}`,
                                type: 'maintenance',
                                title: 'Révision nécessaire',
                                description: `${v.marque} ${v.modele} (${v.immatriculation})`,
                                severity: isBefore(revDate, now) ? 'danger' : 'warning',
                                dueDate: v.date_prochaine_revision
                            });
                        }
                    }
                });
            }

            // 3. Alertes Permis Chauffeurs
            const { data: chauffeurs } = await supabase
                .from('tb_chauffeurs')
                .select('chauffeur_id, nom, prenom, permis_exp_date')
                .not('permis_exp_date', 'is', null);

            if (chauffeurs) {
                chauffeurs.forEach(c => {
                    if (c.permis_exp_date) {
                        const expDate = new Date(c.permis_exp_date);
                        if (isBefore(expDate, thirtyDaysFromNow)) {
                            alerts.push({
                                id: `per-${c.chauffeur_id}`,
                                type: 'license',
                                title: 'Permis expire bientôt',
                                description: `${c.prenom} ${c.nom}`,
                                severity: isBefore(expDate, now) ? 'danger' : 'warning',
                                dueDate: c.permis_exp_date
                            });
                        }
                    }
                });
            }

            // Sort by due date (soonest first)
            return alerts.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        }
    });
}
