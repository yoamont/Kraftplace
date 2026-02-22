'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

type Props = {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function ChatInput({ onSend, disabled, placeholder = 'Écrire un message…' }: Props) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const send = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  return (
    <div className="flex items-end gap-2 p-3 w-full bg-white">
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        className="flex-1 min-w-0 min-h-[44px] max-h-[120px] resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-kraft-900 focus:border-transparent"
        disabled={disabled}
      />
      <button
        type="button"
        onClick={send}
        disabled={disabled || !value.trim()}
        className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        aria-label="Envoyer"
      >
        <Send className="h-4 w-4" />
        Envoyer
      </button>
    </div>
  );
}
