import { useState, useCallback, useRef } from 'react'

export function useConfirm() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const resolveRef = useRef(null)
  const stateRef = useRef({ open, message })

  stateRef.current = { open, message }

  const confirm = useCallback((msg) => {
    setMessage(msg)
    setOpen(true)
    return new Promise((resolve) => {
      resolveRef.current = resolve
    })
  }, [])

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true)
    setOpen(false)
  }, [])

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false)
    setOpen(false)
  }, [])

  const ConfirmDialog = useCallback(() => {
    const { open, message } = stateRef.current
    if (!open) return null
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={handleCancel}>
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-6 max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
          <p className="text-white text-sm mb-6">{message}</p>
          <div className="flex gap-3 justify-end">
            <button onClick={handleCancel} className="px-4 py-2 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-white text-sm transition-colors">Cancel</button>
            <button onClick={handleConfirm} className="px-4 py-2 rounded-lg bg-[#f97316] text-white text-sm hover:bg-[#ea580c] transition-colors">Confirm</button>
          </div>
        </div>
      </div>
    )
  }, [])

  return { confirm, ConfirmDialog }
}
