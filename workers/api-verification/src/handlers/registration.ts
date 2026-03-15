import type { NeonQueryFunction } from '@neondatabase/serverless'

interface RegisterResult {
  found: boolean
  name?: string
  scope?: string
  status?: string
}

/**
 * Verify an electrician's registration against the public register.
 * Updates the verifications table with the result.
 *
 * NICEIC: https://www.niceic.com/find-a-contractor
 * NAPIT: https://www.napit.org.uk/find-an-installer.html
 *
 * NOTE: These are web scrapes against public registers. The page structures
 * WILL change over time. When they do, the scraper breaks and alerting fires.
 * This is expected — the alerting handler catches it and flags for manual review.
 */
export async function handleRegistrationVerification(
  sql: NeonQueryFunction<false, false>,
  verificationId: string,
  scheme?: string,
  referenceNumber?: string
): Promise<void> {
  if (!scheme || !referenceNumber) {
    await updateVerification(sql, verificationId, 'failed', null, 'Missing scheme or reference number')
    return
  }

  try {
    let result: RegisterResult

    switch (scheme.toLowerCase()) {
      case 'niceic':
        result = await lookupNiceic(referenceNumber)
        break
      case 'napit':
        result = await lookupNapit(referenceNumber)
        break
      case 'elecsa':
        result = await lookupElecsa(referenceNumber)
        break
      case 'eca':
      case 'ozev':
        // These don't have easily scrapable public registers yet
        // Flag for manual review
        result = { found: false }
        await updateVerification(sql, verificationId, 'pending', {
          note: `${scheme.toUpperCase()} requires manual verification`,
          reference_number: referenceNumber,
        })
        return
      default:
        result = { found: false }
        await updateVerification(sql, verificationId, 'failed', null, `Unknown scheme: ${scheme}`)
        return
    }

    if (result.found) {
      await updateVerification(sql, verificationId, 'verified', {
        scheme: scheme.toUpperCase(),
        reference_number: referenceNumber,
        registered_name: result.name || null,
        scope: result.scope || null,
        register_status: result.status || null,
        verified_at: new Date().toISOString(),
      })
    } else {
      await updateVerification(sql, verificationId, 'failed', {
        scheme: scheme.toUpperCase(),
        reference_number: referenceNumber,
        reason: 'Not found on public register',
      })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lookup failed'
    console.error(`Registration verification failed for ${scheme} #${referenceNumber}:`, message)

    // Don't mark as failed on scrape errors — mark as pending for manual review
    // This handles the case where the register page structure has changed
    await updateVerification(sql, verificationId, 'pending', {
      scheme: scheme.toUpperCase(),
      reference_number: referenceNumber,
      error: message,
      requires_manual_review: true,
    })

    throw err // Re-throw so alerting fires
  }
}

/**
 * NICEIC public register lookup.
 * Searches the NICEIC Find a Contractor page.
 */
async function lookupNiceic(referenceNumber: string): Promise<RegisterResult> {
  try {
    const searchUrl = `https://www.niceic.com/find-a-contractor?search=${encodeURIComponent(referenceNumber)}`

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TradGo Verification/1.0)',
        'Accept': 'text/html',
      },
    })

    if (!response.ok) {
      throw new Error(`NICEIC returned ${response.status}`)
    }

    const html = await response.text()

    // Look for registration details in the response
    // These selectors will need updating when the page structure changes
    const hasResult = html.includes(referenceNumber) && !html.includes('No results found')

    if (!hasResult) {
      return { found: false }
    }

    // Extract name and scope from the HTML
    // Using basic string parsing — DOM parsing not available in Workers
    const nameMatch = html.match(/class="contractor-name[^"]*"[^>]*>([^<]+)</)
    const scopeMatch = html.match(/class="contractor-scope[^"]*"[^>]*>([^<]+)</)

    return {
      found: true,
      name: nameMatch?.[1]?.trim(),
      scope: scopeMatch?.[1]?.trim(),
      status: 'Current',
    }
  } catch (err) {
    console.error('NICEIC lookup error:', err)
    throw new Error(`NICEIC lookup failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * NAPIT public register lookup.
 */
async function lookupNapit(referenceNumber: string): Promise<RegisterResult> {
  try {
    const searchUrl = `https://www.napit.org.uk/find-an-installer.html`

    // NAPIT uses a form POST for search
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TradGo Verification/1.0)',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html',
      },
      body: `registration_number=${encodeURIComponent(referenceNumber)}`,
    })

    if (!response.ok) {
      throw new Error(`NAPIT returned ${response.status}`)
    }

    const html = await response.text()

    const hasResult = html.includes(referenceNumber) && !html.includes('No results')

    if (!hasResult) {
      return { found: false }
    }

    const nameMatch = html.match(/installer-name[^"]*"[^>]*>([^<]+)</)

    return {
      found: true,
      name: nameMatch?.[1]?.trim(),
      status: 'Current',
    }
  } catch (err) {
    console.error('NAPIT lookup error:', err)
    throw new Error(`NAPIT lookup failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * ELECSA public register lookup.
 */
async function lookupElecsa(referenceNumber: string): Promise<RegisterResult> {
  try {
    const searchUrl = `https://www.elecsa.co.uk/find-an-assessor?registration=${encodeURIComponent(referenceNumber)}`

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TradGo Verification/1.0)',
        'Accept': 'text/html',
      },
    })

    if (!response.ok) {
      throw new Error(`ELECSA returned ${response.status}`)
    }

    const html = await response.text()
    const hasResult = html.includes(referenceNumber) && !html.includes('No results')

    return {
      found: hasResult,
      status: hasResult ? 'Current' : undefined,
    }
  } catch (err) {
    console.error('ELECSA lookup error:', err)
    throw new Error(`ELECSA lookup failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Update the verifications table with the result.
 */
async function updateVerification(
  sql: NeonQueryFunction<false, false>,
  verificationId: string,
  status: 'pending' | 'verified' | 'failed',
  verifiedData: Record<string, unknown> | null,
  errorMessage?: string
): Promise<void> {
  if (status === 'verified') {
    await sql(
      `UPDATE verifications SET
        status = $1,
        verified_data = $2,
        verified_at = now()
      WHERE id = $3`,
      [status, JSON.stringify(verifiedData), verificationId]
    )
  } else {
    const data = verifiedData || (errorMessage ? { error: errorMessage } : null)
    await sql(
      `UPDATE verifications SET
        status = $1,
        verified_data = $2
      WHERE id = $3`,
      [status, data ? JSON.stringify(data) : null, verificationId]
    )
  }
}
