import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useOrderRealtime(onChange) {
  const callbackRef = useRef(onChange)
  callbackRef.current = onChange

  useEffect(() => {
    if (!supabase) { console.warn('[realtime] supabase client not available'); return }

    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          callbackRef.current?.(payload)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') console.log('[realtime] orders channel connected')
        else if (status === 'CHANNEL_ERROR') console.error('[realtime] orders channel error')
        else if (status === 'TIMED_OUT') console.warn('[realtime] orders channel timed out')
        else if (status === 'CLOSED') console.log('[realtime] orders channel closed')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])
}
