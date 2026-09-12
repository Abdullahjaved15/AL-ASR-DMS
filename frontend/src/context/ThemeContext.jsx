import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export const PRESET_THEMES = [
  {
    id: 'dark',
    name: 'Midnight Stealth',
    description: 'Deep futuristic navy & electric cyan neon',
    mode: 'dark',
    primary: '#00d1ff',
    secondary: '#3b82f6',
    background: '#051424',
    surface: '#0a1d30',
    card: 'rgba(18, 33, 49, 0.75)',
    border: 'rgba(255, 255, 255, 0.1)',
    text: '#f8fafc',
    textMuted: '#94a3b8',
    previewBadge: 'bg-cyan-500'
  },
  {
    id: 'light',
    name: 'Executive Pearl',
    description: 'Clean crisp light mode with sapphire blue accents',
    mode: 'light',
    primary: '#0284c7',
    secondary: '#2563eb',
    background: '#f1f5f9',
    surface: '#ffffff',
    card: 'rgba(255, 255, 255, 0.92)',
    border: 'rgba(15, 23, 42, 0.12)',
    text: '#0f172a',
    textMuted: '#64748b',
    previewBadge: 'bg-sky-500'
  },
  {
    id: 'emerald',
    name: 'Emerald Prestige',
    description: 'Luxury forest green & vivid emerald accents',
    mode: 'dark',
    primary: '#10b981',
    secondary: '#14b8a6',
    background: '#021a16',
    surface: '#062c26',
    card: 'rgba(9, 44, 38, 0.78)',
    border: 'rgba(52, 211, 153, 0.18)',
    text: '#ecfdf5',
    textMuted: '#a7f3d0',
    previewBadge: 'bg-emerald-500'
  },
  {
    id: 'amethyst',
    name: 'Royal Amethyst',
    description: 'High-end luxury violet & neon purple accents',
    mode: 'dark',
    primary: '#a855f7',
    secondary: '#6366f1',
    background: '#0e0c1f',
    surface: '#171333',
    card: 'rgba(28, 23, 58, 0.78)',
    border: 'rgba(168, 85, 247, 0.22)',
    text: '#faf5ff',
    textMuted: '#c084fc',
    previewBadge: 'bg-purple-500'
  },
  {
    id: 'onyx',
    name: 'Obsidian Gold',
    description: 'Sleek onyx black with presidential warm gold glow',
    mode: 'dark',
    primary: '#eab308',
    secondary: '#f59e0b',
    background: '#09090b',
    surface: '#141417',
    card: 'rgba(24, 24, 27, 0.85)',
    border: 'rgba(234, 179, 8, 0.25)',
    text: '#ffffff',
    textMuted: '#a1a1aa',
    previewBadge: 'bg-amber-400'
  },
  {
    id: 'custom',
    name: 'Custom Palette',
    description: 'Personalized background, surface tint & accent colors',
    mode: 'custom',
    previewBadge: 'bg-gradient-to-r from-rose-500 via-purple-500 to-cyan-500'
  }
];

export const ACCENT_SWATCHES = [
  { name: 'Electric Cyan', color: '#00d1ff' },
  { name: 'Emerald Green', color: '#10b981' },
  { name: 'Presidential Gold', color: '#eab308' },
  { name: 'Royal Purple', color: '#a855f7' },
  { name: 'Rose Quartz', color: '#f43f5e' },
  { name: 'Sunset Orange', color: '#f97316' },
  { name: 'Sapphire Blue', color: '#0284c7' },
  { name: 'Crimson Red', color: '#ef4444' }
];

export const BACKGROUND_SWATCHES = [
  { name: 'Deep Navy', color: '#051424', mode: 'dark' },
  { name: 'Onyx Black', color: '#09090b', mode: 'dark' },
  { name: 'Forest Night', color: '#021a16', mode: 'dark' },
  { name: 'Deep Violet', color: '#0e0c1f', mode: 'dark' },
  { name: 'Slate Charcoal', color: '#0f172a', mode: 'dark' },
  { name: 'Pure White', color: '#f8fafc', mode: 'light' },
  { name: 'Soft Pearl', color: '#f1f5f9', mode: 'light' },
  { name: 'Warm Cream', color: '#fafaf9', mode: 'light' }
];

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  
  // Storage key is scoped per user account
  const getStorageKey = () => (user?.id ? `dms_theme_${user.id}` : 'dms_theme_default');

  const [themeId, setThemeId] = useState('dark');
  const [customConfig, setCustomConfig] = useState({
    mode: 'dark',
    primary: '#00d1ff',
    background: '#051424',
    surface: '#0a1d30',
    card: 'rgba(18, 33, 49, 0.75)',
    text: '#f8fafc'
  });

  // Load user-specific theme on mount or when user changes
  useEffect(() => {
    try {
      const key = getStorageKey();
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.themeId) setThemeId(parsed.themeId);
        if (parsed.customConfig) setCustomConfig(parsed.customConfig);
      } else {
        setThemeId('dark');
      }
    } catch (e) {
      console.warn('Failed to load theme preference:', e);
    }
  }, [user?.id]);

  // Apply theme attributes and CSS variables whenever themeId or customConfig changes
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    let activeTheme = PRESET_THEMES.find(t => t.id === themeId);
    let effectiveMode = activeTheme?.mode || 'dark';
    let primary = activeTheme?.primary || '#00d1ff';
    let background = activeTheme?.background || '#051424';
    let surface = activeTheme?.surface || '#0a1d30';
    let card = activeTheme?.card || 'rgba(18, 33, 49, 0.75)';
    let border = activeTheme?.border || 'rgba(255, 255, 255, 0.1)';
    let text = activeTheme?.text || '#f8fafc';
    let textMuted = activeTheme?.textMuted || '#94a3b8';

    if (themeId === 'custom') {
      effectiveMode = customConfig.mode || 'dark';
      primary = customConfig.primary || '#00d1ff';
      background = customConfig.background || (effectiveMode === 'light' ? '#f1f5f9' : '#051424');
      surface = customConfig.surface || (effectiveMode === 'light' ? '#ffffff' : '#0a1d30');
      card = customConfig.card || (effectiveMode === 'light' ? 'rgba(255, 255, 255, 0.92)' : 'rgba(18, 33, 49, 0.75)');
      border = effectiveMode === 'light' ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.1)';
      text = effectiveMode === 'light' ? '#0f172a' : '#f8fafc';
      textMuted = effectiveMode === 'light' ? '#64748b' : '#94a3b8';
    }

    // Set DOM attributes
    root.setAttribute('data-theme', themeId);
    root.setAttribute('data-mode', effectiveMode);
    body.setAttribute('data-theme', themeId);
    body.setAttribute('data-mode', effectiveMode);

    // Set CSS custom properties
    root.style.setProperty('--app-bg', background);
    root.style.setProperty('--app-surface', surface);
    root.style.setProperty('--app-card-bg', card);
    root.style.setProperty('--app-border', border);
    root.style.setProperty('--app-primary', primary);
    root.style.setProperty('--app-text', text);
    root.style.setProperty('--app-text-muted', textMuted);

    // Save to user localStorage
    try {
      const key = getStorageKey();
      localStorage.setItem(key, JSON.stringify({
        themeId,
        customConfig
      }));
    } catch (e) {
      // quiet fail
    }
  }, [themeId, customConfig, user?.id]);

  const changeTheme = (newThemeId) => {
    setThemeId(newThemeId);
  };

  const updateCustomConfig = (newConfig) => {
    setThemeId('custom');
    setCustomConfig(prev => ({ ...prev, ...newConfig }));
  };

  const resetToDefault = () => {
    setThemeId('dark');
    setCustomConfig({
      mode: 'dark',
      primary: '#00d1ff',
      background: '#051424',
      surface: '#0a1d30',
      card: 'rgba(18, 33, 49, 0.75)',
      text: '#f8fafc'
    });
  };

  return (
    <ThemeContext.Provider value={{
      themeId,
      customConfig,
      themes: PRESET_THEMES,
      changeTheme,
      updateCustomConfig,
      resetToDefault,
      isLightMode: themeId === 'light' || (themeId === 'custom' && customConfig.mode === 'light')
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
