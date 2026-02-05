"use client";

import * as Select from "@radix-ui/react-select";
import { ChevronDown, Check } from "lucide-react";
import type { Language } from "../types";

const languages: { value: Language; label: string }[] = [
  { value: "python", label: "Python" },
  { value: "cpp", label: "C++" },
  { value: "java", label: "Java" },
  { value: "go", label: "Go" },
  { value: "javascript", label: "JavaScript" },
];

interface LangSelectProps {
  value: Language;
  onChange: (value: Language) => void;
}

const styles = {
  trigger: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    padding: '8px 12px',
    minWidth: '130px',
    backgroundColor: 'var(--color-surface-hover)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    fontSize: '14px',
    color: 'var(--color-text)',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
    outline: 'none',
  } as React.CSSProperties,
  chevronIcon: {
    color: 'var(--color-text-muted)',
  } as React.CSSProperties,
  content: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    zIndex: 50,
  } as React.CSSProperties,
  viewport: {
    padding: '4px',
  } as React.CSSProperties,
  item: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    fontSize: '14px',
    color: 'var(--color-text)',
    cursor: 'pointer',
    borderRadius: '6px',
    outline: 'none',
  } as React.CSSProperties,
  checkIcon: {
    color: 'var(--color-accent)',
  } as React.CSSProperties,
};

export default function LangSelect({ value, onChange }: LangSelectProps) {
  return (
    <Select.Root value={value} onValueChange={(v) => onChange(v as Language)}>
      <Select.Trigger style={styles.trigger}>
        <Select.Value />
        <Select.Icon>
          <ChevronDown size={14} style={styles.chevronIcon} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          style={styles.content}
          position="popper"
          sideOffset={4}
        >
          <Select.Viewport style={styles.viewport}>
            {languages.map((lang) => (
              <Select.Item
                key={lang.value}
                value={lang.value}
                style={styles.item}
              >
                <Select.ItemText>{lang.label}</Select.ItemText>
                <Select.ItemIndicator>
                  <Check size={14} style={styles.checkIcon} />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
