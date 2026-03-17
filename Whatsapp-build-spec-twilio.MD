# TradGo — WhatsApp Integration Build Spec (Twilio Approach)

## Overview

Add WhatsApp as a second inbound/outbound channel alongside existing SMS. Both channels use the same Twilio account, same webhook, same conversation engine. No separate worker needed.

**Zero changes to the existing SMS flow.** Customers choose WhatsApp or SMS on the agent page.

---

## Architecture

```
Customer (WhatsApp) ──► Twilio (whatsapp:+44...) ──┐
                                                    ├──► api-sms worker ──► Conversation Engine (Claude)
Customer (SMS) ──────► Twilio (+44...) ────────────┘           │
                                                                ▼
                                                          Neon DB (unified)
                                                                │
                                                                ▼
                                                        Dashboard Inbox
                                                     (shows both channels)
```

Key insight: Twilio sends WhatsApp messages to the **same webhook URL** as SMS. The only difference is the `From` and `To` fields have a `whatsapp:` prefix. Your existing `api-sms` worker already receives these — it just needs to detect the prefix and respond accordingly.

---

## Pre-Build Setup (Manual — Twilio Side)

### Step 1: WhatsApp Sandbox (for testing NOW — no verification needed)

1. Go to **Twilio Console** → **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Twilio gives you a sandbox number and a join code (e.g. "join happy-turtle")
3. Send that join code from your personal WhatsApp to the sandbox number
4. You can now send/receive WhatsApp messages through Twilio's sandbox
5. The sandbox uses the **same webhook URL** as your SMS — point it to `https://tradgo-api-sms.micks43.workers.dev/api/sms/inbound`

### Step 2: Production WhatsApp Sender (after Meta verification clears)

1. Go to **Twilio Console** → **Messaging** → **Senders** → **WhatsApp Senders**
2. Tap **Add WhatsApp Sender** (Self Sign-up)
3. Twilio walks you through connecting your Meta Business Account
4. Register a phone number for WhatsApp (can be the same Twilio number or a new one)
5. Twilio handles the Meta API layer — you never touch the Meta Developer portal

**Requirements for production:**
- Upgraded Twilio account (not trial) — you already have this
- Meta Business verification approved — already in review
- Admin access to Meta Business Portfolio — you have this

---

## Build Plan

### Batch WA-1: Update api-sms Worker to Handle WhatsApp (3 file changes)

No new worker. Update the existing `api-sms` worker to detect and handle WhatsApp messages.

**File 1: `workers/api-sms/src/index.ts`**

Changes:
- Detect `whatsapp:` prefix on `From` and `To` fields
- Strip prefix before looking up electrician/customer phone
- Pass channel type (`sms` or `whatsapp`) to inbound handler

```typescript
// Current: from = "+447123456789"
// WhatsApp: from = "whatsapp:+447123456789"

const isWhatsApp = (from: string) => from.startsWith('whatsapp:')
const cleanPhone = (phone: string) => phone.replace('whatsapp:', '')
```

**File 2: `workers/api-sms/src/handlers/inbound.ts`**

Changes:
- Accept `channel` parameter ('sms' | 'whatsapp')
- Store channel on conversation record
- Use channel-aware reply function (TwiML works for both, but format reply with `whatsapp:` prefix for WhatsApp)
- When creating new conversation: `channel = 'whatsapp'` or `channel = 'sms'`

**File 3: `workers/api-sms/src/handlers/send-reply.ts`** (new file)

Outbound reply helper that handles both channels:
- For SMS: send via Twilio as normal (TwiML response or REST API)
- For WhatsApp: send via Twilio REST API with `whatsapp:` prefix on To/From
- Used by approval flow when electrician sends manual replies

```typescript
// SMS
await twilioClient.messages.create({
  to: '+447123456789',
  from: '+44TWILIO_NUMBER',
  body: 'Your estimate is ready...'
})

// WhatsApp — same API, just add prefix
await twilioClient.messages.create({
  to: 'whatsapp:+447123456789',
  from: 'whatsapp:+44TWILIO_NUMBER',
  body: 'Your estimate is ready...'
})
```

### Batch WA-2: Database Migration + Electrician Settings (1 migration + 2 file changes)

**Migration:**
```sql
-- Add WhatsApp number field to electricians
ALTER TABLE electricians ADD COLUMN whatsapp_number TEXT;

-- Ensure conversations table channel column accepts 'whatsapp'
-- (channel column already exists from original build, just verify it accepts the value)
```

**File 1: Onboarding flow** — Add optional "WhatsApp Business Number" field to the setup wizard. This is the number the electrician wants to receive WhatsApp enquiries on.

**File 2: Dashboard settings** — Allow electrician to add/change their WhatsApp number after onboarding.

### Batch WA-3: Agent Page + Dashboard Inbox Updates (2 file changes)

**File 1: Agent page (`AgentPage.tsx` / `ContactCapture.tsx`)**

Add WhatsApp contact option alongside existing SMS/chat:
- WhatsApp button uses deep link: `https://wa.me/44XXXXXXXXX?text=Hi, I found you on TradGo...`
- Opens WhatsApp on customer's phone — no extra UI needed
- Only shows if electrician has `whatsapp_number` set
- WhatsApp button is primary (green), SMS is secondary

Layout:
```
┌─────────────────────────────┐
│  💬  Message via WhatsApp   │  ← green, primary
├─────────────────────────────┤
│  📱  Text via SMS           │  ← secondary
└─────────────────────────────┘
```

**File 2: Inbox (`ConversationCard.tsx`)**

- Show channel badge on each conversation (WhatsApp icon / SMS icon)
- Read from existing `channel` column on conversations table
- Optional: filter toggle (All / WhatsApp / SMS)

---

## File Count Summary

| Batch | New Files | Changed Files | Description |
|-------|-----------|---------------|-------------|
| WA-1  | 1         | 2             | api-sms WhatsApp detection + reply helper |
| WA-2  | 0         | 2 + migration | DB column + onboarding + settings |
| WA-3  | 0         | 2             | Agent page button + inbox badge |

**Total: 1 new file, 6 changed files, 1 SQL migration, 3 batches.**

---

## Twilio WhatsApp vs SMS: Key Differences

| Feature | SMS | WhatsApp |
|---------|-----|----------|
| Phone format | `+447...` | `whatsapp:+447...` |
| Webhook | Same URL | Same URL |
| Send API | Twilio REST / TwiML | Twilio REST (with prefix) |
| Media support | MMS (limited) | Images, docs, location |
| Message window | None | 24-hour reply window |
| Cost (UK) | ~3-5p per message | ~1-3p per conversation (24hr) |
| Rich formatting | None | Bold, italic, lists |

**24-hour window note:** WhatsApp requires replies within 24 hours of the customer's last message. After that, you need a pre-approved template message. For TradGo this isn't an issue — the agent replies immediately. For follow-ups after 24hrs (e.g. electrician sends a manual reply the next day), you'll need one approved template message like: "Hi {{1}}, {{2}} has responded to your enquiry. Reply to this message to continue the conversation."

---

## Testing Checklist

**Sandbox testing (do now):**
- [ ] Join Twilio WhatsApp sandbox from personal phone
- [ ] Point sandbox webhook to api-sms worker
- [ ] Send WhatsApp message → agent responds
- [ ] Conversation stored with channel = 'whatsapp'
- [ ] SMS still works unchanged

**Production testing (after Meta verification):**
- [ ] Register production WhatsApp sender in Twilio Console
- [ ] Send WhatsApp to production number → agent responds
- [ ] Agent page shows both WhatsApp and SMS options
- [ ] Inbox shows correct channel badge
- [ ] Electrician can reply via dashboard → reply sent on correct channel
- [ ] Rate limiting applies to WhatsApp conversations

---

## Cost Estimate

| Item | Cost |
|------|------|
| Twilio WhatsApp (customer-initiated) | ~£0.01-0.03 per 24hr conversation |
| Twilio WhatsApp (business-initiated) | ~£0.05-0.08 per 24hr conversation |
| First 1,000 conversations/month | Free on Meta's tier |
| Twilio SMS (existing) | ~£0.04 per message |

WhatsApp is cheaper than SMS for multi-message conversations since you pay per 24-hour window, not per message.

---

## Future Enhancements (not in V1)

- **WhatsApp interactive buttons** — "Approve this estimate? [Yes] [No]" sent to electrician's WhatsApp
- **Image handling** — Customer sends photo of the job, stored in R2, shown in dashboard
- **Location sharing** — Customer shares location pin, auto-fills job postcode
- **Template messages** — For following up after the 24-hour window
- **Read receipts** — WhatsApp shows blue ticks, Twilio can surface these via webhooks
