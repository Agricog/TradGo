import { neon } from '@neondatabase/serverless'
import type { Env } from '../index'

/**
 * GET /api/agent-public/:slug/og-image
 * Generates an SVG social sharing image for the agent page.
 * Social platforms that don't support SVG will show the fallback text from OG tags.
 * For PNG conversion, use @resvg/resvg-wasm in a future iteration.
 */
export async function handleOgImage(
  request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  const sql = neon(env.NEON_DATABASE_URL)

  const rows = await sql(
    `SELECT e.first_name, e.business_name, e.postcode,
            ap.slug
     FROM agent_pages ap
     JOIN electricians e ON ap.electrician_id = e.id
     WHERE ap.slug = $1 AND ap.is_active = true`,
    [slug]
  )

  if (rows.length === 0) {
    return new Response('Not found', { status: 404 })
  }

  const elec = rows[0]
  const displayName = (elec.business_name as string) || `${elec.first_name}'s Electrical`
  const area = elec.postcode ? `${elec.postcode} & surrounding areas` : ''

  // Get badges
  const badges = await sql(
    `SELECT type, scheme FROM verifications
     WHERE electrician_id = (SELECT electrician_id FROM agent_pages WHERE slug = $1)
     AND status = 'verified'`,
    [slug]
  )

  const badgeTexts = badges.map((b: Record<string, unknown>) => {
    if (b.type === 'registration') return `✅ ${b.scheme} Registered`
    if (b.type === 'insurance') return `✅ Insured`
    return ''
  }).filter(Boolean)

  // Escape XML special characters
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f0fdf4"/>
      <stop offset="100%" stop-color="#ffffff"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Green accent bar -->
  <rect x="0" y="0" width="8" height="630" fill="#16a34a"/>

  <!-- Lightning bolt icon -->
  <text x="80" y="240" font-size="64" fill="#16a34a">⚡</text>

  <!-- Business name -->
  <text x="160" y="240" font-family="system-ui, -apple-system, sans-serif" font-size="48" font-weight="bold" fill="#0f172a">
    ${esc(displayName)}
  </text>

  <!-- Area -->
  ${area ? `<text x="160" y="290" font-family="system-ui, -apple-system, sans-serif" font-size="28" fill="#64748b">
    ${esc(area)}
  </text>` : ''}

  <!-- Badges -->
  ${badgeTexts.map((badge: string, i: number) => `<text x="160" y="${340 + i * 40}" font-family="system-ui, -apple-system, sans-serif" font-size="24" fill="#16a34a">
    ${esc(badge)}
  </text>`).join('\n  ')}

  <!-- CTA -->
  <text x="160" y="${badgeTexts.length > 0 ? 340 + badgeTexts.length * 40 + 50 : 370}" font-family="system-ui, -apple-system, sans-serif" font-size="26" fill="#475569">
    💬 Chat with ${esc(elec.first_name as string)}'s agent for a quote
  </text>

  <!-- TradGo branding -->
  <text x="1080" y="590" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="#94a3b8" text-anchor="end">
    TradGo
  </text>
</svg>`

  return new Response(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
