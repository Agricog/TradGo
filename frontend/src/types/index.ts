// ===========================================
// Enums (match database enums exactly)
// ===========================================

export type AgentStatus = 'onboarding' | 'live' | 'paused'
export type VerificationType = 'registration' | 'insurance'
export type VerificationStatus = 'pending' | 'verified' | 'failed' | 'expired'
export type ConversationStatus = 'active' | 'awaiting_approval' | 'escalated' | 'completed' | 'archived'
export type ConversationChannel = 'sms' | 'whatsapp' | 'web'
export type MessageRole = 'customer' | 'agent' | 'electrician'
export type MessageClassification = 'safe' | 'needs_approval' | 'escalate'
export type AgentRuleSource = 'manual' | 'suggested_from_edit'
export type SuggestionStatus = 'pending' | 'accepted' | 'dismissed'
export type UrgencyLevel = 'urgent' | 'standard' | 'no_rush'

// ===========================================
// Core entities
// ===========================================

export interface Electrician {
  id: string
  clerk_id: string
  first_name: string
  business_name: string | null
  email: string
  phone: string
  postcode: string
  lat: number
  lng: number
  service_radius_miles: number
  twilio_number: string | null
  agent_status: AgentStatus
  onboarding_step: number
  onboarding_completed_at: string | null
  stripe_customer_id: string | null
  subscription_status: string
  trial_ends_at: string | null
  created_at: string
  updated_at: string
}

export interface Service {
  id: string
  electrician_id: string
  category: string
  price_from: number | null
  price_to: number | null
  day_rate: number | null
  pricing_note: string | null
  created_at: string
}

export interface VoiceRecording {
  id: string
  electrician_id: string
  r2_key: string
  duration_seconds: number
  transcript: string | null
  tone_notes: string | null
  processed: boolean
  created_at: string
}

export interface Verification {
  id: string
  electrician_id: string
  type: VerificationType
  scheme: string | null
  reference_number: string | null
  status: VerificationStatus
  verified_data: Record<string, unknown> | null
  document_r2_key: string | null
  verified_at: string | null
  expires_at: string | null
  created_at: string
}

export interface Conversation {
  id: string
  electrician_id: string
  channel: ConversationChannel
  customer_phone: string | null
  customer_email: string | null
  customer_name: string | null
  status: ConversationStatus
  job_type: string | null
  job_location_postcode: string | null
  property_type: string | null
  urgency: UrgencyLevel | null
  estimate_from: number | null
  estimate_to: number | null
  estimate_approved: boolean
  visit_confirmed: boolean
  visit_datetime: string | null
  escalation_reason: string | null
  agent_paused_until: string | null
  source_url: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: MessageRole
  content: string
  classification: MessageClassification | null
  approved: boolean | null
  approved_content: string | null
  inbox_summary: string | null
  sent: boolean
  sent_at: string | null
  created_at: string
}

export interface AgentRule {
  id: string
  electrician_id: string
  rule_text: string
  source: AgentRuleSource
  active: boolean
  created_at: string
}

export interface AgentRuleSuggestion {
  id: string
  electrician_id: string
  suggestion_text: string
  source_edit_ids: string[]
  status: SuggestionStatus
  created_at: string
}

export interface NotificationPreferences {
  id: string
  electrician_id: string
  push_enabled: boolean
  digest_email_enabled: boolean
  notification_sound: boolean
  digest_email_time: string
  created_at: string
  updated_at: string
}

export interface AgentPage {
  id: string
  electrician_id: string
  slug: string
  og_image_r2_key: string | null
  is_active: boolean
  views_count: number
  created_at: string
  updated_at: string
}

export interface WeeklyStats {
  id: string
  electrician_id: string
  period_start: string
  period_end: string
  enquiries_count: number
  completed_count: number
  estimates_sent: number
  visits_booked: number
  avg_response_seconds: number | null
  approval_rate: number | null
  estimated_value_low: number | null
  estimated_value_high: number | null
  created_at: string
}

// ===========================================
// API response types
// ===========================================

export interface ApiError {
  error: string
  code?: string
}

export interface MeResponse {
  exists: boolean
  electrician?: Pick<
    Electrician,
    'id' | 'first_name' | 'business_name' | 'email' | 'agent_status' | 'onboarding_step'
  >
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[]
}
