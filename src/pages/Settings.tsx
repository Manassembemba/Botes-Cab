import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { User, Bell, Shield, Building, Save } from 'lucide-react';

export default function Settings() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
        <p className="text-muted-foreground mt-1">Configurez votre application Botes CAB</p>
      </div>

      {/* Profile Settings */}
      <div className="rounded-xl border border-border bg-card p-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-lg bg-primary/10 p-2">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Profil Utilisateur</h2>
            <p className="text-sm text-muted-foreground">Gérez vos informations personnelles</p>
          </div>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nom complet</Label>
            <Input id="name" defaultValue="Admin Flotte" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" defaultValue="admin@botescab.fr" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input id="phone" type="tel" defaultValue="+33 1 23 45 67 89" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Rôle</Label>
            <Input id="role" defaultValue="Administrateur" disabled />
          </div>
        </div>
      </div>

      {/* Company Settings */}
      <div className="rounded-xl border border-border bg-card p-6 animate-fade-in" style={{ animationDelay: '50ms' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-lg bg-primary/10 p-2">
            <Building className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Entreprise</h2>
            <p className="text-sm text-muted-foreground">Paramètres de l'entreprise</p>
          </div>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="company">Nom de l'entreprise</Label>
            <Input id="company" defaultValue="Botes CAB" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="siret">SIRET</Label>
            <Input id="siret" defaultValue="123 456 789 00012" />
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="rounded-xl border border-border bg-card p-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-lg bg-primary/10 p-2">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Notifications</h2>
            <p className="text-sm text-muted-foreground">Configurez vos alertes</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Alertes de maintenance</p>
              <p className="text-sm text-muted-foreground">Notification avant échéance maintenance</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Expiration documents</p>
              <p className="text-sm text-muted-foreground">30 jours avant expiration</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Notifications par email</p>
              <p className="text-sm text-muted-foreground">Recevoir les alertes par email</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Notifications SMS</p>
              <p className="text-sm text-muted-foreground">Recevoir les alertes critiques par SMS</p>
            </div>
            <Switch />
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="rounded-xl border border-border bg-card p-6 animate-fade-in" style={{ animationDelay: '150ms' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-lg bg-primary/10 p-2">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Sécurité</h2>
            <p className="text-sm text-muted-foreground">Paramètres de sécurité du compte</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Authentification à deux facteurs</p>
              <p className="text-sm text-muted-foreground">Sécurité renforcée pour votre compte</p>
            </div>
            <Switch />
          </div>
          <Button variant="outline">Changer le mot de passe</Button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button className="gap-2">
          <Save className="h-4 w-4" />
          Enregistrer les modifications
        </Button>
      </div>
    </div>
  );
}
