import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient.js'

export function useTodayLogs(userId) {
  const [foodLogs, setFoodLogs] = useState([])
  const [activeInjuries, setActiveInjuries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    const today = new Date().toISOString().split('T')[0]

    Promise.all([
      supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('logged_at', `${today}T00:00:00`)
        .order('logged_at', { ascending: true }),
      supabase
        .from('injury_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true),
    ]).then(([{ data: food }, { data: injuries }]) => {
      setFoodLogs(food ?? [])
      setActiveInjuries(injuries ?? [])
      setLoading(false)
    })
  }, [userId])

  return { foodLogs, activeInjuries, loading }
}
