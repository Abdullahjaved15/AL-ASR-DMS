import React, { useState, useEffect } from 'react';
import { Download, Monitor, Smartphone, Check, X, Sparkles, ExternalLink } from 'lucide-react';

export default function InstallAppButton({ variant = 'header' }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsInstalled(true);
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowGuideModal(false);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Show instructional guide modal for desktop/mobile browsers
      setShowGuideModal(true);
    }
  };

  if (isInstalled) {
    return null; // App is already installed and running as standalone
  }

  return (
    <>
      {variant === 'sidebar' ? (
        <button
          type="button"
          onClick={handleInstall}
          className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-teal-500/10 border border-cyan-500/20 hover:border-cyan-500/40 text-cyan-300 hover:text-white font-mono text-xs font-bold transition-all shadow-sm group"
        >
          <div className="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
            <Download className="w-3.5 h-3.5" />
          </div>
          <div className="text-left flex-1">
            <p className="leading-tight">Install App</p>
            <p className="text-[10px] text-slate-400 font-normal">Desktop & Mobile Icon</p>
          </div>
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleInstall}
          className="px-3 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-300 hover:text-white border border-cyan-500/30 rounded-xl text-xs font-mono font-bold transition-all flex items-center space-x-1.5 shadow-sm"
          title="Install AL ASR Motors as a Desktop / Mobile Application"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400 animate-bounce" />
          <span className="hidden sm:inline">Install App</span>
        </button>
      )}

      {/* Instructional Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-lg border border-white/10 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center space-x-3">
                <img src="/logo.png" alt="AL ASR Logo" className="w-10 h-10 object-contain filter drop-shadow-md" />
                <div>
                  <h3 className="text-base font-bold text-white">Install AL ASR Motors App</h3>
                  <p className="text-xs text-slate-400 font-mono">Create Desktop & Mobile Shortcut with Logo</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 my-2 text-xs font-mono text-slate-300">
              {/* Desktop Instruction */}
              <div className="bg-slate-900/80 rounded-2xl p-4 border border-white/5 space-y-2">
                <div className="flex items-center space-x-2 text-cyan-400 font-bold">
                  <Monitor className="w-4 h-4" />
                  <span>On Desktop (Chrome, Edge, Brave):</span>
                </div>
                <ul className="list-disc list-inside space-y-1.5 text-slate-300 pl-1">
                  <li>
                    Look at the right side of your browser address/URL bar for the <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded border border-white/10">⊕ Install</strong> or <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded border border-white/10">App Available</strong> icon.
                  </li>
                  <li>
                    Or click browser menu <strong className="text-white">(⋮)</strong> &rarr; <strong className="text-cyan-300">"Install AL ASR Motors"</strong> / <strong className="text-cyan-300">"Save and Share &rarr; Create Shortcut"</strong> (check <em>Open as window</em>).
                  </li>
                  <li>
                    This will create a desktop icon with the official <strong>AL ASR Motors logo</strong>.
                  </li>
                </ul>
              </div>

              {/* Mobile Instruction */}
              <div className="bg-slate-900/80 rounded-2xl p-4 border border-white/5 space-y-2">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                  <Smartphone className="w-4 h-4" />
                  <span>On Mobile (Android / iOS):</span>
                </div>
                <ul className="list-disc list-inside space-y-1.5 text-slate-300 pl-1">
                  <li>
                    <strong>Android Chrome:</strong> Tap menu <strong className="text-white">(⋮)</strong> &rarr; <strong className="text-emerald-300">"Add to Home screen"</strong> or <strong className="text-emerald-300">"Install app"</strong>.
                  </li>
                  <li>
                    <strong>iPhone Safari:</strong> Tap the <strong className="text-white">Share</strong> button (box with arrow) &rarr; scroll down and tap <strong className="text-emerald-300">"Add to Home Screen"</strong>.
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold font-mono text-xs rounded-xl transition-all"
              >
                Got It, Thanks!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
