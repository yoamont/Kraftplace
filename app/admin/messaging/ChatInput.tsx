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
    <div className="flex items-end gap-2 p-2 md:p-3 w-full bg-white">
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        className="flex-1 min-w-0 min-h-[44px] max-h-[120px] resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 md:px-4 py-2.5 text-base md:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-kraft-900 focus:border-transparent touch-manipulation"
        disabled={disabled}
      />
      <button
        type="button"
        onClick={send}
        disabled={disabled || !value.trim()}
        className="shrink-0 flex items-center justify-center gap-1.5 md:gap-2 min-w-[44px] min-h-[44px] px-3 md:px-4 py-2.5 rounded-xl bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 disabled:opacity-40 disabled:pointer-events-none transition-colors touch-manipulation"
        aria-label="Envoyer"
      >
        <Send className="h-5 w-5 md:h-4 md:w-4" />
        <span className="hidden sm:inline">Envoyer</span>
      </button>
    </div>
  );
}
