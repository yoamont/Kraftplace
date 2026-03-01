import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

// En dev, refuser d'utiliser le placeholder pour éviter des requêtes vers une URL fictive
const isPlaceholder = !supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder');
if (typeof window !== 'undefined' && isPlaceholder) {
  console.error(
    '[Supabase] Variables manquantes. Ajoute NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local puis redémarre le serveur (npm run dev).'
  );
}

const url = supabaseUrl || 'https://placeholder.supabase.co';
const key = supabaseAnonKey || 'placeholder';

export const supabase: SupabaseClient = createClient(url, key);

// --- Types alignés sur tables.supabase ---

export type Brand = {
  id: number;
  owner_id: string;
  brand_name: string;
  avatar_url: string | null;
  created_at: string | null;
  description: string | null;
  image_url: string | null;
  default_commission_rate: number | null;
  /** Statut juridique : sarl, sas, sasu, sa, eurl, ei, microentrepreneur, association, other */
  legal_status: string | null;
  /** Précision lorsque legal_status = other */
  legal_status_other: string | null;
  company_name: string | null;
  registered_address: string | null;
  siret: string | null;
  /** Nom et prénom du représentant */
  representative_name: string | null;
  email: string | null;
  phone: string | null;
  /** Chemin du fichier attestation RC Pro (bucket brand-documents, privé) */
  rc_pro_attestation_path: string | null;
  /** Crédits achetés (packs Stripe), incrémentés par le webhook */
  credits: number | null;
  /** Crédits réservés (candidatures en attente), débités à l'acceptation */
  reserved_credits: number | null;
};

export type Showroom = {
  id: number;
  owner_id: string;
  name: string;
  address: string | null;
  city: string | null;
  code_postal: string | null;
  description: string | null;
  avatar_url: string | null;
  image_url: string | null;
  default_commission_rate: number | null;
  vibe_tags: string[] | null;
  traffic_level: string | null;
  instagram_handle: string | null;
  is_verified: boolean | null;
  /** Type d'établissement : identité de la boutique. Définit si les annonces sont contraintes par des dates d'existence. */
  shop_type: 'permanent' | 'ephemeral' | null;
  is_permanent: boolean | null;
  /** Pour lieu éphémère : dates d'existence physique du lieu (obligatoires). Inutilisées si permanent. */
  start_date: string | null;
  end_date: string | null;
  /** Période d'ouverture des candidatures : le bouton Candidater n'est actif qu'entre ces deux dates (inclus). Null = pas de restriction. */
  candidature_open_from: string | null;
  candidature_open_to: string | null;
  publication_status: 'draft' | 'published';
  /** Statut juridique : sarl, sas, sasu, sa, eurl, ei, microentrepreneur, association, other */
  legal_status: string | null;
  legal_status_other: string | null;
  company_name: string | null;
  registered_address: string | null;
  siret: string | null;
  representative_name: string | null;
  email: string | null;
  phone: string | null;
};

export type Badge = {
  id: number;
  slug: string;
  label: string;
  icon: string | null;
  sort_order: number | null;
};

export type RentPeriod = 'week' | 'month' | 'one_off';

export type ListingStatus = 'draft' | 'published' | 'archived';

export type Listing = {
  id: number;
  showroom_id: number;
  title: string;
  status: ListingStatus;
  partnership_start_date: string | null;
  partnership_end_date: string | null;
  application_open_date: string | null;
  application_close_date: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ShowroomCommissionOption = {
  id: number;
  showroom_id: number;
  sort_order: number;
  rent: number | null;
  rent_period: RentPeriod | null;
  commission_percent: number | null;
  description: string | null;
};

export type Product = {
  id: number;
  brand_id: number;
  product_name: string;
  price: number;
  description: string | null;
  image_url: string | null;
  commission_percent: number | null;
  stock_max: number | null;
  created_at: string | null;
};

export type PlacementStatus = 'pending' | 'active' | 'sold' | 'returned';

export type PlacementInitiator = 'brand' | 'showroom';

export type Placement = {
  id: string;
  product_id: number;
  showroom_id: number;
  status: PlacementStatus | null;
  agreed_commission_rate: number | null;
  stock_quantity: number | null;
  initiated_by: PlacementInitiator | null;
  created_at: string | null;
};

export type CandidatureStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export type Candidature = {
  id: string;
  brand_id: number;
  showroom_id: number;
  showroom_commission_option_id: number | null;
  negotiation_message: string | null;
  message: string | null;
  status: CandidatureStatus;
  expires_at: string | null;
  validity_days: number | null;
  /** Date de début du partenariat proposé */
  partnership_start_at: string | null;
  /** Date de fin du partenariat proposé */
  partnership_end_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

/** @deprecated Table candidature_messages supprimée ; utiliser Message (table messages) avec message_type 'candidature_action'. */
export type CandidatureMessage = {
  id: string;
  candidature_id: string;
  sender_id: string;
  body: string;
  created_at: string | null;
};

/** @deprecated Table conversation_messages supprimée ; utiliser Message (table messages) avec conversation_id. */
// export type ConversationMessage = { id: string; brand_id: number; showroom_id: number; sender_id: string; body: string; created_at: string | null; };

// --- Messagerie unifiée par événements (conversations + messages) ---
export type Conversation = {
  id: string;
  brand_id: number;
  showroom_id: number;
  listing_id: number | null;
  updated_at: string | null;
};

/** Types d'événements du journal messages (une seule table, une seule clé conversation_id). */
export type UnifiedMessageType =
  | 'CHAT'
  | 'DEAL_SENT' | 'DEAL_ACCEPTED' | 'DEAL_DECLINED' | 'DEAL_EXPIRED'
  | 'CANDIDATURE_SENT' | 'OFFER_NEGOTIATED' | 'CANDIDATURE_ACCEPTED' | 'CANDIDATURE_REFUSED'
  | 'CONTRAT' | 'PAYMENT_REQUEST' | 'DOCUMENT';

export type UnifiedMessage = {
  id: string;
  conversation_id: string;
  created_at: string | null;
  updated_at: string | null;
  type: UnifiedMessageType;
  sender_id: string | null;
  /** 'brand' | 'boutique' pour afficher qui envoie (évite confusion dans le fil) */
  sender_role: 'brand' | 'boutique' | null;
  content: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
};

/** 'chat' = message classique ; 'candidature_action' = action système (négociation, acceptée, etc.) */
export type MessageType = 'chat' | 'candidature_action' | 'placement_action';

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  /** Rôle de l'expéditeur : 'brand' (marque) ou 'boutique' (showroom) */
  sender_role: 'brand' | 'boutique' | null;
  content: string;
  is_read: boolean;
  created_at: string | null;
  /** Type de message : chat (défaut), action système (candidature, placement) */
  message_type: MessageType | null;
  /** Pour message_type = placement_action : id du placement concerné */
  placement_id: string | null;
};

/** Type de message dans un fil candidature : user ou message système */
export type CandidatureMessageType = 'user' | 'system_offer_sent' | 'system_offer_accepted' | 'system_status_update';

/** Message d’un fil candidature (table messages avec candidature_id, type, metadata) */
export type CandidatureThreadMessage = {
  id: string;
  candidature_id: string | null;
  sender_id: string | null;
  sender_role: 'brand' | 'boutique' | null;
  content: string | null;
  is_read: boolean;
  created_at: string | null;
  /** user = bulle utilisateur ; system_* = badge centré */
  type: CandidatureMessageType;
  /** Variables des événements système (commission_rate, validity_days, etc.) */
  metadata: Record<string, unknown> | null;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  reference_id: string | null;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string | null;
};

// Paiements (flux marketplace) - désactivés, types retirés.
