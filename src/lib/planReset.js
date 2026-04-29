export async function checkTodayPlan(supabase, userId) {
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('training_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('plan_date', today)
    .single()
  return data
}
