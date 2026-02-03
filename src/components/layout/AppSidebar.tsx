import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Car,
  Users,
  CalendarClock,
  Wrench,
  BarChart3,
  Settings,
  LogOut,
  Truck,
  RefreshCcw,
  DollarSign,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const navigation = [
  { name: 'Tableau de Bord', href: '/', icon: LayoutDashboard },
  { name: 'Véhicules', href: '/vehicles', icon: Car },
  { name: 'Chauffeurs', href: '/drivers', icon: Users },
  { name: 'Missions', href: '/missions', icon: CalendarClock },
  { name: 'Maintenance', href: '/maintenance', icon: Wrench },
  { name: 'Remboursements', href: '/remboursements', icon: RefreshCcw },
  { name: 'Comptabilité', href: '/accounting', icon: DollarSign },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Rapports', href: '/reports', icon: BarChart3 },
];

const bottomNavigation = [
  { name: 'Paramètres', href: '/settings', icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const userEmail = user?.email ?? '';
  const userInitials = userEmail
    .split('@')[0]
    .slice(0, 2)
    .toUpperCase() || 'US';

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary">
            <Truck className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-primary-foreground">Botes CAB</h1>
            <p className="text-xs text-sidebar-foreground">Fleet Management</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Navigation */}
        <div className="border-t border-sidebar-border px-3 py-4 space-y-1">
          {bottomNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </NavLink>
            );
          })}

          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive transition-all duration-200"
          >
            <LogOut className="h-5 w-5" />
            Déconnexion
          </button>
        </div>

        {/* User Profile */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-sm font-semibold text-sidebar-accent-foreground">{userInitials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-primary-foreground truncate">Utilisateur</p>
              <p className="text-xs text-sidebar-foreground truncate">{userEmail}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
