export function calculateTDEE({ weight_kg, height_cm, goal }) {
  const age = 25
  const bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
  const tdee = bmr * 1.55
  const adjusted =
    goal === 'muscle_gain' ? tdee * 1.1 :
    goal === 'weight_loss' ? tdee * 0.85 :
    tdee

  const daily_calories = Math.round(adjusted)
  const daily_protein_g = Math.round(weight_kg * 2)
  const daily_fat_g = Math.round((adjusted * 0.25) / 9)
  const daily_carbs_g = Math.round((adjusted - daily_protein_g * 4 - daily_fat_g * 9) / 4)

  return { daily_calories, daily_protein_g, daily_carbs_g, daily_fat_g }
}
