import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Zap, ArrowLeft } from 'lucide-react'

export default function PrivacyPage() {
  useEffect(() => {
    document.title = 'Privacy Policy — TradGo'
    const meta = document.querySelector('meta[name="description"]')
    if (meta) meta.setAttribute('content', 'TradGo privacy policy. How we collect, use, and protect your data.')
    window.scrollTo(0, 0)
    return () => { document.title = 'TradGo' }
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-surface-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Zap className="h-7 w-7 text-brand-600" />
            <span className="text-xl font-bold text-surface-900">TradGo</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-900 transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <h1 className="text-3xl font-bold text-surface-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-surface-500 mb-10">Last updated: March 2026</p>

        <div className="prose prose-surface max-w-none text-surface-700 leading-relaxed space-y-6">
          <h2 className="text-xl font-semibold text-surface-900 mt-8">1. Who we are</h2>
          <p>TradGo ("we", "us", "our") is a trading name of Autaimate Ltd. We provide an AI-powered customer enquiry management platform for UK electricians. Our website is tradgo.co.uk.</p>

          <h2 className="text-xl font-semibold text-surface-900 mt-8">2. What data we collect</h2>
          <p><strong>From electricians (our users):</strong> Name, email address, phone number, business name, postcode, service area, pricing information, voice recordings (for agent tone training), verification documents (NICEIC/NAPIT registration numbers, insurance details).</p>
          <p><strong>From customers (people who contact our users):</strong> Phone number, name (if provided), message content, job details shared during conversations.</p>
          <p><strong>Automatically:</strong> IP address, browser type, device information, pages visited, and cookies necessary for the service to function.</p>

          <h2 className="text-xl font-semibold text-surface-900 mt-8">3. How we use your data</h2>
          <p>We use the data we collect to provide and improve the TradGo service, including powering the AI conversation engine, generating estimates based on electrician pricing, verifying professional credentials, sending SMS and WhatsApp messages on behalf of electricians, providing dashboard analytics, and communicating service updates.</p>

          <h2 className="text-xl font-semibold text-surface-900 mt-8">4. Legal basis for processing</h2>
          <p>We process data under the following legal bases as defined by UK GDPR: <strong>Contract performance</strong> (providing the TradGo service to electricians), <strong>Legitimate interests</strong> (improving the service, preventing fraud), and <strong>Consent</strong> (where customers initiate contact via SMS or WhatsApp).</p>

          <h2 className="text-xl font-semibold text-surface-900 mt-8">5. AI and automated processing</h2>
          <p>TradGo uses artificial intelligence (Claude by Anthropic) to generate responses to customer enquiries. The AI processes message content to understand the enquiry, provide relevant information, and classify the response. All responses involving pricing or estimates are held for the electrician's manual approval before being sent to the customer. No fully automated decisions with legal or significant effects are made.</p>

          <h2 className="text-xl font-semibold text-surface-900 mt-8">6. Data sharing</h2>
          <p>We share data with the following third-party processors, all of whom are GDPR-compliant: <strong>Anthropic</strong> (AI processing), <strong>Twilio</strong> (SMS and WhatsApp delivery), <strong>Clerk</strong> (authentication), <strong>Neon</strong> (database hosting), <strong>Cloudflare</strong> (infrastructure and file storage), <strong>Railway</strong> (application hosting), and <strong>Stripe</strong> (payment processing). We do not sell personal data to third parties.</p>

          <h2 className="text-xl font-semibold text-surface-900 mt-8">7. Data retention</h2>
          <p>Conversation data is retained for 12 months from the last message, after which it is automatically deleted. Account data is retained for the duration of the account plus 30 days after deletion. Voice recordings are retained for the duration of the account and deleted within 7 days of account closure. Verification documents are retained only until verification is complete, then deleted.</p>

          <h2 className="text-xl font-semibold text-surface-900 mt-8">8. Your rights</h2>
          <p>Under UK GDPR you have the right to access your personal data, rectify inaccurate data, erase your data ("right to be forgotten"), restrict processing, data portability, object to processing, and withdraw consent at any time. To exercise any of these rights, contact us at privacy@tradgo.co.uk.</p>

          <h2 className="text-xl font-semibold text-surface-900 mt-8">9. Data security</h2>
          <p>We use industry-standard security measures including encryption in transit (TLS 1.2+), encrypted database connections, access controls via Clerk authentication, rate limiting to prevent abuse, and regular security monitoring via Sentry. All infrastructure is hosted in European data centres.</p>

          <h2 className="text-xl font-semibold text-surface-900 mt-8">10. Cookies</h2>
          <p>We use essential cookies required for authentication and session management. We do not use advertising or tracking cookies. Analytics, if enabled, use privacy-respecting methods that do not track individuals.</p>

          <h2 className="text-xl font-semibold text-surface-900 mt-8">11. Children</h2>
          <p>TradGo is a business service and is not intended for use by anyone under the age of 18.</p>

          <h2 className="text-xl font-semibold text-surface-900 mt-8">12. Changes to this policy</h2>
          <p>We may update this policy from time to time. We will notify registered users of significant changes via email. The "last updated" date at the top of this page indicates when the policy was last revised.</p>

          <h2 className="text-xl font-semibold text-surface-900 mt-8">13. Contact us</h2>
          <p>If you have questions about this privacy policy or your personal data, contact us at privacy@tradgo.co.uk.</p>
          <p>If you are not satisfied with our response, you have the right to lodge a complaint with the Information Commissioner's Office (ICO) at ico.org.uk.</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-surface-100 bg-white mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <p className="text-xs text-surface-400">© {new Date().getFullYear()} TradGo. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
