import { useState } from 'react';
import { useChauffeurs } from '@/hooks/useChauffeurs';
import { usePresences, useMonthlyPresences, useUpsertPresence, type Presence } from '@/hooks/usePresences';
import { format, startOfDay, getDaysInMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, FileDown, CheckCircle2, UserCheck, Car, Loader2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { exportPresencesToPDF, exportMonthlyPresencesToPDF } from '@/services/exportService';

export function PresenceCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const { data: chauffeurs, isLoading: loadingChauffeurs } = useChauffeurs();
  const { data: presences, isLoading: loadingPresences } = usePresences(selectedDate);
  const { data: monthlyData, isLoading: loadingMonthly } = useMonthlyPresences(
    selectedDate.getFullYear(),
    selectedDate.getMonth() + 1
  );
  
  const upsertPresence = useUpsertPresence();
  const { toast } = useToast();

  const totalPresent = presences?.filter(p => p.est_present).length || 0;
  const totalEnCourse = presences?.filter(p => p.en_course).length || 0;
  const totalChauffeurs = chauffeurs?.length || 0;

  const handleExportPDF = () => {
    if (!chauffeurs) return;

    const exportData = chauffeurs.map(c => {
      const presence = presences?.find(p => p.chauffeur_id === c.chauffeur_id);
      return {
        chauffeur: `${c.prenom} ${c.nom}`,
        tel: c.tel || '-',
        present: presence?.est_present ? 'OUI' : 'NON',
        course: presence?.en_course ? 'OUI' : 'NON',
      };
    });

    exportPresencesToPDF(exportData, selectedDate, {
      totalPresent,
      totalEnCourse,
      totalChauffeurs
    });

    toast({
      title: 'PDF Journalier Généré',
      description: `Le rapport pour le ${format(selectedDate, 'dd/MM/yyyy')} a été téléchargé.`,
    });
  };

  const handleExportMonthlyPDF = () => {
    if (!chauffeurs || !monthlyData) return;

    const daysInMonth = getDaysInMonth(selectedDate);
    const exportData = chauffeurs.map(c => {
      const driverPresences = monthlyData.filter(p => p.chauffeur_id === c.chauffeur_id);
      const presentCount = driverPresences.filter(p => p.est_present).length;
      const courseCount = driverPresences.filter(p => p.en_course).length;
      
      return {
        chauffeur: `${c.prenom} ${c.nom}`,
        totalPresent: presentCount,
        totalCourse: courseCount,
        tauxPresence: ((presentCount / daysInMonth) * 100).toFixed(1),
      };
    });

    exportMonthlyPresencesToPDF(
      exportData,
      selectedDate.getFullYear(),
      selectedDate.getMonth() + 1,
      daysInMonth
    );

    toast({
      title: 'Rapport Mensuel Généré',
      description: `Le rapport consolidé de ${format(selectedDate, 'MMMM yyyy', { locale: fr })} a été téléchargé.`,
    });
  };

  const handleToggle = async (chauffeurId: number, field: 'est_present' | 'en_course', value: boolean) => {
    const existingPresence = presences?.find(p => p.chauffeur_id === chauffeurId);
    
    try {
      await upsertPresence.mutateAsync({
        chauffeur_id: chauffeurId,
        date_presence: format(selectedDate, 'yyyy-MM-dd'),
        est_present: field === 'est_present' ? value : (existingPresence?.est_present ?? false),
        en_course: field === 'en_course' ? value : (existingPresence?.en_course ?? false),
      });
      // toast({ title: 'Mise à jour réussie' });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la présence',
        variant: 'destructive'
      });
    }
  };

  if (loadingChauffeurs || loadingPresences) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600 flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Chauffeurs Présents
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-emerald-700">{totalPresent} / {totalChauffeurs}</div>
            <p className="text-xs text-emerald-600/70 mt-1">Au pointage aujourd'hui</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
              <Car className="h-4 w-4" />
              Sur le terrain (Courses)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-blue-700">{totalEnCourse} / {totalPresent}</div>
            <p className="text-xs text-blue-600/70 mt-1">Sur les chauffeurs présents</p>
          </CardContent>
        </Card>

        <Card className="bg-indigo-500/5 border-indigo-500/20 flex flex-col gap-2 p-4">
          <Button 
            variant="outline"
            className="w-full border-indigo-200 text-indigo-700 hover:bg-indigo-100 gap-2 py-3 h-auto"
            onClick={handleExportPDF}
          >
            <FileDown className="h-4 w-4" />
            PDF Journalier
          </Button>
          <Button 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2 py-3 h-auto"
            onClick={handleExportMonthlyPDF}
            disabled={loadingMonthly}
          >
            {loadingMonthly ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            PDF Mensuel
          </Button>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold">Détails Journaliers</CardTitle>
            <CardDescription>Pointage individuel des chauffeurs</CardDescription>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal border-border",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-indigo-500" />
                {selectedDate ? format(selectedDate, 'PPP', { locale: fr }) : <span>Choisir une date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(startOfDay(date))}
                initialFocus
                locale={fr}
              />
            </PopoverContent>
          </Popover>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 transition-colors">
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Chauffeur</th>
                  <th className="h-10 px-4 text-center align-middle font-medium text-muted-foreground">Présence (Oui/Non)</th>
                  <th className="h-10 px-4 text-center align-middle font-medium text-muted-foreground">En Course (Oui/Non)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {chauffeurs?.map((chauffeur) => {
                  const presence = presences?.find(p => p.chauffeur_id === chauffeur.chauffeur_id);
                  return (
                    <tr key={chauffeur.chauffeur_id} className="hover:bg-accent/30 transition-colors">
                      <td className="p-4 align-middle">
                        <div className="font-semibold text-foreground">{chauffeur.prenom} {chauffeur.nom}</div>
                        <div className="text-xs text-muted-foreground font-medium">{chauffeur.tel || 'Pas de numéro'}</div>
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex items-center justify-center">
                          <div className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all cursor-pointer",
                            presence?.est_present 
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600" 
                              : "bg-muted/50 border-border text-muted-foreground"
                          )}
                          onClick={() => handleToggle(chauffeur.chauffeur_id, 'est_present', !(presence?.est_present))}
                          >
                            <Checkbox 
                              id={`present-${chauffeur.chauffeur_id}`}
                              checked={presence?.est_present ?? false}
                              className="border-current data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                            />
                            <span className="text-xs font-bold uppercase tracking-wider">
                              {presence?.est_present ? 'Oui' : 'Non'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex items-center justify-center">
                          <div className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all cursor-pointer",
                            presence?.en_course 
                              ? "bg-blue-500/10 border-blue-500/30 text-blue-600" 
                              : "bg-muted/50 border-border text-muted-foreground"
                          )}
                          onClick={() => handleToggle(chauffeur.chauffeur_id, 'en_course', !(presence?.en_course))}
                          >
                            <Checkbox 
                              id={`course-${chauffeur.chauffeur_id}`}
                              checked={presence?.en_course ?? false}
                              className="border-current data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                            />
                            <span className="text-xs font-bold uppercase tracking-wider">
                              {presence?.en_course ? 'Oui' : 'Non'}
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
