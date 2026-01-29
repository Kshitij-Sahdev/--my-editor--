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

export default function LangSelect({ value, onChange }: LangSelectProps) {
  return (
    <Select.Root value={value} onValueChange={(v) => onChange(v as Language)}>
      <Select.Trigger className="flex items-center justify-between gap-2 px-3 py-2 min-w-[130px] bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] cursor-pointer hover:border-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors">
        <Select.Value />
        <Select.Icon>
          <ChevronDown size={14} className="text-[var(--color-text-muted)]" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden shadow-xl z-50"
          position="popper"
          sideOffset={4}
        >
          <Select.Viewport className="p-1">
            {languages.map((lang) => (
              <Select.Item
                key={lang.value}
                value={lang.value}
                className="flex items-center justify-between px-3 py-2 text-sm text-[var(--color-text)] cursor-pointer rounded-md outline-none data-[highlighted]:bg-[var(--color-surface-hover)] data-[state=checked]:text-[var(--color-accent)]"
              >
                <Select.ItemText>{lang.label}</Select.ItemText>
                <Select.ItemIndicator>
                  <Check size={14} className="text-[var(--color-accent)]" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
