import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Zap, Shield, Clock, BarChart3, Bot, ArrowRight, CheckCircle2, Phone, PhoneOff } from 'lucide-react'

// ============================================================
// SEO: JSON-LD Structured Data
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
      description: 'TradGo gives UK electricians an AI agent that catches missed calls, texts customers back instantly, and handles enquiries via SMS and WhatsApp — so you never lose a job because you couldn\'t get to the phone.',
      foundingDate: '2026',
      areaServed: { '@type': 'Country', name: 'United Kingdom' },
      sameAs: [],
    },
    {
      '@type': 'WebPage',
      '@id': 'https://tradgo.co.uk/#webpage',
      url: 'https://tradgo.co.uk',
      name: 'TradGo — AI Agent for UK Electricians | Never Miss a Job Again',
      description: 'TradGo catches missed calls, texts your customer back instantly, and handles the conversation — finding out what they need, giving a ballpark, and keeping them warm until you\'re free. £59/month. 14-day free trial.',
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
        price: '59',
        priceCurrency: 'GBP',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: '59',
          priceCurrency: 'GBP',
          billingDuration: 'P1M',
          description: '14-day free trial. Cancel anytime.',
        },
      },
      description: 'AI-powered missed call text-back and customer enquiry management for UK electricians. Catches missed calls, texts customers back instantly, and handles SMS and WhatsApp conversations so no lead goes cold.',
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is TradGo?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'TradGo is an AI agent built specifically for UK electricians. When you miss a call, TradGo texts the customer back within seconds, finds out what they need, gives them a ballpark, and keeps them warm until you\'re free. It also handles WhatsApp messages and website enquiries.',
          },
        },
        {
          '@type': 'Question',
          name: 'How does the missed call text-back work?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'You set your phone to forward unanswered calls to your TradGo number. When you miss a call, TradGo plays a short message telling the customer a text is on its way, then immediately sends them an SMS. The AI agent handles the conversation from there. You keep your existing number — nothing changes on your van or cards.',
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
            text: 'Yes. TradGo supports SMS, WhatsApp, and a website chat widget. Customers can message you on whichever channel they prefer and the agent handles all three identically through one inbox.',
          },
        },
        {
          '@type': 'Question',
          name: 'How much does TradGo cost?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'TradGo is £59 per month with a 14-day free trial. Everything is included — missed call text-back, SMS, WhatsApp, website chat widget, dashboard, and the AI agent. No setup fees, no minute limits, no overage charges. Cancel anytime.',
          },
        },
        {
          '@type': 'Question',
          name: 'Do I need to change my phone number?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. You keep your existing number on everything — van, cards, Google listing. You just set your phone to forward unanswered calls to TradGo. That\'s the only change. Takes 30 seconds.',
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
            text: 'Most electricians complete onboarding in under 10 minutes. You enter your details, services, and pricing — then your AI agent goes live immediately. The only other step is setting call forwarding on your phone, which takes 30 seconds.',
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
        { '@type': 'HowToStep', position: 1, name: 'Sign up', text: 'Create your account and enter your business details, services, and pricing ranges. Takes about 10 minutes.' },
        { '@type': 'HowToStep', position: 2, name: 'Set call forwarding', text: 'Set your phone to forward unanswered calls to your TradGo number. Keep your existing number on everything.' },
        { '@type': 'HowToStep', position: 3, name: 'Start catching jobs', text: 'Every missed call gets a text back within seconds. The AI agent finds out what they need and keeps them warm. You review everything in your dashboard.' },
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
    icon: PhoneOff,
    title: 'Missed call? Sorted.',
    description: 'When you can\'t answer, TradGo texts the customer back within seconds. They stop Googling your competitors and start a conversation with you instead.',
  },
  {
    icon: Bot,
    title: 'Sounds like you, not a robot',
    description: 'The agent learns your tone, your services, and your pricing. Customers get a response that sounds like it came from you — because it was trained on you.',
  },
  {
    icon: Shield,
    title: 'You stay in control',
    description: 'Estimates and pricing always go through your approval. Simple questions get answered automatically. Emergencies get escalated to you immediately.',
  },
  {
    icon: Phone,
    title: 'SMS, WhatsApp, and your website',
    description: 'Customers contact you however they prefer. Plus you get a chat widget for your existing website — one line of code and your AI agent is live on your site. All channels feed into one inbox.',
  },
  {
    icon: Clock,
    title: '24/7 without the overtime',
    description: 'Enquiries come in at 9pm, 6am, weekends. Your agent handles them all and you review the conversations when you\'re ready.',
  },
  {
    icon: BarChart3,
    title: 'See what\'s coming in',
    description: 'Your dashboard shows every conversation, estimate, and enquiry in one place. Filter by status, see what needs your attention, and track your pipeline.',
  },
]

const STEPS = [
  { number: '1', title: 'Sign up and set your services', description: 'Enter your details, the electrical work you do, and your pricing. Takes about 10 minutes.' },
  { number: '2', title: 'Set call forwarding on your phone', description: 'One setting change — forward unanswered calls to your TradGo number. Your existing number stays on your van, your cards, everywhere. Nothing changes.' },
  { number: '3', title: 'Start catching the jobs you\'re missing', description: 'Every missed call gets a text back within seconds. Your AI agent finds out what they need, gives a ballpark, and keeps them warm until you\'re free to take over.' },
]

const INCLUDED = [
  'Missed call text-back',
  'AI agent trained on your voice',
  'SMS and WhatsApp',
  'Chat widget for your existing website',
  'Dashboard and inbox',
  'Approval flow on estimates',
  'Google review requests',
  'Emergency escalation',
  'Learning loop — gets smarter daily',
  'No minute limits or overage charges',
]

// ============================================================
// Phone mockup component
// ============================================================
function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[280px] sm:w-[320px]">
      {/* Phone frame */}
      <div className="rounded-[2.5rem] border-[8px] border-surface-800 bg-surface-900 p-1 shadow-2xl">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-surface-800 rounded-b-2xl z-10" />
        {/* Screen */}
        <div className="rounded-[2rem] bg-white overflow-hidden pt-8">
          {/* Status bar */}
          <div className="px-5 pb-2 flex items-center justify-between text-[10px] text-surface-400">
            <span>14:21</span>
            <span>5G</span>
          </div>
          {/* Missed call banner */}
          <div className="mx-3 mb-3 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center">
                <PhoneOff className="h-3 w-3 text-red-500" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-red-700">Missed call</p>
                <p className="text-[10px] text-red-500">07985 559 775 · just now</p>
              </div>
            </div>
          </div>
          {/* Text conversation */}
          <div className="px-3 space-y-2.5 pb-4">
            {/* TradGo message */}
            <div className="flex justify-start">
              <div className="bg-brand-600 text-white rounded-2xl rounded-tl-md px-3.5 py-2.5 max-w-[85%] shadow-sm">
                <p className="text-[11px] leading-relaxed">Hi, it's Dave's Electrical. Sorry Dave couldn't get to the phone — he's on a job right now. Drop me a quick message about what you need and we'll get back to you.</p>
                <p className="text-[9px] text-brand-200 mt-1">14:21</p>
              </div>
            </div>
            {/* Customer reply */}
            <div className="flex justify-end">
              <div className="bg-surface-100 text-surface-800 rounded-2xl rounded-tr-md px-3.5 py-2.5 max-w-[85%]">
                <p className="text-[11px] leading-relaxed">Hi, I need a consumer unit replaced in my house</p>
                <p className="text-[9px] text-surface-400 mt-1 text-right">14:22</p>
              </div>
            </div>
            {/* Agent response */}
            <div className="flex justify-start">
              <div className="bg-brand-600 text-white rounded-2xl rounded-tl-md px-3.5 py-2.5 max-w-[85%] shadow-sm">
                <p className="text-[11px] leading-relaxed">No problem. Where's the job located, and is it a house or a flat?</p>
                <p className="text-[9px] text-brand-200 mt-1">14:22</p>
              </div>
            </div>
            {/* Typing indicator */}
            <div className="flex justify-end">
              <div className="bg-surface-100 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-surface-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="h-1.5 w-1.5 rounded-full bg-surface-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="h-1.5 w-1.5 rounded-full bg-surface-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Component
// ============================================================
export default function LandingPage() {
  useEffect(() => {
    document.title = 'TradGo — AI Agent for UK Electricians | Never Miss a Job Again'

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

    setMeta('description', 'TradGo catches missed calls, texts your customer back instantly, and handles the conversation — finding out what they need and keeping them warm until you\'re free. Built for UK electricians. £59/month. 14-day free trial.')
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = 'https://tradgo.co.uk'
    setMeta('og:type', 'website', true)
    setMeta('og:title', 'TradGo — AI Agent for UK Electricians | Never Miss a Job Again', true)
    setMeta('og:description', 'Missed a call? TradGo texts your customer back in seconds and handles the conversation until you\'re free. £59/month.', true)
    setMeta('og:url', 'https://tradgo.co.uk', true)
    setMeta('og:image', 'https://tradgo.co.uk/og-image.jpg', true)
    setMeta('twitter:card', 'summary_large_image')
    setMeta('twitter:title', 'TradGo — AI Agent for UK Electricians')
    setMeta('twitter:description', 'Missed a call? TradGo texts your customer back in seconds. £59/month. 14-day free trial.')
    setMeta('author', 'TradGo')

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
      {/* NAV */}
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
            <a href="#pricing" className="hidden sm:block text-sm text-surface-600 hover:text-surface-900 transition-colors">
              Pricing
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

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-emerald-50" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-16 sm:pt-24 sm:pb-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left column — copy */}
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-surface-900 tracking-tight leading-[1.1]">
                Never miss a job&nbsp;again
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-surface-600 leading-relaxed max-w-2xl">
                Can't answer the phone? TradGo texts your customer back within seconds — finds out what they need, gives them a ballpark, and keeps them warm until you're free.
              </p>
              <p id="quick-answer" className="sr-only">
                TradGo is an AI agent for UK electricians that catches missed calls, texts customers back instantly, and handles enquiries via SMS and WhatsApp until you're free to take over.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3.5 rounded-xl text-base transition-colors shadow-sm"
                >
                  Start your 14-day free trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 bg-white hover:bg-surface-50 text-surface-700 font-medium px-6 py-3.5 rounded-xl text-base transition-colors border border-surface-200"
                >
                  See how it works
                </a>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-surface-500">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-brand-500" /> 14-day free trial</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-brand-500" /> Keep your existing number</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-brand-500" /> Live in 10 minutes</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-brand-500" /> Cancel anytime</span>
              </div>
            </div>
            {/* Right column — phone mockup */}
            <div className="hidden lg:flex justify-center">
              <PhoneMockup />
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF BAR */}
      <section className="bg-surface-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <p className="text-xl sm:text-2xl font-bold text-white mb-3">Built for UK electricians</p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-surface-300">
            <span>Missed call text-back</span>
            <span className="text-surface-500">·</span>
            <span>SMS + WhatsApp</span>
            <span className="text-surface-500">·</span>
            <span>NICEIC / NAPIT verified</span>
            <span className="text-surface-500">·</span>
            <span>£59/month — everything included</span>
          </div>
        </div>
      </section>

      {/* PROBLEM / SOLUTION */}
      <section className="bg-gradient-to-b from-surface-50 to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-surface-900">
              Every missed call is a job lost
            </h2>
            <p className="mt-4 text-lg text-surface-600 leading-relaxed">
              You're up a ladder. The phone rings. You can't answer. By the time you call back, they've booked someone else. 85% of customers who can't reach you won't leave a voicemail — they just call the next electrician on Google. TradGo stops that from happening.
            </p>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-10 sm:py-14 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-surface-900">
              Everything you need. Nothing you don't.
            </h2>
            <p className="mt-4 text-lg text-surface-600 max-w-2xl mx-auto">
              Built specifically for electricians — not a generic chatbot slapped onto a website.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="bg-surface-50 rounded-2xl p-6 sm:p-8 border border-surface-100 hover:border-brand-200 hover:shadow-sm transition-all">
                <div className="h-10 w-10 rounded-xl bg-brand-100 flex items-center justify-center mb-4">
                  <feature.icon className="h-5 w-5 text-brand-600" />
                </div>
                <h3 className="text-lg font-semibold text-surface-900 mb-2">{feature.title}</h3>
                <p className="text-surface-600 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-14 sm:py-20 bg-surface-50 scroll-mt-20">
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

      {/* CLASSIFICATION EXPLAINER */}
      <section className="py-14 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-surface-900 text-center mb-4">
              You stay in control. Always.
            </h2>
            <p className="text-lg text-surface-600 text-center mb-10">
              Every message the agent sends is classified into one of three categories:
            </p>
            <div className="space-y-4">
              <div className="bg-green-50 rounded-xl p-5 border border-green-100 flex gap-4 items-start">
                <div className="shrink-0 h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-surface-900">Safe — auto-sends</h4>
                  <p className="text-sm text-surface-600 mt-0.5">General info, availability, service area. Things the agent knows for sure. Sent instantly so the customer gets a fast reply.</p>
                </div>
              </div>
              <div className="bg-amber-50 rounded-xl p-5 border border-amber-100 flex gap-4 items-start">
                <div className="shrink-0 h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-surface-900">Approval — held for you</h4>
                  <p className="text-sm text-surface-600 mt-0.5">Estimates, pricing, anything the agent isn't 100% sure about. You see the draft, approve it, edit it, or write your own reply.</p>
                </div>
              </div>
              <div className="bg-red-50 rounded-xl p-5 border border-red-100 flex gap-4 items-start">
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

      {/* VERIFIED CREDENTIALS */}
      <section className="py-14 sm:py-20 bg-surface-50">
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

      {/* THE LEARNING LOOP */}
      <section className="py-14 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-surface-900">
              Gets smarter every day
            </h2>
            <p className="mt-4 text-lg text-surface-600 leading-relaxed">
              Every time you edit an agent response or add a rule, TradGo learns. The more you use it, the fewer edits you need. After a few weeks, the agent gets it right first time on most enquiries. It analyses your edit patterns overnight and suggests new rules to make itself more accurate. You approve the ones that make sense, dismiss the rest. Your agent gets better without you having to think about it.
            </p>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-14 sm:py-20 bg-surface-50 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-surface-900">
              Simple pricing. No surprises.
            </h2>
            <p className="mt-4 text-lg text-surface-600">
              One plan. Everything included. One missed job pays for the whole year.
            </p>
          </div>
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl border-2 border-brand-600 p-8 sm:p-10 shadow-lg">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-surface-900">TradGo Solo</h3>
                <div className="mt-4 flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-extrabold text-surface-900">£59</span>
                  <span className="text-lg text-surface-500">/month</span>
                </div>
                <p className="mt-2 text-sm text-brand-600 font-medium">14-day free trial — no card required</p>
              </div>
              <ul className="mt-8 space-y-3">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
                    <span className="text-sm text-surface-700">{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/dashboard"
                className="mt-8 w-full inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3.5 rounded-xl transition-colors"
              >
                Start your free trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-3 text-center text-xs text-surface-400">No setup fees. No contracts. Cancel anytime.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-14 sm:py-20 bg-white scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-surface-900 text-center mb-12">
            Questions electricians ask
          </h2>
          <div className="max-w-3xl mx-auto space-y-4">
            {(STRUCTURED_DATA['@graph'].find((item) => item['@type'] === 'FAQPage') as { mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }> } | undefined)?.mainEntity.map((faq) => (
              <details key={faq.name} className="group bg-surface-50 rounded-xl border border-surface-100 overflow-hidden">
                <summary className="flex items-center justify-between cursor-pointer px-6 py-4 text-left font-medium text-surface-900 hover:bg-surface-100 transition-colors">
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

      {/* FINAL CTA */}
      <section className="py-16 sm:py-24 bg-brand-600">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Stop losing jobs to missed calls
          </h2>
          <p className="mt-4 text-lg text-brand-100 max-w-2xl mx-auto">
            Set up your AI agent in 10 minutes. Every missed call becomes a conversation. Every conversation is a chance to win the job.
          </p>
          <Link
            to="/dashboard"
            className="mt-8 inline-flex items-center gap-2 bg-white hover:bg-surface-50 text-brand-700 font-semibold px-8 py-4 rounded-xl text-lg transition-colors"
          >
            Start your 14-day free trial
            <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="mt-4 text-sm text-brand-200">£59/month after trial. No card needed to start. Cancel anytime.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-surface-100 bg-surface-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-brand-400" />
              <span className="font-bold text-white">TradGo</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-surface-400">
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
              <Link to="/dashboard" className="hover:text-white transition-colors">Sign in</Link>
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-surface-500">
            © {new Date().getFullYear()} TradGo. Built for UK electricians. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
