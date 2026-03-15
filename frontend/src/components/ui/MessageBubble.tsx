import type { Message } from '@/types'

interface MessageBubbleProps {
  message: Message
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isCustomer = message.role === 'customer'
  const isElectrician = message.role === 'electrician'

  // Display the approved/edited content if it exists, otherwise original
  const displayContent = message.approved_content || message.content

  return (
    <div className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
          isCustomer
            ? 'bg-white border border-surface-200 rounded-bl-md'
            : isElectrician
              ? 'bg-blue-600 text-white rounded-br-md'
              : 'bg-brand-600 text-white rounded-br-md'
        }`}
      >
        {/* Role label for agent vs electrician */}
        {!isCustomer && (
          <p
            className={`text-[10px] font-medium mb-0.5 ${
              isElectrician ? 'text-blue-200' : 'text-brand-200'
            }`}
          >
            {isElectrician ? 'You' : 'Agent'}
          </p>
        )}

        <p
          className={`text-sm leading-relaxed whitespace-pre-wrap ${
            isCustomer ? 'text-surface-900' : 'text-white'
          }`}
        >
          {displayContent}
        </p>

        <p
          className={`text-[10px] mt-1 ${
            isCustomer ? 'text-surface-400' : isElectrician ? 'text-blue-200' : 'text-brand-200'
          }`}
        >
          {formatTime(message.created_at)}
          {!isCustomer && message.sent && ' · Sent'}
          {!isCustomer && !message.sent && message.classification !== 'needs_approval' && ' · Sending...'}
        </p>
      </div>
    </div>
  )
}
