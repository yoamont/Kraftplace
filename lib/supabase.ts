import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// ——— Types alignés sur tables.supabase ———

export type Brand = {
  id: number;
  owner_id: string;
  brand_name: string;
  avatar_url: string | null;
  created_at: string | null;
  description: string | null;
  image_url: string | null;
  default_commission_rate: number | null;
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
  is_permanent: boolean | null;
  start_date: string | null;
  end_date: string | null;
  publication_status: 'draft' | 'published';
};

export type RentPeriod = 'week' | 'month' | 'one_off';

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

export type CandidatureStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';

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

// ——— Messagerie B2B (conversations + messages) ———
export type Conversation = {
  id: string;
  brand_id: number;
  showroom_id: number;
  updated_at: string | null;
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

// ——— Paiements ———
export type PaymentRequestType = 'sales' | 'rent';
export type PaymentRequestStatus = 'pending' | 'accepted' | 'contested' | 'completed' | 'cancelled';
export type PaymentInitiatorSide = 'showroom' | 'brand';

export type PaymentRequest = {
  id: string;
  type: PaymentRequestType;
  placement_id: string | null;
  candidature_id: string | null;
  counterpart_brand_id: number | null;
  counterpart_showroom_id: number | null;
  amount_cents: number;
  platform_fee_cents: number;
  currency: string;
  status: PaymentRequestStatus;
  initiator_side: PaymentInitiatorSide;
  motif: string | null;
  sales_report_attachment_url: string | null;
  contest_note: string | null;
  stripe_payment_intent_id: string | null;
  stripe_platform_payment_intent_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};
