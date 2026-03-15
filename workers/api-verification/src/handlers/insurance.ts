import type { NeonQueryFunction } from '@neondatabase/serverless'

/**
 * Process an uploaded insurance certificate.
 *
 * For v1: stores the document key and marks as pending for manual review.
 * Future: OCR extraction via Claude Vision API to pull key fields automatically.
 *
 * The manual review approach is honest and secure for launch — we don't
 * auto-verify insurance without human confirmation. This protects both
 * the electrician and their customers.
 */
export async function handleInsuranceVerification(
  sql: NeonQueryFunction<false, false>,
  verificationId: string,
  documentR2Key?: string
): Promise<void> {
  if (!documentR2Key) {
    await sql(
      `UPDATE verifications SET status = 'failed', verified_data = $1 WHERE id = $2`,
      [JSON.stringify({ error: 'No document uploaded' }), verificationId]
    )
    return
  }

  try {
    // For v1: mark as pending with manual review flag
    // The document is already stored in R2 from the upload step
    // Admin will review and manually verify
    await sql(
      `UPDATE verifications SET
        status = 'pending',
        verified_data = $1
      WHERE id = $2`,
      [
        JSON.stringify({
          document_r2_key: documentR2Key,
          requires_manual_review: true,
          submitted_at: new Date().toISOString(),
          processing_note: 'Insurance certificate uploaded — awaiting manual verification',
        }),
        verificationId,
      ]
    )

    // TODO: Future enhancement — Claude Vision OCR
    // When ready, uncomment and implement:
    // const extracted = await extractInsuranceFields(documentR2Key)
    // if (extracted.confidence === 'high') {
    //   await sql(
    //     `UPDATE verifications SET status = 'verified', verified_data = $1, verified_at = now() WHERE id = $2`,
    //     [JSON.stringify(extracted), verificationId]
    //   )
    // }
  } catch (err) {
    console.error('Insurance verification failed:', err)

    await sql(
      `UPDATE verifications SET
        status = 'pending',
        verified_data = $1
      WHERE id = $2`,
      [
        JSON.stringify({
          document_r2_key: documentR2Key,
          requires_manual_review: true,
          error: err instanceof Error ? err.message : 'Processing failed',
        }),
        verificationId,
      ]
    )

    throw err
  }
}

/**
 * Future: Extract insurance fields from document using Claude Vision API.
 * Kept as scaffold for when Anthropic API key is added to this worker.
 */
// async function extractInsuranceFields(r2Key: string): Promise<ExtractedInsurance> {
//   // 1. Fetch document from R2
//   // 2. Convert to base64
//   // 3. Send to Claude Vision with prompt:
//   //    "Extract the following from this insurance certificate:
//   //     - Insurer name
//   //     - Policy number
//   //     - Expiry date
//   //     - Type of cover (public liability / professional indemnity / both)
//   //     Return as JSON."
//   // 4. Parse response
//   // 5. Return with confidence level
//   return { confidence: 'low' }
// }
