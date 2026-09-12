import React, { useState, useEffect } from 'react';
import { 
  User, 
  Phone, 
  Lock, 
  Save, 
  Shield, 
  Briefcase, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Palette, 
  Sun, 
  Moon, 
  Check, 
  RotateCcw, 
  Sliders, 
  Layers, 
  Smartphone,
  Paintbrush
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme, PRESET_THEMES, ACCENT_SWATCHES, BACKGROUND_SWATCHES } from '../context/ThemeContext';
import { api } from '../services/api';

export default function Settings() {
  const { user, setUser, isAdmin } = useAuth();
  const { 
    themeId, 
    customConfig, 
    themes, 
    changeTheme, 
    updateCustomConfig, 
    resetToDefault,
    isLightMode 
  } = useTheme();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '03000000000',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [themeSuccessMsg, setThemeSuccessMsg] = useState('');

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        phone: user.phone || '03000000000'
      }));
    }
  }, [user]);

  // Client-side phone sanitizer display helper
  const handlePhoneChange = (val) => {
    let digits = val.replace(/[^\d]/g, '');
    if (digits.startsWith('0092')) digits = digits.slice(4);
    else if (digits.startsWith('92') && digits.length >= 11) digits = digits.slice(2);
    if (!digits.startsWith('0') && digits.length === 10 && digits.startsWith('3')) digits = '0' + digits;
    
    setFormData(prev => ({ ...prev, phone: digits }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (formData.newPassword) {
      if (!formData.currentPassword) {
        setErrorMsg('Please enter your current password to update password.');
        return;
      }
      if (formData.newPassword.length < 6) {
        setErrorMsg('New password must be at least 6 characters long.');
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setErrorMsg('New password and confirm password do not match.');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        phone: formData.phone
      };

      if (formData.newPassword) {
        payload.currentPassword = formData.currentPassword;
        payload.newPassword = formData.newPassword;
      }

      const res = await api.updateProfile(payload);

      // Update AuthContext user
      if (res.user) {
        setUser(prev => ({ ...prev, ...res.user }));
      }

      setSuccessMsg('Account settings updated successfully!');
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update account settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectTheme = (id) => {
    changeTheme(id);
    setThemeSuccessMsg(`Switched theme to ${themes.find(t => t.id === id)?.name || id}. Saved to your account!`);
    setTimeout(() => setThemeSuccessMsg(''), 4000);
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Account Customization & Appearance</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Account Settings & Themes</h1>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            Personalize your workspace theme, custom color palette, and manage your security credentials.
          </p>
        </div>
      </div>

      {/* Global Alerts */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center space-x-3 text-emerald-400">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-xs font-mono font-semibold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-3 text-rose-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-xs font-mono font-semibold">{errorMsg}</span>
        </div>
      )}

      {themeSuccessMsg && (
        <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center space-x-3 text-cyan-400 animate-fadeIn">
          <Sparkles className="w-5 h-5 flex-shrink-0" />
          <span className="text-xs font-mono font-semibold">{themeSuccessMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: THEME & COLOR CUSTOMIZATION STUDIO                             */}
      {/* ========================================================================= */}
      <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white flex items-center space-x-2">
                <span>Account Theme & Visual Styles</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Each staff member and administrator can choose their own preferred aesthetic.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={resetToDefault}
            className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 text-xs font-mono font-semibold flex items-center space-x-1.5 transition-all self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Reset to Default</span>
          </button>
        </div>

        {/* Preset Theme Selector Cards */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-3">
            Choose Workspace Preset:
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {themes.map((t) => {
              const isSelected = themeId === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => handleSelectTheme(t.id)}
                  className={`relative rounded-2xl p-4 border transition-all cursor-pointer overflow-hidden ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400'
                      : 'border-white/10 bg-slate-900/60 hover:border-white/20 hover:bg-slate-900/90'
                  }`}
                >
                  {/* Top header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className={`w-3.5 h-3.5 rounded-full ${t.previewBadge} shadow-sm flex-shrink-0`}></span>
                      <h4 className="font-extrabold text-white text-sm">{t.name}</h4>
                    </div>

                    {isSelected ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-cyan-500 text-black text-[10px] font-bold font-mono shadow-sm">
                        <Check className="w-3 h-3" />
                        <span>ACTIVE</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-white/5">
                        {t.mode}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 mb-4 font-mono">
                    {t.description}
                  </p>

                  {/* Mini Palette Color Chips */}
                  <div className="flex items-center space-x-2 pt-2 border-t border-white/5">
                    {t.id === 'custom' ? (
                      <div className="flex items-center space-x-1.5 text-xs text-cyan-400 font-mono">
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Custom Color Controls Below</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-5 h-5 rounded-md border border-white/10 shadow-sm" style={{ backgroundColor: t.background }} title="Background"></div>
                        <div className="w-5 h-5 rounded-md border border-white/10 shadow-sm" style={{ backgroundColor: t.surface }} title="Surface"></div>
                        <div className="w-5 h-5 rounded-md border border-white/10 shadow-sm" style={{ backgroundColor: t.primary }} title="Primary Accent"></div>
                        <div className="w-5 h-5 rounded-md border border-white/10 shadow-sm" style={{ backgroundColor: t.secondary || t.primary }} title="Secondary"></div>
                        <span className="text-[10px] font-mono text-slate-500 ml-auto">
                          {t.mode === 'light' ? 'Light Theme ☀️' : 'Dark Theme 🌙'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CUSTOM COLOR PALETTE STUDIO (Always Accessible or Expanded on Custom)     */}
        {/* ========================================================================= */}
        <div className={`mt-6 p-5 rounded-2xl border transition-all ${
          themeId === 'custom'
            ? 'border-cyan-500/40 bg-slate-900/90 shadow-xl shadow-cyan-500/10'
            : 'border-white/10 bg-slate-900/40'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-white/10">
            <div className="flex items-center space-x-2">
              <Paintbrush className="w-4 h-4 text-cyan-400" />
              <h4 className="font-extrabold text-white text-sm">
                Custom Color Studio & Real-time Live Tuning
              </h4>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => updateCustomConfig({ mode: 'dark' })}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center space-x-1 transition-all ${
                  customConfig.mode === 'dark'
                    ? 'bg-slate-700 text-cyan-300 border border-cyan-400/40 shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                <Moon className="w-3 h-3" />
                <span>Dark Base</span>
              </button>
              <button
                type="button"
                onClick={() => updateCustomConfig({ mode: 'light', background: '#f1f5f9', surface: '#ffffff', card: 'rgba(255, 255, 255, 0.92)' })}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center space-x-1 transition-all ${
                  customConfig.mode === 'light'
                    ? 'bg-sky-500 text-black border border-sky-400 shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                <Sun className="w-3 h-3" />
                <span>Light Base</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary Accent Picker */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono text-slate-300 font-bold flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: customConfig.primary }}></span>
                  <span>Primary Accent & Highlights Color</span>
                </label>
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase">{customConfig.primary}</span>
              </div>

              {/* Swatches */}
              <div className="flex flex-wrap gap-2">
                {ACCENT_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.color}
                    type="button"
                    onClick={() => updateCustomConfig({ primary: swatch.color })}
                    className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${
                      customConfig.primary.toLowerCase() === swatch.color.toLowerCase()
                        ? 'border-white scale-110 shadow-md ring-2 ring-white/50'
                        : 'border-white/10 hover:scale-105'
                    }`}
                    style={{ backgroundColor: swatch.color }}
                    title={swatch.name}
                  >
                    {customConfig.primary.toLowerCase() === swatch.color.toLowerCase() && (
                      <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
                    )}
                  </button>
                ))}
              </div>

              {/* Custom Hex / Color Input */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="color"
                  value={customConfig.primary}
                  onChange={(e) => updateCustomConfig({ primary: e.target.value })}
                  className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                />
                <input
                  type="text"
                  value={customConfig.primary}
                  onChange={(e) => updateCustomConfig({ primary: e.target.value })}
                  placeholder="#00d1ff"
                  className="w-28 bg-slate-800 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                />
                <span className="text-[11px] font-mono text-slate-500">Pick any custom HEX color</span>
              </div>
            </div>

            {/* Background Base Picker */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono text-slate-300 font-bold flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: customConfig.background }}></span>
                  <span>Workspace Background Tint</span>
                </label>
                <span className="text-xs font-mono font-bold text-slate-400 uppercase">{customConfig.background}</span>
              </div>

              {/* Background Swatches */}
              <div className="flex flex-wrap gap-2">
                {BACKGROUND_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.color}
                    type="button"
                    onClick={() => updateCustomConfig({ background: swatch.color, mode: swatch.mode })}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-bold flex items-center space-x-1.5 transition-all ${
                      customConfig.background.toLowerCase() === swatch.color.toLowerCase()
                        ? 'border-cyan-400 text-white bg-slate-800 ring-1 ring-cyan-400'
                        : 'border-white/10 text-slate-400 bg-slate-900/60 hover:text-white'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: swatch.color }}></span>
                    <span>{swatch.name}</span>
                  </button>
                ))}
              </div>

              {/* Custom Hex / Color Input */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="color"
                  value={customConfig.background.startsWith('#') ? customConfig.background : '#051424'}
                  onChange={(e) => updateCustomConfig({ background: e.target.value })}
                  className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                />
                <input
                  type="text"
                  value={customConfig.background}
                  onChange={(e) => updateCustomConfig({ background: e.target.value })}
                  placeholder="#051424"
                  className="w-28 bg-slate-800 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                />
                <span className="text-[11px] font-mono text-slate-500">Custom background color</span>
              </div>
            </div>
          </div>

          {/* Real-Time Live Preview Mini Box */}
          <div className="mt-5 p-4 rounded-xl border border-white/10 bg-black/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-black shadow-md" style={{ backgroundColor: customConfig.primary }}>
                AL
              </div>
              <div>
                <p className="text-xs font-bold text-white">Live Dealership Preview</p>
                <p className="text-[11px] text-slate-400 font-mono">
                  Theme settings auto-save immediately to your user profile: <strong>{user?.name || 'Account'}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-black font-mono shadow-md transition-transform active:scale-95"
                style={{ backgroundColor: customConfig.primary }}
              >
                Button Accent
              </button>
              <div className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase border" style={{ borderColor: customConfig.primary, color: customConfig.primary }}>
                Active Tag
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: PROFILE & CONTACT CREDENTIALS                                 */}
      {/* ========================================================================= */}
      <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-6">
        <div className="flex items-center space-x-4 border-b border-white/10 pb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-black flex items-center justify-center font-bold text-2xl shadow-lg shadow-cyan-500/20">
            {user?.name?.charAt(0) || 'A'}
          </div>

          <div>
            <h3 className="text-lg font-bold text-white">{user?.name}</h3>
            <p className="text-xs font-mono text-slate-400">{user?.email}</p>

            <div className="flex items-center space-x-2 mt-2">
              {isAdmin ? (
                <span className="inline-flex items-center text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-lg border border-cyan-500/30">
                  <Shield className="w-3 h-3 mr-1" /> SYSTEM ADMINISTRATOR
                </span>
              ) : (
                <span className="inline-flex items-center text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
                  <Briefcase className="w-3 h-3 mr-1" /> SALES EXECUTIVE
                </span>
              )}

              <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-lg border border-white/5">
                Format: 03xxxxxxxxx
              </span>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1.5 flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>Full Profile Name *</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                placeholder="e.g. Mr. Imran"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1.5 flex items-center space-x-1">
                <Phone className="w-3.5 h-3.5 text-cyan-400" />
                <span>Pakistani Mobile Number (Format: 03000000000) *</span>
              </label>
              <input
                type="text"
                required
                maxLength={11}
                value={formData.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono tracking-wider"
                placeholder="03000000000"
              />
              <p className="text-[10px] text-slate-500 font-mono mt-1">Saved without country code or spaces.</p>
            </div>
          </div>

          {/* Password Change Section */}
          <div className="pt-4 border-t border-white/10 space-y-4">
            <h5 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-1">
              <Lock className="w-3.5 h-3.5" />
              <span>Security & Password Update (Optional)</span>
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.currentPassword}
                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    title={showCurrentPassword ? 'Hide password' : 'Show password'}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Min 6 characters"
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    title={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repeat new password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex justify-end pt-4 border-t border-white/10">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold font-mono text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saving ? 'Saving Changes...' : 'Save Profile Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
