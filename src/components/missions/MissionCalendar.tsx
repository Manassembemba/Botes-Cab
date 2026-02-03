import { useMemo } from 'react';
import { format, startOfDay, addHours, isWithinInterval, addMinutes, differenceInMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useVehicules } from '@/hooks/useVehicules';
import { type MissionWithDetails } from '@/hooks/useMissions';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Car, Clock, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MissionCalendarProps {
    missions: MissionWithDetails[];
    selectedDate: Date;
    onEdit: (mission: MissionWithDetails) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_WIDTH = 120; // pixels

const statusColors: Record<string, string> = {
    'Planifiée': 'bg-status-assigned/20 text-status-assigned border-status-assigned/30 hover:bg-status-assigned/30',
    'En cours': 'bg-status-available/20 text-status-available border-status-available/30 hover:bg-status-available/30',
    'Terminée': 'bg-muted text-muted-foreground border-border hover:bg-muted/80',
    'Annulée': 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20',
};

export function MissionCalendar({ missions, selectedDate, onEdit }: MissionCalendarProps) {
    const { data: vehicules } = useVehicules();
    const startOfSelectedDay = startOfDay(selectedDate);

    const missionsByVehicule = useMemo(() => {
        const map: Record<number, MissionWithDetails[]> = {};
        missions.forEach((m) => {
            if (!map[m.vehicule_id]) map[m.vehicule_id] = [];
            map[m.vehicule_id].push(m);
        });
        return map;
    }, [missions]);

    const getMissionStyle = (mission: MissionWithDetails) => {
        const missionStart = new Date(mission.date_depart_prevue);
        const missionEnd = new Date(mission.date_arrivee_prevue);

        // Si la mission commence avant le jour sélectionné, on la fait commencer à 00:00
        const displayStart = missionStart < startOfSelectedDay ? startOfSelectedDay : missionStart;
        // Si la mission finit après le jour sélectionné, on la fait finir à 23:59
        const endOfDaySelected = addHours(startOfSelectedDay, 24);
        const displayEnd = missionEnd > endOfDaySelected ? endOfDaySelected : missionEnd;

        const startMinutes = differenceInMinutes(displayStart, startOfSelectedDay);
        const durationMinutes = differenceInMinutes(displayEnd, displayStart);

        const left = (startMinutes / 60) * HOUR_WIDTH;
        const width = (durationMinutes / 60) * HOUR_WIDTH;

        return {
            left: `${left}px`,
            width: `${Math.max(width, 40)}px`, // Small minimum width for visibility
        };
    };

    return (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
            <TooltipProvider>
                <ScrollArea className="w-full">
                    <div className="min-w-max">
                        {/* Header: Hours */}
                        <div className="flex border-b border-border bg-muted/30">
                            <div className="w-48 flex-shrink-0 border-r border-border p-4 font-semibold text-sm flex items-center gap-2">
                                <Car className="h-4 w-4" />
                                Véhicule
                            </div>
                            <div className="flex">
                                {HOURS.map((hour) => (
                                    <div
                                        key={hour}
                                        className="border-r border-border/50 text-center text-xs text-muted-foreground py-3"
                                        style={{ width: `${HOUR_WIDTH}px` }}
                                    >
                                        {hour.toString().padStart(2, '0')}:00
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Rows: Vehicles */}
                        <div className="divide-y divide-border">
                            {vehicules?.map((vehicule) => (
                                <div key={vehicule.vehicule_id} className="flex group hover:bg-accent/5">
                                    <div className="w-48 flex-shrink-0 border-r border-border p-4">
                                        <div className="font-medium text-sm text-foreground">{vehicule.immatriculation}</div>
                                        <div className="text-[10px] text-muted-foreground truncate">{vehicule.marque} {vehicule.modele}</div>
                                    </div>
                                    <div className="relative h-20 flex-1">
                                        {/* Hour grid lines */}
                                        <div className="absolute inset-0 flex pointer-events-none">
                                            {HOURS.map((hour) => (
                                                <div
                                                    key={hour}
                                                    className="border-r border-border/20 h-full"
                                                    style={{ width: `${HOUR_WIDTH}px` }}
                                                />
                                            ))}
                                        </div>

                                        {/* Missions for this vehicle */}
                                        {(missionsByVehicule[vehicule.vehicule_id] || []).map((mission) => (
                                            <Tooltip key={mission.mission_id}>
                                                <TooltipTrigger asChild>
                                                    <div
                                                        onClick={() => onEdit(mission)}
                                                        className={cn(
                                                            "absolute top-4 h-12 rounded-lg border p-2 cursor-pointer transition-all shadow-sm flex flex-col justify-center overflow-hidden z-10",
                                                            statusColors[mission.statut_mission] || statusColors['Planifiée']
                                                        )}
                                                        style={getMissionStyle(mission)}
                                                    >
                                                        <span className="text-[10px] font-bold truncate leading-none mb-1">
                                                            {mission.client_nom || 'Mission'}
                                                        </span>
                                                        <div className="flex items-center gap-1 text-[8px] opacity-80 truncate leading-none">
                                                            <Clock className="h-2 w-2" />
                                                            {format(new Date(mission.date_depart_prevue), 'HH:mm')} - {format(new Date(mission.date_arrivee_prevue), 'HH:mm')}
                                                        </div>
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent className="p-4 max-w-xs shadow-xl border-primary/20 bg-background/95 backdrop-blur-sm">
                                                    <div className="space-y-3">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center justify-between gap-4">
                                                                <p className="font-bold text-sm text-foreground">{mission.client_nom || 'Client non spécifié'}</p>
                                                                <Badge variant="outline" className="text-[8px] h-4">{mission.statut_mission}</Badge>
                                                            </div>
                                                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">{mission.type_course}</p>
                                                            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                                                <MapPin className="h-3 w-3 text-primary" />
                                                                {mission.lieu_depart} → {mission.lieu_arrivee}
                                                            </p>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                                                            <div className="space-y-0.5">
                                                                <p className="text-[9px] text-muted-foreground uppercase font-semibold">Total</p>
                                                                <p className="text-xs font-bold text-primary">{mission.montant_total?.toLocaleString()} {mission.devise}</p>
                                                            </div>
                                                            <div className="space-y-0.5 text-right">
                                                                <p className="text-[9px] text-muted-foreground uppercase font-semibold">Payé</p>
                                                                <p className="text-xs font-bold text-status-available">{mission.acompte?.toLocaleString()} {mission.devise}</p>
                                                            </div>
                                                        </div>

                                                        {(mission.solde || 0) > 0 && (
                                                            <div className="pt-1 flex items-center justify-between border-t border-border/50">
                                                                <p className="text-[9px] text-destructive uppercase font-bold tracking-wider">Reste à payer</p>
                                                                <p className="text-xs font-black text-destructive">{mission.solde?.toLocaleString()} {mission.devise}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </TooltipProvider>
        </div>
    );
}
