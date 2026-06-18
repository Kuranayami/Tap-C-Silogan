import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useOrderRealtime(onChange) {
  const callbackRef = useRef(onChange)
  callbackRef.current = onChange

  useEffect(() => {
    let pollTimer
    let channel

    if (supabase) {
      channel = supabase
        .channel('orders-realtime')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          (payload) => {
            callbackRef.current?.(payload)
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[realtime] orders channel connected')
            clearInterval(pollTimer)
            pollTimer = null
          } else if (status === 'CHANNEL_ERROR') {
            console.error('[realtime] orders channel error — will fall back to polling')
            if (!pollTimer) pollTimer = setInterval(() => callbackRef.current?.({ _poll: true }), 12000)
          } else if (status === 'TIMED_OUT') {
            console.warn('[realtime] orders channel timed out — will fall back to polling')
            if (!pollTimer) pollTimer = setInterval(() => callbackRef.current?.({ _poll: true }), 12000)
          } else if (status === 'CLOSED') {
            console.log('[realtime] orders channel closed')
          }
        })
    } else {
      console.warn('[realtime] supabase client not available — using polling fallback')
      pollTimer = setInterval(() => callbackRef.current?.({ _poll: true }), 12000)
    }

    return () => {
      if (channel) supabase.removeChannel(channel)
      clearInterval(pollTimer)
    }
  }, [])
}
