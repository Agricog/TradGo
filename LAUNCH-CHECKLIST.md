# TradGo V1 Launch Checklist

## Environment Variables
- [ ] Railway: VITE_CLERK_PUBLISHABLE_KEY (production key, not dev)
- [ ] Railway: VITE_API_URL
- [ ] Railway: VITE_AGENT_PUBLIC_API_URL
- [ ] Railway: VITE_ABLY_PUBLIC_KEY
- [ ] Railway: VITE_SENTRY_DSN
- [ ] Cloudflare api-core: All secrets set (NEON_DATABASE_URL, CLERK_SECRET_KEY, etc.)
- [ ] Cloudflare api-sms: All secrets set
- [ ] Cloudflare api-agent-public: NEON_DATABASE_URL, ANTHROPIC_API_KEY
- [ ] Cloudflare api-stats: NEON_DATABASE_URL, ANTHROPIC_API_KEY, RESEND_API_KEY
- [ ] Cloudflare api-verification: NEON_DATABASE_URL, INTERNAL_SECRET

## Stripe (Switch to Live Mode)
- [ ] Create live products (Solo £149, Growth £199) in Stripe live mode
- [ ] Get live API keys (sk_live_, pk_live_)
- [ ] Update STRIPE_SECRET_KEY to live key
- [ ] Update STRIPE_PRICE_SOLO and STRIPE_PRICE_GROWTH to live price IDs
- [ ] Create live webhook endpoint pointing to /api/billing/webhook
- [ ] Update STRIPE_WEBHOOK_SECRET with live signing secret
- [ ] Test a real payment with a real card

## Clerk (Switch to Production)
- [ ] Create production Clerk instance
- [ ] Update CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY to production keys
- [ ] Configure production domain in Clerk
- [ ] Enable email/password + Google sign-in

## Domain & DNS
- [ ] Point tradgo.co.uk DNS to Railway
- [ ] Set up SSL certificate (Railway handles this)
- [ ] Update FRONTEND_URL in Cloudflare workers to https://tradgo.co.uk
- [ ] Set up custom domains for workers (api.tradgo.co.uk, agent-api.tradgo.co.uk)
- [ ] Update VITE_API_URL and VITE_AGENT_PUBLIC_API_URL to custom domains
- [ ] Update widget.js base URL to production domain

## Twilio
- [ ] Verify Twilio account for production use
- [ ] Ensure UK phone numbers are provisioned
- [ ] Webhook URL points to production api-sms worker

## Security
- [ ] All API keys are production keys (no test/dev keys)
- [ ] Neon database password is strong and not shared
- [ ] ENCRYPTION_KEY is a strong random 32-byte hex string
- [ ] npm audit shows no critical vulnerabilities
- [ ] CSP headers allow only required domains
- [ ] Rate limiting is active on all public endpoints

## Functional Testing
- [ ] New user can sign up and complete onboarding in <10 minutes
- [ ] Voice recording uploads and processes correctly
- [ ] Verification lookup runs for NICEIC/NAPIT numbers
- [ ] Agent goes live after onboarding
- [ ] SMS inbound → agent responds → appears in inbox
- [ ] Web chat → agent responds → appears in inbox
- [ ] Approve/edit/reject work from inbox
- [ ] Stats tab shows accurate numbers
- [ ] Agent rules can be added/edited/deleted
- [ ] Agent pause/resume works
- [ ] Stripe checkout completes successfully
- [ ] Stripe customer portal accessible
- [ ] Webhook processes subscription events correctly
- [ ] Widget loads on external website
- [ ] Agent page shows correct profile and badges
- [ ] OG image renders for social sharing

## Monitoring
- [ ] Sentry capturing frontend errors
- [ ] Cloudflare Workers logs enabled
- [ ] Stripe webhook delivery logs checked
- [ ] Daily digest email sending correctly

## Legal
- [ ] Privacy policy published on tradgo.co.uk/privacy
- [ ] Terms of service published on tradgo.co.uk/terms
- [ ] GDPR data export works
- [ ] Data retention policy documented (90 day archive, 12 month delete)

## Content
- [ ] Product name finalised (TradGo or other)
- [ ] All user-facing copy reviewed (no placeholder text)
- [ ] Error messages are human-readable
- [ ] Email templates reviewed (digest, notifications)
