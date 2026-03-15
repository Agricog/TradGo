import { neon } from '@neondatabase/serverless'

/**
 * Send an SMS via Twilio REST API.
 * Used when electrician approves a held message.
 */
export async function sendSms(
  accountSid: string,
  authToken: string,
  from: string,
  to: string,
  body: string
): Promise<{ success: boolean; sid?: string; error?: string }> {
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

    const credentials = btoa(`${accountSid}:${authToken}`)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: from,
        To: to,
        Body: body,
      }).toString(),
    })

    const data = (await response.json()) as {
      sid?: string
      error_code?: number
      error_message?: string
    }

    if (!response.ok || data.error_code) {
      console.error('Twilio send error:', data)
      return {
        success: false,
        error: data.error_message || `Twilio error ${response.status}`,
      }
    }

    return { success: true, sid: data.sid }
  } catch (err) {
    console.error('SMS send failed:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown send error',
    }
  }
}

/**
 * Send an approved agent message to the customer.
 * Looks up the conversation details and sends via Twilio.
 */
export async function sendApprovedMessage(
  sql: ReturnType<typeof neon>,
  accountSid: string,
  authToken: string,
  messageId: string,
  content: string
): Promise<boolean> {
  // Get the conversation and electrician details for this message
  const rows = await sql(
    `SELECT c.customer_phone, e.twilio_number
     FROM messages m
     JOIN conversations c ON m.conversation_id = c.id
     JOIN electricians e ON c.electrician_id = e.id
     WHERE m.id = $1`,
    [messageId]
  )

  if (rows.length === 0) {
    console.error('Message not found:', messageId)
    return false
  }

  const customerPhone = rows[0].customer_phone as string
  const twilioNumber = rows[0].twilio_number as string

  if (!customerPhone || !twilioNumber) {
    console.error('Missing phone numbers for message:', messageId)
    return false
  }

  const result = await sendSms(accountSid, authToken, twilioNumber, customerPhone, content)

  if (result.success) {
    // Mark message as sent
    await sql(
      `UPDATE messages SET sent = true, sent_at = now() WHERE id = $1`,
      [messageId]
    )
  }

  return result.success
}
