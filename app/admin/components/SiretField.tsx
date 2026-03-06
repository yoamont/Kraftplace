'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';

type SiretFieldProps = {
  value: string;
  onChange: (value: string) => void;
  onVerified?: (result: { companyName?: string; address?: string; siren?: string }) => void;
  onValidationChange?: (verified: boolean) => void;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  className?: string;
  /** Si true, le formulaire parent ne peut pas être soumis tant que SIRET non vérifié */
  requiredVerification?: boolean;
};

const DEBOUNCE_MS = 600;

export function SiretField({
  value,
  onChange,
  onVerified,
  onValidationChange,
  disabled,
  id = 'siret',
  placeholder = '14 chiffres',
  className = '',
  requiredVerification = true,
}: SiretFieldProps) {
  const [checking, setChecking] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastSiretRef = useRef<string>('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runValidation = useCallback(
    async (siret: string) => {
      if (siret.length !== 14 || !/^\d{14}$/.test(siret)) {
        setVerified(false);
        setVerifiedName(null);
        setError(null);
        onValidationChange?.(false);
        return;
      }
      setChecking(true);
      setError(null);
      try {
        const res = await fetch('/api/validate-siret', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siret }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && (data as { valid?: boolean }).valid) {
          const d = data as { companyName?: string; address?: string; siren?: string };
          setVerified(true);
          setVerifiedName(d.companyName ?? null);
          onVerified?.(d);
          onValidationChange?.(true);
        } else {
          setVerified(false);
          setVerifiedName(null);
          setError((data as { error?: string }).error ?? 'SIRET invalide.');
          onValidationChange?.(false);
        }
      } catch {
        setVerified(false);
        setVerifiedName(null);
        setError('Vérification indisponible.');
        onValidationChange?.(false);
      } finally {
        setChecking(false);
      }
    },
    [onVerified, onValidationChange]
  );

  useEffect(() => {
    const raw = value.replace(/\D/g, '');
    if (raw !== lastSiretRef.current) {
      setVerified(false);
      setVerifiedName(null);
      setError(null);
      onValidationChange?.(false);
      lastSiretRef.current = raw;
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (raw.length === 14 && /^\d{14}$/.test(raw)) {
      timeoutRef.current = setTimeout(() => runValidation(raw), DEBOUNCE_MS);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value, runValidation, onValidationChange]);

  const showLoader = checking;
  const showBadge = verified && !checking && verifiedName;

  return (
    <div className={className}>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 14))}
          disabled={disabled}
          placeholder={placeholder}
          maxLength={14}
          className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 placeholder:text-neutral-400 disabled:opacity-60"
          aria-invalid={error != null}
          aria-describedby={error ? `${id}-error` : showBadge ? `${id}-verified` : undefined}
        />
        {showLoader && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden>
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
          </span>
        )}
      </div>
      {value.length > 0 && value.length !== 14 && (
        <p className="mt-0.5 text-xs text-amber-700">Le SIRET doit comporter 14 chiffres.</p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-0.5 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
      {showBadge && (
        <div
          id={`${id}-verified`}
          className="mt-2 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200/80 px-3 py-2 text-sm text-emerald-800 siret-verified-badge"
          role="status"
        >
          <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" strokeWidth={1.5} />
          <span>
            Entreprise vérifiée : <strong>{verifiedName}</strong>
          </span>
        </div>
      )}
    </div>
  );
}

