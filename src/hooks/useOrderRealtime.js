import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useOrderRealtime(onChange) {
  const callbackRef = useRef(onChange)
  callbackRef.current = onChange

  useEffect(() => {
    if (!supabase) return

    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          callbackRef.current?.(payload)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])
}
