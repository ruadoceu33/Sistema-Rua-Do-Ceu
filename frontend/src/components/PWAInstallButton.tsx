import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, Share } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Tipo para o evento beforeinstallprompt
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showButton, setShowButton] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Verifica se o usuário já fechou o botão
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed === 'true') {
      return;
    }

    // Detecta iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // Verifica se já está instalado
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
      return;
    }

    // Mostra o botão
    setShowButton(true);

    // Captura o evento de instalação (Android/Chrome)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      // No iOS, mostra instruções
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) {
      // Se não tiver o prompt, mostra instruções genéricas
      setShowIOSInstructions(true);
      return;
    }

    // Android/Chrome: chama o prompt nativo
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowButton(false);
      localStorage.setItem('pwa-install-dismissed', 'true');
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowButton(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showButton) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleInstallClick}
          className="bg-orange-500 hover:bg-orange-600 text-white border-orange-500 hover:border-orange-600 font-semibold text-xs sm:text-sm h-auto py-2 px-3"
        >
          <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
          Instalar App
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          className="h-6 w-6 sm:h-7 sm:w-7 p-0 hover:bg-muted"
        >
          <X className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      </div>

      {/* Dialog com instruções para iOS */}
      <Dialog open={showIOSInstructions} onOpenChange={setShowIOSInstructions}>
        <DialogContent className="w-full max-w-full sm:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
              <Download className="h-5 w-5 text-orange-500" />
              Instalar App
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base text-left">
              {isIOS ? (
                <div className="space-y-4 pt-4">
                  <p className="font-semibold">Para instalar no iPhone/iPad:</p>
                  <ol className="space-y-3 list-decimal list-inside">
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0">1.</span>
                      <span>
                        Toque no ícone de <strong>Compartilhar</strong>{' '}
                        <Share className="inline h-4 w-4" /> (parte inferior da tela)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0">2.</span>
                      <span>
                        Role para baixo e selecione{' '}
                        <strong>"Adicionar à Tela de Início"</strong>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0">3.</span>
                      <span>Toque em <strong>"Adicionar"</strong></span>
                    </li>
                  </ol>
                  <p className="text-muted-foreground text-sm pt-2">
                    O app ficará disponível na sua tela inicial! ✨
                  </p>
                </div>
              ) : (
                <div className="space-y-4 pt-4">
                  <p>
                    Para instalar este app, use o menu do seu navegador e procure pela opção
                    <strong> "Instalar app"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Cada navegador tem uma localização diferente para esta opção.
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-4">
            <Button
              onClick={() => setShowIOSInstructions(false)}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
