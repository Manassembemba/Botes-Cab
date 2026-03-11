import { useState } from 'react';
import { useClients, useFideliteClients, type ClientWithStats } from '@/hooks/useClients';
import { ClientFormDialog } from '@/components/clients/ClientFormDialog';
import { ClientHistoryCard } from '@/components/clients/ClientHistoryCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, User, Star, Award, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Clients() {
  const { data: clients, isLoading, error } = useClients();
  const { data: clientsFideles } = useFideliteClients();
  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientWithStats | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'fidele'>('all');

  const filteredClients = clients?.filter(client => {
    const matchesSearch = 
      client.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.prenom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.telephone?.includes(searchQuery) ||
      client.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  }) || [];

  const handleEdit = (client: ClientWithStats) => {
    setEditingClient(client);
    setFormOpen(true);
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
        <p className="text-destructive">Erreur lors du chargement des clients</p>
      </div>
    );
  }

  const displayedClients = activeTab === 'fidele' 
    ? clientsFideles || [] 
    : filteredClients;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des Clients</h1>
          <p className="text-muted-foreground mt-1">
            {clients?.length || 0} clients • {clientsFideles?.length || 0} fidèles
          </p>
        </div>
        <Button className="gap-2" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Nouveau Client
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('all')}
          className={cn(
            'flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px',
            activeTab === 'all'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Users className="h-4 w-4" />
          Tous les clients ({clients?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('fidele')}
          className={cn(
            'flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px',
            activeTab === 'fidele'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Award className="h-4 w-4" />
          Clients fidèles ({clientsFideles?.length || 0})
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Rechercher par nom, téléphone ou email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Clients List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {displayedClients.length > 0 ? (
          displayedClients.map((client) => (
            <div 
              key={client.client_id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleEdit(client)}
            >
              <ClientHistoryCard client={client} />
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchQuery 
                ? 'Aucun client trouvé pour cette recherche' 
                : activeTab === 'fidele' 
                  ? 'Aucun client fidèle enregistré' 
                  : 'Aucun client enregistré'}
            </p>
            {activeTab === 'all' && !searchQuery && (
              <Button 
                variant="outline" 
                className="mt-4" 
                onClick={() => setFormOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un client
              </Button>
            )}
          </div>
        )}
      </div>

      <ClientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        client={editingClient}
      />
    </div>
  );
}