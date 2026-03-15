import { useEffect, useRef } from 'react'

export interface ChatMessage {
  id: string
  role: 'customer' | 'agent' | 'system'
  content: string
  timestamp: Date
}

interface ChatAreaProps {
  messages: ChatMessage[]
  typing: boolean
  firstName: string
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export default function ChatArea({ messages, typing, firstName }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, typing])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-lg mx-auto space-y-3">
        {messages.map((msg) => {
          if (msg.role === 'system') {
            return (
              <div key={msg.id} className="text-center">
                <p className="text-xs text-surface-400 italic">{msg.content}</p>
              </div>
            )
          }

          const isCustomer = msg.role === 'customer'

          return (
            <div key={msg.id} className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  isCustomer
                    ? 'bg-surface-100 text-surface-900 rounded-br-md'
                    : 'bg-brand-600 text-white rounded-bl-md'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                <p
                  className={`text-[10px] mt-1 ${
                    isCustomer ? 'text-surface-400' : 'text-brand-200'
                  }`}
                >
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            </div>
          )
        })}

        {/* Typing indicator */}
        {typing && (
          <div className="flex justify-start">
            <div className="bg-brand-600 text-white rounded-2xl rounded-bl-md px-4 py-3">
              <p className="text-xs text-brand-200 mb-1">{firstName}'s agent is typing...</p>
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-brand-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-brand-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-brand-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
