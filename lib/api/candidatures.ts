import { supabase } from '@/lib/supabase';

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function acceptCandidatureApi(conversationId: string, messageId?: string): Promise<void> {
  const res = await fetch('/api/candidatures/accept', {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ conversationId, messageId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || 'Erreur lors de l\'acceptation');
  }
}

export async function rejectCandidatureApi(conversationId: string): Promise<void> {
  const res = await fetch('/api/candidatures/reject', {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ conversationId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || 'Erreur lors du refus');
  }
}

export async function cancelCandidatureApi(conversationId: string): Promise<void> {
  const res = await fetch('/api/candidatures/cancel', {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ conversationId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || 'Erreur lors de l\'annulation');
  }
}
