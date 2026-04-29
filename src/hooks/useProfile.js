import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient.js'

export function useProfile(userId) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        setProfile(data)
        setLoading(false)
      })
  }, [userId])

  const updateProfile = async (updates) => {
    const { data } = await supabase
      .from('user_profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single()
    setProfile(data)
    return data
  }

  return { profile, loading, updateProfile }
}
