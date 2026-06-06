import { useState, useEffect } from 'react';
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
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/Logo';

const navigationGroups = [
  {
    title: 'Opérations',
    items: [
      { name: 'Tableau de Bord', href: '/', icon: LayoutDashboard },
      { name: 'Missions', href: '/missions', icon: Truck },
      { name: 'Chauffeurs', href: '/drivers', icon: Users },
      { name: 'Véhicules', href: '/vehicles', icon: Car },
    ]
  },
  {
    title: 'Administration',
    items: [
      { name: 'Clients', href: '/clients', icon: Users },
      { name: 'Maintenance', href: '/maintenance', icon: Wrench },
      { name: 'Documents', href: '/documents', icon: FileText },
    ]
  },
  {
    title: 'Finance',
    items: [
      { name: 'Comptabilité', href: '/accounting', icon: DollarSign },
      { name: 'Remboursements', href: '/remboursements', icon: RefreshCcw },
      { name: 'Rapports', href: '/reports', icon: BarChart3 },
    ]
  }
];

const bottomNavigation = [
  { name: 'Paramètres', href: '/settings', icon: Settings },
];

export function AppSidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  // Fermer le menu mobile quand la taille de l'écran change
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) { // lg breakpoint
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Sidebar Overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 ease-in-out lg:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-20 items-center px-6 border-b border-sidebar-border bg-background/50 backdrop-blur-sm">
            <Logo />
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
            {navigationGroups.map((group) => (
              <div key={group.title} className="mb-6 last:mb-0">
                <h3 className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/40">
                  {group.title}
                </h3>
                <nav className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <NavLink
                        key={item.name}
                        to={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 group',
                          isActive
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/20'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        )}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <item.icon className={cn(
                          "h-4 w-4 transition-transform duration-200 group-hover:scale-110",
                          isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground"
                        )} />
                        {item.name}
                      </NavLink>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>

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
                  onClick={() => setIsMobileMenuOpen(false)} // Fermer le menu mobile après clic
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </NavLink>
              );
            })}

            <button
              onClick={() => {
                handleSignOut();
                setIsMobileMenuOpen(false); // Fermer le menu mobile après déconnexion
              }}
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
    </>
  );
}
