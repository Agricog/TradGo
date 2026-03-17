import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Zap, ArrowLeft } from 'lucide-react'

export default function TermsPage() {
  useEffect(() => {
    document.title = 'Terms of Service — TradGo'
    const meta = document.querySelector('meta[name="description"]')
    if (meta) meta.setAttribute('content', 'TradGo terms of service. Rules and conditions for using the TradGo platform.')
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

        <h1 className="text-3xl font-bold text-surface-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-surface-500 mb-10">Last updated: March 2026</p>

        <div className="prose prose-surface max-w-none text-surface-700 leading-relaxed space-y-6">
          <h2 className="text-xl font-semibold text-surface-900 mt-8">1. Agreement</h2>
          <p>By creating a TradGo account or using the TradGo service, you agree to these Terms of Service ("Terms"). TradGo is operated by Autaimate Ltd ("we", "us", "our"). If you do not agree to these Terms, do not use the service.</p>

          <h2 className="text-xl font-semibold text-surface-900 mt-8">2. The service</h2>
          <p>TradGo provides an AI-powered customer enquiry management platform for UK electricians. The service includes an AI conversation agent that handles customer enquiries via SMS and WhatsApp, a dashboard for managing conversations, approvals, and analytics, a public agent page for receiving customer enquiries, and verification of professional credentials. The AI agent acts on your behalf based on the information you provide during onboarding. You are responsible for the accuracy of your services, pricing, and availability information.</p>

          <h2 className="text-xl font-semibold text-surface-900 mt-8">3. Eligibility</h2>
          <p>You must be at least 18 years old, a UK-based electrician or electrical contractor, and operating a legitimate electrical services business. We reserve the right to verify your identity and professional credentials.</p>

          <h2 className="text-xl font-semibold text-surface-900 mt-8">4. Your account</h2>
          <p>You are responsible for maintaining the security of your account credentials. You must not share your account with others. You are responsible for all activity that occurs under your account. If you suspect unauthorised access, notify us immediately at support@tradgo.co.uk.</p>

          <h2 className="text-xl font-semibold text-surface-900 mt-8">5. AI agent responsibilities</h2>
          <p>The AI agent generates responses based on the information you provide. While we strive for accuracy, you acknowledge that the AI may occasionally produce incorrect or incomplete information. You are responsible for reviewing and approving estimates and pricing before they are sent to customers. TradGo is not liable for any loss arising from AI-generated responses that you approved or that were classified as safe and auto-sent. Emergency messages (fire, electrocution, danger) are escalated with instructions to call 999. TradGo does not provide emergency services.</p>

          <h2 className="text-xl font-semibold text-surface-900 mt-8">6. Acceptable use</h2>
          <p>You must not use TradGo to send spam or unsolicited messages, provide false or misleading information to customers, impersonate another person or business, engage in any illegal activity, or attempt to circumvent security measures or rate limits. We reserve the right to suspend or terminate accounts that violate these rules.</p>

          <h2 className="text-xl font-semibold text-surface-900 mt-8">7. SMS and WhatsApp messaging</h2>
          <p>Messages are sent via third-party providers (Twilio) on your behalf. Standard messaging rates may apply to customers depending on their mobile plan. You must comply with all applicable UK communications regulations including the Privacy and Electronic Communications Regulations 2003. TradGo is not responsible for message delivery failures caused by carrier issues, network outages, or incorrect phone numbers.</p>

          <h2 className="text-xl font-semibold text-surface-900 mt-8">8. Verification</h2>
          <p>If you submit professional credentials (NICEIC, NAPIT, ELECSA registration, insurance documents), you warrant that these are genuine and current. Providing false verification documents will result in immediate account termination. We verify credentials against scheme databases where possible but do not guarantee the accuracy of third-party verification data.</p>

          <h2 className="text-xl font-semibold text-surface-900 mt-8">9. Pricing and payment</h2>
          <p>TradGo offers a free trial period. After the trial, continued use of the service requires a paid subscription. Prices are in GBP and exclusive of VAT unless stated otherwise. We reserve the right to change pricing with 30 days' notice. You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period.</p>

          <h2 className="text-xl font-semibold text-surface-900 mt-8">10. Intellectual property</h2>
          <p>The TradGo platform, including its design, code, and AI models, is our intellectual property. You retain ownership of all content you provide (business details, pricing, voice recordings). By using TradGo, you grant us a licence to use your content solely for the purpose of providing the service.</p>

          <h2 className="text-xl font-semibold text-surface-900 mt-8">11. Data protection</h2>
          <p>We process personal data in accordance with our Privacy Policy and UK GDPR. You are a data controller for your customers' personal data. We act as a data processor on your behalf. You must have a lawful basis for sharing your customers' data with TradGo (typically consent or legitimate interest).</p>

          <h2 className="text-xl font-semibold text-surface-900 mt-8">12. Limitation of liability</h2>
          <p>To the maximum extent permitted by law, TradGo's total liability for any claim arising from the service is limited to the fees you paid in the 12 months preceding the claim. We are not liable for any indirect, incidental, consequential, or punitive damages. We are not liable for lost revenue, lost customers, or business interruption arising from service downtime or AI errors. Nothing in these Terms limits liability for death or personal injury caused by negligence, fraud, or any liability that cannot be excluded by law.</p>

          <h2 className="text-xl font-semibold text-surface-900 mt-8">13. Service availability</h2>
          <p>We aim for high availability but do not guarantee uninterrupted service. We may perform maintenance that temporarily affects availability. We will provide reasonable notice of planned maintenance where possible.</p>

          <h2 className="text-xl font-semibold text-surface-900 mt-8">14. Termination</h2>
          <p>You may close your account at any time by contacting support@tradgo.co.uk. We may terminate or suspend your account if you breach these Terms, fail to pay fees when due, or if required by law. Upon termination, your data will be handled in accordance with our Privacy Policy.</p>

          <h2 className="text-xl font-semibold text-surface-900 mt-8">15. Changes to these terms</h2>
          <p>We may update these Terms from time to time. We will notify you of material changes via email. Continued use of the service after changes take effect constitutes acceptance of the updated Terms.</p>

          <h2 className="text-xl font-semibold text-surface-900 mt-8">16. Governing law</h2>
          <p>These Terms are governed by the laws of England and Wales. Any disputes will be subject to the exclusive jurisdiction of the courts of England and Wales.</p>

          <h2 className="text-xl font-semibold text-surface-900 mt-8">17. Contact</h2>
          <p>For questions about these Terms, contact us at support@tradgo.co.uk.</p>
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
