import { useMemo, useEffect, useState } from 'react';
import { format, startOfDay, addHours, isWithinInterval, addMinutes, differenceInMinutes, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useVehicules } from '@/hooks/useVehicules';
import { useChauffeurs } from '@/hooks/useChauffeurs';
import { useMaintenance } from '@/hooks/useMaintenance';
import { type MissionWithDetails } from '@/hooks/useMissions';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Car, Clock, MapPin, Wrench, AlertTriangle, User, Users } from 'lucide-react';
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
    'Maintenance': 'bg-orange-500/20 text-orange-600 border-orange-500/30 hover:bg-orange-500/30 pattern-diagonal-lines',
};

export function MissionCalendar({ missions, selectedDate, onEdit }: MissionCalendarProps) {
    const { data: vehicules } = useVehicules();
    const { data: chauffeurs } = useChauffeurs();
    const { data: maintenances } = useMaintenance();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [viewType, setViewType] = useState<'vehicule' | 'chauffeur'>('vehicule');

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const startOfSelectedDay = startOfDay(selectedDate);
    const isToday = isSameDay(selectedDate, new Date());

    const resourcesByVehicule = useMemo(() => {
        const map: Record<number, MissionWithDetails[]> = {};
        missions.forEach((m) => {
            if (!map[m.vehicule_id]) map[m.vehicule_id] = [];
            map[m.vehicule_id].push(m);
        });
        return map;
    }, [missions]);

    const resourcesByChauffeur = useMemo(() => {
        const map: Record<number, MissionWithDetails[]> = {};
        missions.forEach((m) => {
            if (!m.chauffeur_id) return;
            if (!map[m.chauffeur_id]) map[m.chauffeur_id] = [];
            map[m.chauffeur_id].push(m);
        });
        return map;
    }, [missions]);

    const maintenancesByResource = useMemo(() => {
        const map: Record<string, any[]> = {}; // Key format: "type_id" e.g., "vehicule_1" or "chauffeur_2"
        maintenances?.forEach((m) => {
            // On ne garde que les maintenances qui chevauchent le jour sélectionné
            const mStart = new Date(m.date_debut || m.date_prevue);
            const mEnd = m.date_fin ? new Date(m.date_fin) : addHours(mStart, 4);
            const dayEnd = addHours(startOfSelectedDay, 24);
            
            if (!(mStart < dayEnd && mEnd > startOfSelectedDay)) return;

            if (m.vehicule_id) {
                const key = `vehicule_${m.vehicule_id}`;
                if (!map[key]) map[key] = [];
                map[key].push(m);
            }
            if (m.chauffeur_id) {
                const key = `chauffeur_${m.chauffeur_id}`;
                if (!map[key]) map[key] = [];
                map[key].push(m);
            }
        });
        return map;
    }, [maintenances, startOfSelectedDay]);

    const getPositionStyle = (startDate: Date, endDate: Date) => {
        const displayStart = startDate < startOfSelectedDay ? startOfSelectedDay : startDate;
        const endOfDaySelected = addHours(startOfSelectedDay, 24);
        const displayEnd = endDate > endOfDaySelected ? endOfDaySelected : endDate;

        const startMinutes = differenceInMinutes(displayStart, startOfSelectedDay);
        const durationMinutes = differenceInMinutes(displayEnd, displayStart);

        const left = (startMinutes / 60) * HOUR_WIDTH;
        const width = (durationMinutes / 60) * HOUR_WIDTH;

        return {
            left: `${left}px`,
            width: `${Math.max(width, 20)}px`,
        };
    };

    const getCurrentTimePosition = () => {
        if (!isToday) return null;
        const minutes = differenceInMinutes(currentTime, startOfSelectedDay);
        return (minutes / 60) * HOUR_WIDTH;
    };

    const currentTimePos = getCurrentTimePosition();
    
    const items = viewType === 'vehicule' ? vehicules : chauffeurs;
    const missionsMap = viewType === 'vehicule' ? resourcesByVehicule : resourcesByChauffeur;

    return (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                    {viewType === 'vehicule' ? <Car className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                    Vue par {viewType === 'vehicule' ? 'Véhicules' : 'Chauffeurs'}
                </h3>
                <div className="flex items-center gap-1 bg-background border border-border p-1 rounded-lg">
                    <button
                        onClick={() => setViewType('vehicule')}
                        className={cn(
                            "px-3 py-1 rounded-md text-xs font-medium transition-all",
                            viewType === 'vehicule' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent"
                        )}
                    >
                        Véhicules
                    </button>
                    <button
                        onClick={() => setViewType('chauffeur')}
                        className={cn(
                            "px-3 py-1 rounded-md text-xs font-medium transition-all",
                            viewType === 'chauffeur' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent"
                        )}
                    >
                        Chauffeurs
                    </button>
                </div>
            </div>

            <TooltipProvider>
                <ScrollArea className="w-full">
                    <div className="min-w-max relative">
                        {/* Header: Hours */}
                        <div className="flex border-b border-border bg-muted/30 sticky top-0 z-20">
                            <div className="w-56 flex-shrink-0 border-r border-border p-4 font-semibold text-sm flex items-center gap-2 bg-muted/30 backdrop-blur-sm">
                                {viewType === 'vehicule' ? <Car className="h-4 w-4" /> : <User className="h-4 w-4" />}
                                {viewType === 'vehicule' ? 'Véhicule' : 'Chauffeur'}
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

                        {/* Current Time Indicator Line */}
                        {currentTimePos !== null && (
                            <div 
                                className="absolute top-0 bottom-0 w-px bg-red-500 z-30 pointer-events-none"
                                style={{ left: `${currentTimePos + 224}px` }} // 224 is w-56
                            >
                                <div className="absolute top-0 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500" />
                            </div>
                        )}

                        {/* Rows */}
                        <div className="divide-y divide-border">
                            {items?.map((item: any) => {
                                const itemId = viewType === 'vehicule' ? item.vehicule_id : item.chauffeur_id;
                                const itemMissions = missionsMap[itemId] || [];
                                const itemMaintenances = maintenancesByResource[`${viewType}_${itemId}`] || [];

                                return (
                                    <div key={itemId} className="flex group hover:bg-accent/5">
                                        <div className="w-56 flex-shrink-0 border-r border-border p-4 bg-card z-10">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-sm text-foreground truncate max-w-[120px]">
                                                    {viewType === 'vehicule' ? item.immatriculation : `${item.prenom} ${item.nom}`}
                                                </span>
                                                <Badge 
                                                    variant="outline" 
                                                    className={cn(
                                                        "text-[9px] px-1 h-4",
                                                        (item.statut === 'Libre' || item.disponibilite === 'Disponible') ? "border-green-500/50 text-green-600" :
                                                        (item.statut === 'En mission' || item.disponibilite === 'Occupé' || item.disponibilite === 'Indisponible') ? "border-blue-500/50 text-blue-600" :
                                                        "border-orange-500/50 text-orange-600"
                                                    )}
                                                >
                                                    {viewType === 'vehicule' ? item.statut : item.disponibilite}
                                                </Badge>
                                            </div>
                                            <div className="text-[10px] text-muted-foreground truncate">
                                                {viewType === 'vehicule' ? `${item.marque} ${item.modele}` : item.tel}
                                            </div>
                                        </div>
                                        <div className="relative h-24 flex-1">
                                            {/* Hour grid lines */}
                                            <div className="absolute inset-0 flex pointer-events-none">
                                                {HOURS.map((hour) => (
                                                    <div
                                                        key={hour}
                                                        className="border-r border-border/10 h-full"
                                                        style={{ width: `${HOUR_WIDTH}px` }}
                                                    />
                                                ))}
                                            </div>

                                            {/* Maintenances/Indisponibilités */}
                                            {itemMaintenances.map((m: any) => {
                                                const mStart = new Date(m.date_debut || m.date_prevue);
                                                const mEnd = m.date_fin ? new Date(m.date_fin) : addHours(mStart, 4);
                                                
                                                return (
                                                    <Tooltip key={`maint-${m.maintenance_id}`}>
                                                        <TooltipTrigger asChild>
                                                            <div
                                                                className={cn(
                                                                    "absolute top-2 h-20 rounded-lg border-2 border-dashed p-2 flex flex-col items-center justify-center z-10 opacity-60 bg-orange-100/50 border-orange-300",
                                                                    "bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(249,115,22,0.1)_10px,rgba(249,115,22,0.1)_20px)]"
                                                                )}
                                                                style={getPositionStyle(mStart, mEnd)}
                                                            >
                                                                <Wrench className="h-4 w-4 text-orange-600 mb-1" />
                                                                <span className="text-[8px] font-bold text-orange-700 uppercase">
                                                                    {viewType === 'vehicule' ? 'Maintenance' : 'Indisponible'}
                                                                </span>
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <div className="p-2 space-y-1">
                                                                <p className="font-bold text-orange-600 flex items-center gap-1">
                                                                    <Wrench className="h-3 w-3" /> {viewType === 'vehicule' ? 'Entretien / Réparation' : 'Indisponibilité'}
                                                                </p>
                                                                <p className="text-xs">{m.type_maintenance || 'Raison non spécifiée'}</p>
                                                                <p className="text-[10px] text-muted-foreground">
                                                                    {format(mStart, 'HH:mm')} - {format(mEnd, 'HH:mm')}
                                                                </p>
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                );
                                            })}

                                            {/* Missions */}
                                            {itemMissions.map((mission: MissionWithDetails) => (
                                                <Tooltip key={mission.mission_id}>
                                                    <TooltipTrigger asChild>
                                                        <div
                                                            onClick={() => onEdit(mission)}
                                                            className={cn(
                                                                "absolute top-6 h-12 rounded-lg border p-2 cursor-pointer transition-all shadow-md flex flex-col justify-center overflow-hidden z-20 hover:scale-[1.02] hover:shadow-lg",
                                                                statusColors[mission.statut_mission] || statusColors['Planifiée']
                                                            )}
                                                            style={getPositionStyle(new Date(mission.date_depart_prevue), new Date(mission.date_arrivee_prevue))}
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
                                                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                                                                    {viewType === 'vehicule' ? 
                                                                        `Chauffeur: ${mission.chauffeur?.prenom} ${mission.chauffeur?.nom}` : 
                                                                        `Véhicule: ${mission.vehicule?.immatriculation}`
                                                                    }
                                                                </p>
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
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </TooltipProvider>
        </div>
    );
}
