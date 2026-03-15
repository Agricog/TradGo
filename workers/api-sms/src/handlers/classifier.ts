export interface ParsedResponse {
  response: string
  classification: 'safe' | 'needs_approval' | 'escalate'
  inboxSummary: string | null
  extracted: Record<string, string | null> | null
}

/**
 * Parse the structured response from Claude.
 * Extracts <response>, <classification>, <inbox_summary>, and <extracted> blocks.
 *
 * If parsing fails, defaults to NEEDS_APPROVAL (safe fallback — never auto-send
 * an unclassified message).
 */
export function parseAgentResponse(rawResponse: string): ParsedResponse {
  try {
    const response = extractTag(rawResponse, 'response')
    const classificationRaw = extractTag(rawResponse, 'classification')
    const inboxSummary = extractTag(rawResponse, 'inbox_summary')
    const extractedRaw = extractTag(rawResponse, 'extracted')

    // Default to the full response if no <response> tag found
    const messageText = response || rawResponse.trim()

    // Map classification
    let classification: ParsedResponse['classification'] = 'needs_approval'
    if (classificationRaw) {
      const upper = classificationRaw.trim().toUpperCase()
      if (upper === 'SAFE') classification = 'safe'
      else if (upper === 'APPROVAL') classification = 'needs_approval'
      else if (upper === 'ESCALATE') classification = 'escalate'
    }

    // Parse extracted data
    let extracted: Record<string, string | null> | null = null
    if (extractedRaw) {
      try {
        const parsed = JSON.parse(extractedRaw)
        // Only include non-null fields
        extracted = {}
        for (const [key, value] of Object.entries(parsed)) {
          if (value !== null && value !== undefined && value !== '') {
            extracted[key] = String(value)
          }
        }
        if (Object.keys(extracted).length === 0) extracted = null
      } catch {
        // JSON parse failed — ignore extracted data
        extracted = null
      }
    }

    // Emergency keyword pre-check (belt and suspenders with the LLM classification)
    if (isEmergency(messageText) || isEmergency(rawResponse)) {
      classification = 'escalate'
    }

    return {
      response: cleanResponse(messageText),
      classification,
      inboxSummary: inboxSummary?.trim() || null,
      extracted,
    }
  } catch (err) {
    console.error('Failed to parse agent response:', err)

    // Fallback: use the raw response but hold for approval
    return {
      response: cleanResponse(rawResponse),
      classification: 'needs_approval',
      inboxSummary: 'Agent response needs review (parsing failed)',
      extracted: null,
    }
  }
}

/**
 * Extract content between XML-style tags.
 * Returns null if tag not found.
 */
function extractTag(text: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i')
  const match = text.match(regex)
  return match ? match[1].trim() : null
}

/**
 * Clean the response text for SMS delivery.
 * Removes any remaining XML tags, trims whitespace.
 */
function cleanResponse(text: string): string {
  return text
    .replace(/<\/?(?:response|classification|inbox_summary|extracted)[^>]*>/gi, '')
    .replace(/\{[^}]*"customer_name"[^}]*\}/g, '') // Remove stray extracted JSON
    .trim()
}

/**
 * Emergency keyword detection.
 * Pre-LLM safety check — catches emergencies even if the LLM misclassifies.
 */
const EMERGENCY_KEYWORDS = [
  'burning',
  'fire',
  'smoke',
  'electrocuted',
  'electric shock',
  'sparking',
  'dangerous',
  'smell burning',
  'on fire',
  'emergency',
  'arcing',
]

function isEmergency(text: string): boolean {
  const lower = text.toLowerCase()
  return EMERGENCY_KEYWORDS.some((keyword) => lower.includes(keyword))
}
