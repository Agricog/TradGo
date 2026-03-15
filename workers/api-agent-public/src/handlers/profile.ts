import { neon } from '@neondatabase/serverless'
import type { Env } from '../index'

function json(data: unknown, status: number, request?: Request): Response {
  const origin = request?.headers.get('Origin') || '*'
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
      'Cache-Control': 'public, max-age=300',
    },
  })
}

/**
 * GET /api/agent-public/:slug/profile
 * Returns the public-facing agent profile. No auth required.
 * Only shows verified badges — never pending or failed.
 * Returns 404 for non-existent, suspended, or paused agents.
 */
export async function handleGetPublicProfile(
  request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  const sql = neon(env.NEON_DATABASE_URL)

  // Find the agent page and electrician
  const pageRows = await sql(
    `SELECT ap.electrician_id, ap.is_active, ap.slug,
            e.first_name, e.business_name, e.postcode, e.service_radius_miles,
            e.agent_status, e.phone
     FROM agent_pages ap
     JOIN electricians e ON ap.electrician_id = e.id
     WHERE ap.slug = $1`,
    [slug]
  )

  if (pageRows.length === 0) {
    return json({ error: 'Agent not found' }, 404, request)
  }

  const page = pageRows[0]

  // Don't expose suspended/deleted accounts
  if (!page.is_active) {
    return json({ error: 'Agent not found' }, 404, request)
  }

  const isLive = page.agent_status === 'live'

  // Get services
  const services = await sql(
    `SELECT category FROM services WHERE electrician_id = $1 ORDER BY created_at`,
    [page.electrician_id]
  )

  // Get verified badges ONLY — never show pending/failed to customers
  const verifications = await sql(
    `SELECT type, scheme, reference_number, verified_data
     FROM verifications
     WHERE electrician_id = $1 AND status = 'verified'`,
    [page.electrician_id]
  )

  // Increment view count (fire and forget)
  sql('UPDATE agent_pages SET views_count = views_count + 1 WHERE slug = $1', [slug]).catch(() => {})

  return json({
    slug: page.slug,
    first_name: page.first_name,
    business_name: page.business_name,
    area: page.postcode,
    service_radius_miles: page.service_radius_miles,
    phone: page.phone,
    is_live: isLive,
    services: services.map((s: Record<string, unknown>) => s.category),
    badges: verifications.map((v: Record<string, unknown>) => ({
      type: v.type,
      scheme: v.scheme,
      reference_number: v.reference_number,
      detail: v.verified_data,
    })),
  }, 200, request)
}
