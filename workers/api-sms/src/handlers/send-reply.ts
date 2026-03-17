/**
 * Send a reply to a customer via the correct channel (SMS or WhatsApp).
 * Uses Twilio REST API for both — WhatsApp just adds the whatsapp: prefix.
 */
export async function sendReply(
  accountSid: string,
  authToken: string,
  from: string,
  to: string,
  body: string,
  channel: 'sms' | 'whatsapp'
): Promise<{ success: boolean; sid?: string; error?: string }> {
  // Add whatsapp: prefix for WhatsApp messages
  const formattedFrom = channel === 'whatsapp' ? `whatsapp:${from}` : from
  const formattedTo = channel === 'whatsapp' ? `whatsapp:${to}` : to

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

  const params = new URLSearchParams({
    From: formattedFrom,
    To: formattedTo,
    Body: body,
  })

  try {
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      },
      body: params.toString(),
    })

    const data = (await response.json()) as { sid?: string; message?: string; code?: number }

    if (!response.ok) {
      console.error('Twilio send error:', data)
      return { success: false, error: data.message || `Twilio returned ${response.status}` }
    }

    return { success: true, sid: data.sid }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Failed to send reply:', message)
    return { success: false, error: message }
  }
}
