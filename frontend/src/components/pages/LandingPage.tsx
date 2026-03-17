import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Zap, MessageSquare, Shield, Clock, BarChart3, Bot, ArrowRight, CheckCircle2, Phone, Star } from 'lucide-react'

// ============================================================
// SEO: JSON-LD Structured Data (Point 11)
// ============================================================
const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://tradgo.co.uk/#organization',
      name: 'TradGo',
      url: 'https://tradgo.co.uk',
      logo: 'https://tradgo.co.uk/favicon.svg',
      description: 'TradGo provides UK electricians with a verified AI agent that handles customer enquiries, generates estimates, and books visits via SMS and WhatsApp.',
      foundingDate: '2026',
      areaServed: { '@type': 'Country', name: 'United Kingdom' },
      sameAs: [],
    },
    {
      '@type': 'WebPage',
      '@id': 'https://tradgo.co.uk/#webpage',
      url: 'https://tradgo.co.uk',
      name: 'TradGo — AI Agent for UK Electricians | Never Miss an Enquiry',
      description: 'TradGo gives UK electricians a verified AI agent that answers customer enquiries 24/7, sends estimates, and books visits — so you never lose work to a missed call again.',
      isPartOf: { '@id': 'https://tradgo.co.uk/#organization' },
      speakable: {
        '@type': 'SpeakableSpecification',
        cssSelector: ['#quick-answer', 'h1'],
      },
    },
    {
      '@type': 'SoftwareApplication',
      name: 'TradGo',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'GBP',
        description: 'Free trial available',
      },
      description: 'AI-powered customer enquiry management for UK electricians. Handles SMS and WhatsApp messages, provides estimates, and books visits automatically.',
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '12',
        bestRating: '5',
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is TradGo?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'TradGo is an AI agent built specifically for UK electricians. It answers customer enquiries 24/7 via SMS and WhatsApp, provides accurate estimates based on your pricing, and books site visits — so you never miss work because you were on a job.',
          },
        },
        {
          '@type': 'Question',
          name: 'How does the AI agent know my prices?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'During onboarding you enter your services and pricing ranges. The agent uses these to give customers accurate ballpark estimates. For anything it\'s unsure about, it holds the message for your approval before sending.',
          },
        },
        {
          '@type': 'Question',
          name: 'Will customers know they are talking to AI?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'The agent introduces itself as your agent — it says "Hi, I\'m [your name]\'s agent" so the customer knows they\'re not talking to you directly. It speaks naturally in your voice and tone, so conversations feel personal and professional.',
          },
        },
        {
          '@type': 'Question',
          name: 'What happens if the agent gets a question wrong?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'TradGo classifies every response into three categories: SAFE (auto-sends), APPROVAL (holds for your review), and ESCALATE (flags as urgent). Estimates and pricing always go through your approval first. You have full control.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does TradGo work with WhatsApp?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. TradGo supports both SMS and WhatsApp through the same conversation engine. Customers can message you on whichever channel they prefer and the agent handles both identically.',
          },
        },
        {
          '@type': 'Question',
          name: 'How much does TradGo cost?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'TradGo offers a free trial so you can test the full product with real customers. After that, pricing is based on usage. There are no setup fees and you can cancel anytime.',
          },
        },
        {
          '@type': 'Question',
          name: 'Do I need to be NICEIC registered to use TradGo?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No, TradGo is available to all UK electricians. However, if you are registered with a competent person scheme like NICEIC, NAPIT, or ELECSA, TradGo verifies and displays your credentials on your agent page — building trust with customers.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I see what the agent says before it sends?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Any message involving pricing, estimates, or sensitive topics is held in your dashboard for approval. You can approve it as-is, edit it, or reject it and write your own reply. Simple information responses are sent automatically.',
          },
        },
        {
          '@type': 'Question',
          name: 'How long does it take to set up TradGo?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Most electricians complete onboarding in under 10 minutes. You enter your details, services, and pricing — then your AI agent goes live immediately. You can start receiving customer enquiries the same day.',
          },
        },
        {
          '@type': 'Question',
          name: 'What if I want to reply to a customer myself?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'You can take over any conversation at any time from your dashboard. When you reply directly, the agent pauses for that conversation so there is no overlap. You are always in control.',
          },
        },
      ],
    },
    {
      '@type': 'HowTo',
      name: 'How to Set Up TradGo',
      step: [
        { '@type': 'HowToStep', position: 1, name: 'Sign up', text: 'Create your account and enter your business details, location, and service radius.' },
        { '@type': 'HowToStep', position: 2, name: 'Add your services', text: 'Select the electrical services you offer and set your pricing ranges or day rates.' },
        { '@type': 'HowToStep', position: 3, name: 'Go live', text: 'Your AI agent goes live with its own page and phone number. Share it with customers and start receiving enquiries.' },
      ],
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tradgo.co.uk' },
      ],
    },
  ],
}

// ============================================================
// Features data
// ============================================================
const FEATURES = [
  {
    icon: MessageSquare,
    title: 'Never miss an enquiry',
    description: 'Your AI agent answers customer texts and WhatsApp messages instantly — even when you\'re up a ladder or under a floor.',
  },
  {
    icon: Shield,
    title: 'You stay in control',
    description: 'Estimates and pricing always go through your approval. Simple questions get answered automatically. Emergencies get escalated to you immediately.',
  },
  {
    icon: Bot,
    title: 'Speaks in your voice',
    description: 'The agent learns your tone, your services, and your pricing. Customers get a response that sounds like it came from you — because it was trained on you.',
  },
  {
    icon: Clock,
    title: '24/7 without the overtime',
    description: 'Enquiries come in at 9pm, 6am, weekends. Your agent handles them all and you review the conversations when you\'re ready.',
  },
  {
    icon: BarChart3,
    title: 'See what\'s coming in',
    description: 'Your dashboard shows every conversation, estimate, and booking in one place. Filter by status, see what needs your attention, and track your pipeline.',
  },
  {
    icon: Phone,
    title: 'SMS and WhatsApp',
    description: 'Customers contact you however they prefer. Both channels feed into the same conversation engine and appear in one unified inbox.',
  },
]

const STEPS = [
  { number: '1', title: 'Sign up and set your services', description: 'Enter your details, the electrical work you do, and your pricing. Takes about 10 minutes.' },
  { number: '2', title: 'Your agent goes live', description: 'You get a personal agent page with your own URL and phone number. Share it on your van, your cards, your social media.' },
  { number: '3', title: 'Customers get instant replies', description: 'When someone texts or WhatsApps, your agent handles the conversation — asking the right questions, giving estimates, and booking visits.' },
]

// ============================================================
// Component
// ============================================================
export default function LandingPage() {
  // SEO: Points 1-5 (meta tags set via useEffect for SPA)
  useEffect(() => {
    document.title = 'TradGo — AI Agent for UK Electricians | Never Miss an Enquiry'

    const setMeta = (name: string, content: string, property = false) => {
      const attr = property ? 'property' : 'name'
      let el = document.querySelector(`meta[${attr}="${name}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, name)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }

    // Point 2: Meta description
    setMeta('description', 'TradGo gives UK electricians a verified AI agent that answers customer enquiries 24/7, sends estimates, and books visits. Never lose work to a missed call again. Free trial.')
    // Point 3: Canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = 'https://tradgo.co.uk'
    // Points 6-9: OG + Twitter
    setMeta('og:type', 'website', true)
    setMeta('og:title', 'TradGo — AI Agent for UK Electricians | Never Miss an Enquiry', true)
    setMeta('og:description', 'Your AI agent answers customer enquiries 24/7, sends estimates, and books visits. Built for UK electricians.', true)
    setMeta('og:url', 'https://tradgo.co.uk', true)
    setMeta('og:image', 'https://tradgo.co.uk/og-image.jpg', true)
    setMeta('twitter:card', 'summary_large_image')
    setMeta('twitter:title', 'TradGo — AI Agent for UK Electricians')
    setMeta('twitter:description', 'Never miss an enquiry. Your AI agent handles customer texts and WhatsApp 24/7.')
    // Point 10: Author
    setMeta('author', 'TradGo')

    // Point 11: Structured data
    let script = document.querySelector('#ld-json') as HTMLScriptElement
    if (!script) {
      script = document.createElement('script')
      script.id = 'ld-json'
      script.type = 'application/ld+json'
      document.head.appendChild(script)
    }
    script.textContent = JSON.stringify(STRUCTURED_DATA)

    return () => {
      document.title = 'TradGo'
      script?.remove()
    }
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* ============================================================ */}
      {/* NAV */}
      {/* ============================================================ */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-surface-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Zap className="h-7 w-7 text-brand-600" />
            <span className="text-xl font-bold text-surface-900">TradGo</span>
          </Link>
          <div className="flex items-center gap-3">
            <a href="#how-it-works" className="hidden sm:block text-sm text-surface-600 hover:text-surface-900 transition-colors">
              How it works
            </a>
            <a href="#faq" className="hidden sm:block text-sm text-surface-600 hover:text-surface-900 transition-colors">
              FAQ
            </a>
            <Link
              to="/dashboard"
              className="text-sm font-medium text-surface-700 hover:text-surface-900 transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/dashboard"
              className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </nav>

      {/* ============================================================ */}
      {/* HERO (Point 12: H1 unique, Point 14: Quick Answer) */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-emerald-50" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-surface-900 tracking-tight leading-[1.1]">
              Your AI agent answers&nbsp;enquiries while you're on&nbsp;the&nbsp;job
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-surface-600 leading-relaxed max-w-2xl">
              TradGo gives UK electricians a verified AI agent that handles customer texts and WhatsApp messages 24/7 — sending estimates, answering questions, and booking visits so you never lose work to a missed call again.
            </p>
            {/* Point 14: Quick Answer Box */}
            <p id="quick-answer" className="sr-only">
              TradGo is an AI agent for UK electricians that answers customer enquiries via SMS and WhatsApp, provides estimates, and books visits automatically.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3.5 rounded-xl text-base transition-colors shadow-sm"
              >
                Start your free trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-surface-50 text-surface-700 font-medium px-6 py-3.5 rounded-xl text-base transition-colors border border-surface-200"
              >
                See how it works
              </a>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-surface-500">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-brand-500" /> No credit card required</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-brand-500" /> Live in 10 minutes</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-brand-500" /> Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SOCIAL PROOF BAR */}
      {/* ============================================================ */}
      <section className="border-y border-surface-100 bg-surface-50/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-wrap items-center justify-center gap-8 text-sm text-surface-500">
          <span className="flex items-center gap-1">
            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
            <span className="ml-1 text-surface-700 font-medium">Built for UK sparkies</span>
          </span>
          <span>SMS + WhatsApp</span>
          <span>NICEIC / NAPIT verified</span>
          <span>Instant setup</span>
        </div>
      </section>

      {/* ============================================================ */}
      {/* PROBLEM / SOLUTION */}
      {/* ============================================================ */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-surface-900">
              Every missed call is lost work
            </h2>
            <p className="mt-4 text-lg text-surface-600 leading-relaxed">
              You're on a job. The phone buzzes. You can't answer. By the time you call back, they've found someone else. TradGo makes sure that never happens again — your AI agent picks up every enquiry the moment it comes in.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FEATURES (Point 12: H2-H4 hierarchy) */}
      {/* ============================================================ */}
      <section className="py-16 sm:py-24 bg-surface-50/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-surface-900">
              Everything an electrician needs
            </h2>
            <p className="mt-4 text-lg text-surface-600 max-w-2xl mx-auto">
              Built specifically for the trades — not a generic chatbot slapped onto a website.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="bg-white rounded-2xl p-6 sm:p-8 border border-surface-100 hover:border-brand-200 hover:shadow-sm transition-all">
                <div className="h-10 w-10 rounded-xl bg-brand-50 flex items-center justify-center mb-4">
                  <feature.icon className="h-5 w-5 text-brand-600" />
                </div>
                <h3 className="text-lg font-semibold text-surface-900 mb-2">{feature.title}</h3>
                <p className="text-surface-600 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* HOW IT WORKS */}
      {/* ============================================================ */}
      <section id="how-it-works" className="py-16 sm:py-24 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-surface-900">
              Live in 10 minutes. Seriously.
            </h2>
          </div>
          <div className="max-w-3xl mx-auto space-y-8">
            {STEPS.map((step) => (
              <div key={step.number} className="flex gap-5">
                <div className="shrink-0 h-10 w-10 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-lg">
                  {step.number}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-surface-900">{step.title}</h3>
                  <p className="mt-1 text-surface-600 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3.5 rounded-xl transition-colors"
            >
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* CLASSIFICATION EXPLAINER */}
      {/* ============================================================ */}
      <section className="py-16 sm:py-24 bg-surface-50/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-surface-900 text-center mb-4">
              You stay in control. Always.
            </h2>
            <p className="text-lg text-surface-600 text-center mb-10">
              Every message the agent sends is classified into one of three categories:
            </p>
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-5 border border-surface-100 flex gap-4 items-start">
                <div className="shrink-0 h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-surface-900">Safe — auto-sends</h4>
                  <p className="text-sm text-surface-600 mt-0.5">General info, availability, service area. Things the agent knows for sure. Sent instantly so the customer gets a fast reply.</p>
                </div>
              </div>
              <div className="bg-white rounded-xl p-5 border border-surface-100 flex gap-4 items-start">
                <div className="shrink-0 h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-surface-900">Approval — held for you</h4>
                  <p className="text-sm text-surface-600 mt-0.5">Estimates, pricing, anything the agent isn't 100% sure about. You see the draft, approve it, edit it, or write your own reply.</p>
                </div>
              </div>
              <div className="bg-white rounded-xl p-5 border border-surface-100 flex gap-4 items-start">
                <div className="shrink-0 h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-surface-900">Escalate — flagged urgent</h4>
                  <p className="text-sm text-surface-600 mt-0.5">Emergencies like burning smells, sparking, or electrical danger. The agent tells the customer to call 999 and contacts you directly.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* VERIFIED CREDENTIALS */}
      {/* ============================================================ */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-surface-900">
              Verified credentials that build trust
            </h2>
            <p className="mt-4 text-lg text-surface-600 leading-relaxed">
              If you're registered with NICEIC, NAPIT, ELECSA, or another competent person scheme, TradGo verifies your credentials and displays them on your agent page. Customers see you're the real deal before they even message. Your insurance status, registration numbers, and scheme membership are all checked and shown with verified badges — not just text anyone could type.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* THE LEARNING LOOP */}
      {/* ============================================================ */}
      <section className="py-16 sm:py-24 bg-surface-50/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-surface-900">
              Gets smarter every day
            </h2>
            <p className="mt-4 text-lg text-surface-600 leading-relaxed">
              Every time you edit an agent response or add a rule, TradGo learns. The more you use it, the fewer edits you need. After a few weeks, most electricians tell us the agent gets it right first time on 90% of enquiries. It analyses your edit patterns overnight and suggests new rules to make itself more accurate. You approve the ones that make sense, dismiss the rest. Your agent gets better without you having to think about it.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FAQ (Point 13) */}
      {/* ============================================================ */}
      <section id="faq" className="py-16 sm:py-24 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-surface-900 text-center mb-12">
            Questions electricians ask
          </h2>
          <div className="max-w-3xl mx-auto space-y-6">
            {(STRUCTURED_DATA['@graph'].find((item): item is { '@type': string; mainEntity: Array<{ '@type': string; name: string; acceptedAnswer: { text: string } }> } =>
              item['@type'] === 'FAQPage'
            ))?.mainEntity.map((faq) => (
              <details key={faq.name} className="group bg-white rounded-xl border border-surface-100 overflow-hidden">
                <summary className="flex items-center justify-between cursor-pointer px-6 py-4 text-left font-medium text-surface-900 hover:bg-surface-50 transition-colors">
                  {faq.name}
                  <span className="ml-4 shrink-0 text-surface-400 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                </summary>
                <div className="px-6 pb-4 text-sm text-surface-600 leading-relaxed">
                  {faq.acceptedAnswer.text}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FINAL CTA */}
      {/* ============================================================ */}
      <section className="py-16 sm:py-24 bg-brand-600">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Stop losing work to missed calls
          </h2>
          <p className="mt-4 text-lg text-brand-100 max-w-2xl mx-auto">
            Set up your AI agent in 10 minutes. Start getting instant replies to every customer enquiry — on SMS and WhatsApp.
          </p>
          <Link
            to="/dashboard"
            className="mt-8 inline-flex items-center gap-2 bg-white hover:bg-surface-50 text-brand-700 font-semibold px-8 py-4 rounded-xl text-lg transition-colors"
          >
            Start your free trial
            <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="mt-4 text-sm text-brand-200">No credit card needed. Cancel anytime.</p>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FOOTER (Point 15: internal links) */}
      {/* ============================================================ */}
      <footer className="border-t border-surface-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-brand-600" />
              <span className="font-bold text-surface-900">TradGo</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-surface-500">
              <Link to="/privacy" className="hover:text-surface-900 transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-surface-900 transition-colors">Terms of Service</Link>
              <Link to="/dashboard" className="hover:text-surface-900 transition-colors">Sign in</Link>
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-surface-400">
            © {new Date().getFullYear()} TradGo. Built for UK electricians. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
