import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { Bell, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background dark">
      <AppSidebar />
      
      <div className="pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="flex h-full items-center justify-between px-6">
            <div className="flex items-center gap-4 flex-1 max-w-xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Rechercher véhicules, chauffeurs, missions..."
                  className="pl-10 bg-muted border-0"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                  3
                </span>
              </Button>
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
