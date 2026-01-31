/**
 * Settings.tsx - Editor settings panel with checkbox/toggle options
 *
 * Displays when a file named "settings.conf" is selected.
 * Provides UI controls for:
 * - Theme selection (AMOLED Black, One Dark, Dracula, Nord, etc.)
 * - Font selection (JetBrains Mono, Fira Code, etc.)
 * - Font size
 * - Line numbers toggle
 * - Word wrap toggle
 * - Minimap toggle
 * - Bracket matching toggle
 */

"use client";

import { Settings as SettingsIcon, Check, RotateCcw } from "lucide-react";
import type { EditorSettings } from "../types";
import { DEFAULT_SETTINGS, AVAILABLE_THEMES, AVAILABLE_FONTS } from "../types";

// =============================================================================
// TYPES
// =============================================================================

interface SettingsProps {
  settings: EditorSettings;
  onSettingsChange: (settings: EditorSettings) => void;
}

// =============================================================================
// STYLES
// =============================================================================

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: 'var(--color-bg)',
    overflow: 'auto',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
  } as React.CSSProperties,
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  } as React.CSSProperties,
  headerIcon: {
    color: 'var(--color-accent)',
    filter: 'drop-shadow(0 0 8px var(--color-accent))',
  } as React.CSSProperties,
  headerTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--color-text)',
  } as React.CSSProperties,
  resetButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    backgroundColor: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  } as React.CSSProperties,
  content: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  } as React.CSSProperties,
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--color-text-muted)',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--color-border-subtle)',
  } as React.CSSProperties,
  optionRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: 'var(--color-surface)',
    borderRadius: '8px',
    border: '1px solid var(--color-border-subtle)',
  } as React.CSSProperties,
  optionLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  } as React.CSSProperties,
  optionName: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--color-text)',
  } as React.CSSProperties,
  optionDesc: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
  } as React.CSSProperties,
  toggle: {
    position: 'relative',
    width: '44px',
    height: '24px',
    backgroundColor: 'var(--color-surface-2)',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    border: '1px solid var(--color-border)',
  } as React.CSSProperties,
  toggleActive: {
    backgroundColor: 'var(--color-accent)',
    borderColor: 'var(--color-accent)',
  } as React.CSSProperties,
  toggleKnob: {
    position: 'absolute',
    top: '2px',
    left: '2px',
    width: '18px',
    height: '18px',
    backgroundColor: 'white',
    borderRadius: '50%',
    transition: 'transform 0.2s',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
  } as React.CSSProperties,
  toggleKnobActive: {
    transform: 'translateX(20px)',
  } as React.CSSProperties,
  select: {
    padding: '8px 12px',
    backgroundColor: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    fontSize: '14px',
    color: 'var(--color-text)',
    cursor: 'pointer',
    outline: 'none',
    minWidth: '180px',
  } as React.CSSProperties,
  slider: {
    width: '120px',
    height: '6px',
    borderRadius: '3px',
    backgroundColor: 'var(--color-surface-2)',
    cursor: 'pointer',
    accentColor: 'var(--color-accent)',
  } as React.CSSProperties,
  sliderValue: {
    fontSize: '14px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--color-text)',
    minWidth: '40px',
    textAlign: 'right',
  } as React.CSSProperties,
  sliderContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  } as React.CSSProperties,
  themeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '12px',
  } as React.CSSProperties,
  themeOption: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '16px 12px',
    backgroundColor: 'var(--color-surface)',
    border: '2px solid var(--color-border)',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  } as React.CSSProperties,
  themeOptionActive: {
    borderColor: 'var(--color-accent)',
    boxShadow: '0 0 20px var(--color-accent-glow)',
  } as React.CSSProperties,
  themePreview: {
    width: '100%',
    height: '48px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as React.CSSProperties,
  themeName: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--color-text)',
  } as React.CSSProperties,
  checkIcon: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    color: 'var(--color-accent)',
  } as React.CSSProperties,
  fontGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
  } as React.CSSProperties,
  fontOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: 'var(--color-surface)',
    border: '2px solid var(--color-border)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    position: 'relative',
  } as React.CSSProperties,
  fontOptionActive: {
    borderColor: 'var(--color-accent)',
    boxShadow: '0 0 15px var(--color-accent-glow)',
  } as React.CSSProperties,
  fontPreview: {
    fontSize: '18px',
    color: 'var(--color-text)',
  } as React.CSSProperties,
  fontName: {
    fontSize: '13px',
    color: 'var(--color-text-secondary)',
  } as React.CSSProperties,
};

// Theme preview colors
const themePreviewColors: Record<string, { bg: string; accent: string }> = {
  'amoled-black': { bg: '#000000', accent: '#10b981' },
  'one-dark': { bg: '#282c34', accent: '#61afef' },
  'dracula': { bg: '#282a36', accent: '#bd93f9' },
  'nord': { bg: '#2e3440', accent: '#88c0d0' },
  'github-dark': { bg: '#0d1117', accent: '#58a6ff' },
  'monokai': { bg: '#272822', accent: '#f92672' },
  'solarized-dark': { bg: '#002b36', accent: '#268bd2' },
  'tokyo-night': { bg: '#1a1b26', accent: '#7aa2f7' },
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function Settings({ settings, onSettingsChange }: SettingsProps) {
  const handleToggle = (key: keyof EditorSettings) => {
    onSettingsChange({
      ...settings,
      [key]: !settings[key],
    });
  };

  const handleChange = (key: keyof EditorSettings, value: string | number) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  const handleReset = () => {
    onSettingsChange(DEFAULT_SETTINGS);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <SettingsIcon size={24} style={styles.headerIcon} />
          <span style={styles.headerTitle}>Editor Settings</span>
        </div>
        <button style={styles.resetButton} onClick={handleReset}>
          <RotateCcw size={14} />
          Reset to Defaults
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* Theme Section */}
        <div style={styles.section}>
          <span style={styles.sectionTitle}>Theme</span>
          <div style={styles.themeGrid}>
            {AVAILABLE_THEMES.map((theme) => (
              <div
                key={theme.id}
                style={{
                  ...styles.themeOption,
                  ...(settings.theme === theme.id ? styles.themeOptionActive : {}),
                  position: 'relative',
                }}
                onClick={() => handleChange('theme', theme.id)}
              >
                <div
                  style={{
                    ...styles.themePreview,
                    backgroundColor: themePreviewColors[theme.id]?.bg || '#1a1a1a',
                  }}
                >
                  <span style={{ color: themePreviewColors[theme.id]?.accent || '#10b981', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                    code()
                  </span>
                </div>
                <span style={styles.themeName}>{theme.name}</span>
                {settings.theme === theme.id && (
                  <Check size={16} style={styles.checkIcon} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Font Section */}
        <div style={styles.section}>
          <span style={styles.sectionTitle}>Font Family</span>
          <div style={styles.fontGrid}>
            {AVAILABLE_FONTS.map((font) => (
              <div
                key={font.id}
                style={{
                  ...styles.fontOption,
                  ...(settings.fontFamily === font.id ? styles.fontOptionActive : {}),
                }}
                onClick={() => handleChange('fontFamily', font.id)}
              >
                <span style={{ ...styles.fontPreview, fontFamily: font.css }}>Aa</span>
                <span style={styles.fontName}>{font.name}</span>
                {settings.fontFamily === font.id && (
                  <Check size={14} style={{ ...styles.checkIcon, top: '50%', transform: 'translateY(-50%)' }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div style={styles.section}>
          <span style={styles.sectionTitle}>Font Size</span>
          <div style={styles.optionRow}>
            <div style={styles.optionLabel}>
              <span style={styles.optionName}>Editor Font Size</span>
              <span style={styles.optionDesc}>Size of text in the code editor</span>
            </div>
            <div style={styles.sliderContainer}>
              <input
                type="range"
                min="10"
                max="24"
                value={settings.fontSize}
                onChange={(e) => handleChange('fontSize', parseInt(e.target.value))}
                style={styles.slider}
              />
              <span style={styles.sliderValue}>{settings.fontSize}px</span>
            </div>
          </div>
        </div>

        {/* Editor Options */}
        <div style={styles.section}>
          <span style={styles.sectionTitle}>Editor Options</span>
          
          <div style={styles.optionRow}>
            <div style={styles.optionLabel}>
              <span style={styles.optionName}>Line Numbers</span>
              <span style={styles.optionDesc}>Show line numbers in the gutter</span>
            </div>
            <div
              style={{
                ...styles.toggle,
                ...(settings.lineNumbers ? styles.toggleActive : {}),
              }}
              onClick={() => handleToggle('lineNumbers')}
            >
              <div
                style={{
                  ...styles.toggleKnob,
                  ...(settings.lineNumbers ? styles.toggleKnobActive : {}),
                }}
              />
            </div>
          </div>

          <div style={styles.optionRow}>
            <div style={styles.optionLabel}>
              <span style={styles.optionName}>Word Wrap</span>
              <span style={styles.optionDesc}>Wrap long lines to fit the editor width</span>
            </div>
            <div
              style={{
                ...styles.toggle,
                ...(settings.wordWrap ? styles.toggleActive : {}),
              }}
              onClick={() => handleToggle('wordWrap')}
            >
              <div
                style={{
                  ...styles.toggleKnob,
                  ...(settings.wordWrap ? styles.toggleKnobActive : {}),
                }}
              />
            </div>
          </div>

          <div style={styles.optionRow}>
            <div style={styles.optionLabel}>
              <span style={styles.optionName}>Bracket Matching</span>
              <span style={styles.optionDesc}>Highlight matching brackets</span>
            </div>
            <div
              style={{
                ...styles.toggle,
                ...(settings.bracketMatching ? styles.toggleActive : {}),
              }}
              onClick={() => handleToggle('bracketMatching')}
            >
              <div
                style={{
                  ...styles.toggleKnob,
                  ...(settings.bracketMatching ? styles.toggleKnobActive : {}),
                }}
              />
            </div>
          </div>

          <div style={styles.optionRow}>
            <div style={styles.optionLabel}>
              <span style={styles.optionName}>Highlight Active Line</span>
              <span style={styles.optionDesc}>Highlight the line with the cursor</span>
            </div>
            <div
              style={{
                ...styles.toggle,
                ...(settings.highlightActiveLine ? styles.toggleActive : {}),
              }}
              onClick={() => handleToggle('highlightActiveLine')}
            >
              <div
                style={{
                  ...styles.toggleKnob,
                  ...(settings.highlightActiveLine ? styles.toggleKnobActive : {}),
                }}
              />
            </div>
          </div>

          <div style={styles.optionRow}>
            <div style={styles.optionLabel}>
              <span style={styles.optionName}>Auto-show Output</span>
              <span style={styles.optionDesc}>Automatically show output panel when running code</span>
            </div>
            <div
              style={{
                ...styles.toggle,
                ...(settings.autoShowOutput ? styles.toggleActive : {}),
              }}
              onClick={() => handleToggle('autoShowOutput')}
            >
              <div
                style={{
                  ...styles.toggleKnob,
                  ...(settings.autoShowOutput ? styles.toggleKnobActive : {}),
                }}
              />
            </div>
          </div>
        </div>

        {/* Tab Settings */}
        <div style={styles.section}>
          <span style={styles.sectionTitle}>Indentation</span>
          
          <div style={styles.optionRow}>
            <div style={styles.optionLabel}>
              <span style={styles.optionName}>Tab Size</span>
              <span style={styles.optionDesc}>Number of spaces per tab</span>
            </div>
            <select
              value={settings.tabSize}
              onChange={(e) => handleChange('tabSize', parseInt(e.target.value))}
              style={styles.select}
            >
              <option value={2}>2 spaces</option>
              <option value={4}>4 spaces</option>
              <option value={8}>8 spaces</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
