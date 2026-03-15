import { useState } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import type { Message } from '@/types'

interface ApprovalBannerProps {
  message: Message
  onApprove: (messageId: string) => Promise<void>
  onEdit: (messageId: string, content: string) => Promise<void>
  onReject: (messageId: string) => Promise<void>
}

export default function ApprovalBanner({ message, onApprove, onEdit, onReject }: ApprovalBannerProps) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(message.content)
  const [acting, setActing] = useState(false)

  const handleApprove = async () => {
    if (acting) return
    setActing(true)
    await onApprove(message.id)
    setActing(false)
  }

  const handleEditSend = async () => {
    if (acting || !editText.trim()) return
    setActing(true)
    await onEdit(message.id, editText.trim())
    setActing(false)
    setEditing(false)
  }

  const handleReject = async () => {
    if (acting) return
    setActing(true)
    await onReject(message.id)
    setActing(false)
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
      <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">Pending approval</p>

      {editing ? (
        <textarea
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
          autoFocus
        />
      ) : (
        <p className="text-sm text-surface-800 leading-relaxed whitespace-pre-wrap">{message.content}</p>
      )}

      {message.inbox_summary && !editing && (
        <p className="text-xs text-surface-500 italic">{message.inbox_summary}</p>
      )}

      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <button
              type="button"
              onClick={handleEditSend}
              disabled={acting || !editText.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 bg-brand-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              <Check className="h-4 w-4" />
              {acting ? 'Sending...' : 'Send edited'}
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setEditText(message.content) }}
              disabled={acting}
              className="px-4 py-2.5 text-sm text-surface-700 bg-white border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handleApprove}
              disabled={acting}
              className="flex-1 flex items-center justify-center gap-1.5 bg-brand-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors active:scale-[0.98]"
            >
              <Check className="h-4 w-4" />
              {acting ? 'Sending...' : 'Approve'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={acting}
              className="p-2.5 text-surface-700 bg-white border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors"
              aria-label="Edit before sending"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={acting}
              className="p-2.5 text-red-600 bg-white border border-surface-200 rounded-lg hover:bg-red-50 transition-colors"
              aria-label="Reject"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
