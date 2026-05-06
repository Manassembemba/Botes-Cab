import { useMissions, useDeleteMission, useUpdateMission, type MissionWithDetails, type Mission } from '@/hooks/useMissions';
import { useChauffeurs } from '@/hooks/useChauffeurs';
import { useVehicules } from '@/hooks/useVehicules';
import { MissionFormDialog } from '@/components/missions/MissionFormDialog';
import { MissionPaymentDialog } from '@/components/missions/MissionPaymentDialog';
import { MissionCompletionDialog } from '@/components/missions/MissionCompletionDialog';
import { ClientFormDialog } from '@/components/clients/ClientFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Plus, Search, Calendar, MapPin, Car, ChevronLeft, ChevronRight, Pencil, Trash2, LayoutList, CalendarDays, DollarSign, Play, CheckCircle, Copy, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { MissionCalendar } from '@/components/missions/MissionCalendar';
import { startOfDay, endOfDay, isWithinInterval, isToday as isDateToday } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { StatusBadge } from '@/components/ui/StatusBadge';
import { useState } from 'react';

const statusFilters = [
  { label: 'Toutes', value: 'all' },
  { label: 'Planifiées', value: 'Planifiée' },
  { label: 'En cours', value: 'En cours' },
  { label: 'Terminées', value: 'Terminée' },
  { label: 'Annulées', value: 'Annulée' },
];

export default function Missions() {
  const { data: missions, isLoading, error } = useMissions();
  const deleteMutation = useDeleteMission();
  const updateMutation = useUpdateMission();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [chauffeurFilter, setChauffeurFilter] = useState('all');
  const [vehiculeFilter, setVehiculeFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAllDates, setShowAllDates] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'planning'>('planning');
  const [formOpen, setFormOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [missionToDelete, setMissionToDelete] = useState<MissionWithDetails | null>(null);

  // States pour le paiement
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [missionToPay, setMissionToPay] = useState<MissionWithDetails | null>(null);

  // States pour la clôture
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [missionToComplete, setMissionToComplete] = useState<MissionWithDetails | null>(null);

  // States pour le dialogue client
  const [clientFormOpen, setClientFormOpen] = useState(false);

  const { data: chauffeurs } = useChauffeurs();
  const { data: vehicules } = useVehicules();

  const filteredMissions = missions?.filter((mission) => {
    // 1. Filtre Recherche (Priorité absolue)
    if (searchQuery) {
      const matchesSearch =
        mission.lieu_depart.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mission.lieu_arrivee.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (mission.client_nom?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesStatus = statusFilter === 'all' || mission.statut_mission === statusFilter;
      return matchesSearch && matchesStatus;
    }

    // 2. Filtres Dropdown
    const matchesStatusFilter = statusFilter === 'all' || mission.statut_mission === statusFilter;
    if (!matchesStatusFilter) return false;

    const matchesChauffeurFilter = chauffeurFilter === 'all' || mission.chauffeur_id?.toString() === chauffeurFilter;
    if (!matchesChauffeurFilter) return false;

    const matchesVehiculeFilter = vehiculeFilter === 'all' || mission.vehicule_id?.toString() === vehiculeFilter;
    if (!matchesVehiculeFilter) return false;

    // 3. Logique de Date & Visibilité "Intelligente"
    // Si la mission est 'En cours' ou 'Planifiée', on l'affiche TOUJOURS en vue Liste par défaut
    const isActiveMission = ['En cours', 'Planifiée'].includes(mission.statut_mission);

    if (showAllDates) return true;

    if (isActiveMission && viewMode === 'list') {
      return true; // Bypass la date pour les missions actives
    }

    // Pour les autres (Terminée/Annulée), on filtre par date sélectionnée
    const missionDate = new Date(mission.date_depart_prevue);
    const dayStart = startOfDay(selectedDate);
    const dayEnd = endOfDay(selectedDate);

    const matchesDate = isWithinInterval(missionDate, { start: dayStart, end: dayEnd });

    return matchesDate;
  }) || [];

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
  };

  const handleEdit = (mission: MissionWithDetails) => {
    setEditingMission(mission);
    setFormOpen(true);
  };

  const handleDuplicate = (mission: MissionWithDetails) => {
    // Créer une copie de la mission sans l'ID et avec le statut planifié
    const duplicatedMission = {
      ...mission,
      mission_id: undefined,
      statut_mission: 'Planifiée',
      acompte: 0,
      solde: mission.montant_total,
      created_at: undefined,
      updated_at: undefined
    } as any;
    
    setEditingMission(duplicatedMission);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!missionToDelete) return;
    try {
      await deleteMutation.mutateAsync(missionToDelete.mission_id);
      toast({ title: 'Mission supprimée avec succès' });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer cette mission',
        variant: 'destructive'
      });
    }
    setDeleteDialogOpen(false);
    setMissionToDelete(null);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditingMission(null);
  };

  const handleStatusChange = async (mission: Mission, newStatus: string) => {
    try {
      await updateMutation.mutateAsync({
        id: mission.mission_id,
        statut_mission: newStatus
      });
      toast({
        title: "Statut mis à jour",
        description: `La mission est maintenant ${newStatus.toLowerCase()}`
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Erreur lors du chargement des missions</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planification des Missions</h1>
          <p className="text-muted-foreground mt-1">{missions?.length || 0} missions programmées</p>
        </div>
        <Button className="gap-2" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Nouvelle Mission
        </Button>
      </div>

      {/* Date Navigation */}
      <div className="flex flex-col lg:flex-row items-center gap-4 p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between w-full lg:w-auto gap-4">
          <button
            onClick={() => navigateDate('prev')}
            disabled={showAllDates}
            className={cn("p-2 rounded-lg transition-colors", showAllDates ? "opacity-30 cursor-not-allowed" : "hover:bg-accent")}
          >
            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          
          <Popover>
            <PopoverTrigger asChild>
              <button
                disabled={showAllDates}
                className={cn(
                  "flex items-center gap-3 min-w-[200px] justify-center px-4 py-1 rounded-lg transition-colors",
                  showAllDates ? "opacity-50 cursor-not-allowed" : "hover:bg-accent/50"
                )}
              >
                <Calendar className={cn("h-5 w-5", showAllDates ? "text-muted-foreground" : "text-primary")} />
                <span className={cn("text-lg font-semibold capitalize", showAllDates ? "text-muted-foreground line-through" : "text-foreground")}>
                  {formatDate(selectedDate)}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <button
            onClick={() => navigateDate('next')}
            disabled={showAllDates}
            className={cn("p-2 rounded-lg transition-colors", showAllDates ? "opacity-30 cursor-not-allowed" : "hover:bg-accent")}
          >
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
          
          {!isDateToday(selectedDate) && !showAllDates && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date())}
              className="text-xs h-8 px-3 ml-2 border-primary/20 text-primary hover:bg-primary/5"
            >
              Aujourd'hui
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap lg:ml-auto">
          {/* Filtres Rapides */}
          <div className="flex items-center gap-2 border-l border-border pl-4 mr-4 hidden xl:flex">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            
            <Select value={chauffeurFilter} onValueChange={setChauffeurFilter}>
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <SelectValue placeholder="Chauffeur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les chauffeurs</SelectItem>
                {chauffeurs?.map(c => (
                  <SelectItem key={c.chauffeur_id} value={c.chauffeur_id.toString()}>
                    {c.prenom} {c.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={vehiculeFilter} onValueChange={setVehiculeFilter}>
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <SelectValue placeholder="Véhicule" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les véhicules</SelectItem>
                {vehicules?.map(v => (
                  <SelectItem key={v.vehicule_id} value={v.vehicule_id.toString()}>
                    {v.immatriculation}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant={showAllDates ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAllDates(!showAllDates)}
            className="gap-2 h-8"
          >
            <CalendarDays className="h-4 w-4" />
            {showAllDates ? "Masquer archives" : "Voir archives"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher par lieu ou client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                statusFilter === filter.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 border border-border rounded-lg p-1 bg-card">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              viewMode === 'list'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            <LayoutList className="h-4 w-4" />
            <span className="hidden sm:inline">Liste</span>
          </button>
          <button
            onClick={() => setViewMode('planning')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              viewMode === 'planning'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">Planning</span>
          </button>
        </div>
      </div>

      {/* Content View */}
      {viewMode === 'planning' ? (
        <MissionCalendar
          missions={filteredMissions}
          selectedDate={selectedDate}
          onEdit={handleEdit}
        />
      ) : (
        /* Missions List */
        <div className="space-y-3">
          {filteredMissions.map((mission, index) => {
            const startTime = new Date(mission.date_depart_prevue);
            const endTime = new Date(mission.date_arrivee_prevue);

            return (
              <div
                key={mission.mission_id}
                className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 hover:shadow-lg transition-all animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Time Block */}
                  <div className="flex items-center gap-4 lg:w-48">
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-bold text-foreground">
                        {startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded mt-0.5 uppercase tracking-wider">
                        {startTime.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).replace('.', '')}
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-1">
                        → {endTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Mission Details */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 flex-wrap">
                        {mission.client_nom && (
                          <h3 className="font-semibold text-base text-foreground">{mission.client_nom}</h3>
                        )}
                        <StatusBadge status={mission.statut_mission} className="text-[10px]" />
                        {mission.type_course && (
                          <Badge variant="secondary" className="text-[10px] bg-muted/50 text-muted-foreground border-none">
                            {mission.type_course}
                          </Badge>
                        )}
                      </div>

                      {mission.created_at && (
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1 bg-muted/30 px-2 py-0.5 rounded-full border border-border/50">
                          <span className="font-medium opacity-70">Créée le:</span>
                          <span className="font-semibold">
                            {new Date(mission.created_at).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 flex-shrink-0 text-primary" />
                        <span className="font-medium">{mission.lieu_depart}</span>
                        <span className="text-primary font-bold">→</span>
                        <span className="font-medium">{mission.lieu_arrivee}</span>
                      </div>

                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/5 border border-primary/10">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">Total:</span>
                          <span className="text-xs font-bold text-primary">
                            {mission.montant_total?.toLocaleString()} {mission.devise}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-status-available/5 border border-status-available/10">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">Payé:</span>
                          <span className="text-xs font-bold text-status-available">
                            {mission.acompte?.toLocaleString()} {mission.devise}
                          </span>
                        </div>
                        {(mission.solde || 0) > 0 && (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-destructive/5 border border-destructive/10">
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Reste:</span>
                            <span className="text-xs font-bold text-destructive">
                              {mission.solde?.toLocaleString()} {mission.devise}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Assignment */}
                  <div className="flex items-center gap-4 lg:w-auto">
                    {/* Actions de Statut */}
                    {mission.statut_mission === 'Planifiée' && (
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                        onClick={() => handleStatusChange(mission, 'En cours')}
                      >
                        <Play className="h-4 w-4 fill-current" />
                        Démarrer
                      </Button>
                    )}

                    {mission.statut_mission === 'En cours' && (
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
                        onClick={() => {
                          setMissionToComplete(mission);
                          setCompletionDialogOpen(true);
                        }}
                      >
                        <CheckCircle className="h-4 w-4" />
                        Terminer
                      </Button>
                    )}

                    {/* Bouton Payer Solde */}
                    {(mission.solde || 0) > 0 && (
                      <Button
                        size="sm"
                        className="bg-destructive hover:bg-destructive/90 text-white gap-1 animate-pulse"
                        onClick={() => {
                          setMissionToPay(mission);
                          setPaymentDialogOpen(true);
                        }}
                      >
                        <DollarSign className="h-4 w-4" />
                        Payer
                      </Button>
                    )}

                    {mission.chauffeur && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hidden md:flex">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {mission.chauffeur.prenom[0]}{mission.chauffeur.nom[0]}
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {mission.chauffeur.prenom} {mission.chauffeur.nom[0]}.
                        </span>
                      </div>
                    )}

                    {mission.vehicule && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hidden md:flex">
                        <Car className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">{mission.vehicule.immatriculation}</span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => handleDuplicate(mission)}>
                              <Copy className="h-4 w-4 text-blue-500" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Dupliquer cette mission</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <Button variant="ghost" size="sm" onClick={() => handleEdit(mission)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setMissionToDelete(mission);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredMissions.length === 0 && (
        <div className="text-center py-12 rounded-xl border border-dashed border-border">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Aucune mission pour cette période</p>
          <Button variant="outline" className="mt-4" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Créer une mission
          </Button>
        </div>
      )}

      <MissionFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        mission={editingMission}
        onOpenClientForm={() => setClientFormOpen(true)}
      />
      <ClientFormDialog
        open={clientFormOpen}
        onOpenChange={setClientFormOpen}
        client={null}
        onClientCreated={(newClient) => {
          // Mettre à jour le formulaire de mission avec le nouveau client
          // Cette logique sera gérée dans le composant MissionFormDialog
          setClientFormOpen(false);
        }}
      />

      <MissionPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        mission={missionToPay}
      />

      <MissionCompletionDialog
        open={completionDialogOpen}
        onOpenChange={setCompletionDialogOpen}
        mission={missionToComplete}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette mission de {missionToDelete?.lieu_depart} vers {missionToDelete?.lieu_arrivee} ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
