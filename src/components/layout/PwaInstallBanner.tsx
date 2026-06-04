import { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 1. Vérifier si l'application tourne déjà en mode autonome (PWA installée)
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches 
      // @ts-ignore
      || window.navigator.standalone 
      || document.referrer.includes('android-app://');
    
    setIsStandalone(checkStandalone);

    if (checkStandalone) return;

    // 2. Détecter l'événement standard beforeinstallprompt (Chromium)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 3. Détecter si on est sur iOS (pour afficher l'aide alternative)
    const ua = window.navigator.userAgent;
    const ios = !!ua.match(/iPad|iPhone|iPod/i) && !ua.match(/CriOS/i); // iOS Safari principal
    setIsIos(ios);

    // Sur iOS Safari, on affiche l'aide si non autonome et première fois
    if (ios && !checkStandalone) {
      const iosBannerDismissed = localStorage.getItem('pwa-ios-dismissed');
      if (!iosBannerDismissed) {
        setIsVisible(true);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Déclencher le prompt d'installation natif
    deferredPrompt.prompt();

    // Attendre la réponse de l'utilisateur
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to installation: ${outcome}`);

    // Nettoyer l'événement stocké
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    if (isIos) {
      // Pour éviter de harceler l'utilisateur sur iOS
      localStorage.setItem('pwa-ios-dismissed', 'true');
    }
  };

  // Si autonome (installée) ou non visible, on ne rend rien
  if (isStandalone || !isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:max-w-md animate-in slide-in-from-bottom-5 duration-300">
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-background/95 p-4 shadow-xl backdrop-blur-md dark:bg-slate-900/95">
        {/* Glow effect */}
        <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-primary/10 blur-xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 h-24 w-24 rounded-full bg-cyan-500/10 blur-xl pointer-events-none" />

        <button 
          onClick={handleDismiss}
          className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex gap-3 pr-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Download className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-sm text-foreground">Botes CAB sur votre écran</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Installez l'application pour une expérience plus rapide, un mode plein écran et un accès direct.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={handleDismiss}>
            Plus tard
          </Button>

          {isIos ? (
            <div className="flex items-center gap-1 text-xs text-primary font-medium bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
              <Share className="h-3.5 w-3.5 mr-0.5" />
              <span>Appuyez sur "Partager" puis "Sur l'écran d'accueil"</span>
            </div>
          ) : (
            <Button size="sm" onClick={handleInstallClick} className="gap-1.5 font-semibold">
              <Download className="h-4 w-4" />
              Installer
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
