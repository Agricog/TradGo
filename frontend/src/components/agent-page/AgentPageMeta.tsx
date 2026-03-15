import { useEffect } from 'react'
import type { AgentProfile } from './AgentPage'

interface AgentPageMetaProps {
  profile: AgentProfile
}

/**
 * Sets document title, meta description, OG tags, and JSON-LD
 * for the agent page. Uses useEffect to manage head elements.
 * Cleans up on unmount.
 */
export default function AgentPageMeta({ profile }: AgentPageMetaProps) {
  const displayName = profile.business_name || `${profile.first_name}'s Electrical`
  const area = profile.area ? `${profile.area} & surrounding areas` : ''
  const title = `${displayName} — Get a Quote | TradGo`
  const description = `Chat with ${profile.first_name}'s AI agent for electrical quotes${area ? ` in ${area}` : ''}. ${profile.badges.some((b) => b.type === 'registration') ? `${profile.badges.find((b) => b.type === 'registration')?.scheme} registered. ` : ''}Get an instant estimate.`
  const url = window.location.href
  const ogImageUrl = `${import.meta.env.VITE_AGENT_PUBLIC_API_URL || ''}/api/agent-public/${profile.slug}/og-image`

  useEffect(() => {
    // Title
    const prevTitle = document.title
    document.title = title

    // Helper to create/update meta tags
    const metas: HTMLMetaElement[] = []

    function setMeta(attr: string, attrValue: string, content: string) {
      let el = document.querySelector(`meta[${attr}="${attrValue}"]`) as HTMLMetaElement | null
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, attrValue)
        document.head.appendChild(el)
        metas.push(el)
      }
      el.setAttribute('content', content)
    }

    // Standard meta
    setMeta('name', 'description', description)
    setMeta('name', 'robots', 'index, follow')

    // Open Graph
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:url', url)
    setMeta('property', 'og:image', ogImageUrl)
    setMeta('property', 'og:image:width', '1200')
    setMeta('property', 'og:image:height', '630')

    // Twitter
    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', title)
    setMeta('name', 'twitter:description', description)
    setMeta('name', 'twitter:image', ogImageUrl)

    // JSON-LD structured data
    const jsonLd = document.createElement('script')
    jsonLd.type = 'application/ld+json'

    const schemaData: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Electrician',
      name: displayName,
      url,
      ...(area && { areaServed: area }),
      ...(profile.services.length > 0 && {
        knowsAbout: profile.services.map((s) => s.replace(/_/g, ' ')),
      }),
    }

    // Add credentials
    const regBadge = profile.badges.find((b) => b.type === 'registration')
    if (regBadge) {
      schemaData.hasCredential = {
        '@type': 'EducationalOccupationalCredential',
        credentialCategory: 'Professional certification',
        recognizedBy: {
          '@type': 'Organization',
          name: regBadge.scheme || 'Registration body',
        },
      }
    }

    jsonLd.textContent = JSON.stringify(schemaData)
    document.head.appendChild(jsonLd)

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    const createdCanonical = !canonical
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = url

    // Cleanup
    return () => {
      document.title = prevTitle
      metas.forEach((el) => { try { el.remove() } catch { /* ignore */ } })
      jsonLd.remove()
      if (createdCanonical && canonical) canonical.remove()
    }
  }, [title, description, url, ogImageUrl, displayName, area, profile.badges, profile.services])

  return null
}
