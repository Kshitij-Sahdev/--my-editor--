'use client';

import { Play } from "lucide-react";

interface RunButtonProps {
  onClick: () => void;
  isRunning: boolean;
}

const styles = {
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: 'var(--color-accent)',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: 'none',
  } as React.CSSProperties,
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  } as React.CSSProperties,
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid transparent',
    borderTopColor: 'white',
    borderRadius: '50%',
  } as React.CSSProperties,
  kbd: {
    display: 'none',
    alignItems: 'center',
    gap: '2px',
    padding: '2px 6px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '4px',
    fontSize: '10px',
    fontFamily: 'var(--font-mono)',
  } as React.CSSProperties,
};

export default function RunButton({ onClick, isRunning }: RunButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isRunning}
      style={{
        ...styles.button,
        ...(isRunning ? styles.buttonDisabled : {}),
      }}
    >
      {isRunning ? (
        <span style={styles.spinner} className="animate-spin" />
      ) : (
        <Play size={14} />
      )}
      Run
      <kbd style={{ ...styles.kbd, display: 'inline-flex' }}>
        <span>Ctrl</span>
        <span>+</span>
        <span>Enter</span>
      </kbd>
    </button>
  );
}
