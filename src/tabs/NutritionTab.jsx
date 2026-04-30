import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import { useProfile } from '../hooks/useProfile.js'
import { useTodayLogs } from '../hooks/useTodayLogs.js'
import { callClaude } from '../lib/claude.js'
import { useLanguage } from '../lib/i18n.jsx'
import MacroBar from '../components/MacroBar.jsx'
import FoodEntry from '../components/FoodEntry.jsx'

function sum(logs, field) {
  return Math.round(logs.reduce((acc, l) => acc + (l[field] || 0), 0))
}

export default function NutritionTab() {
  const { user } = useAuth()
  const { profile } = useProfile(user?.id)
  const { foodLogs, loading: logsLoading } = useTodayLogs(user?.id)
  const { t, lang } = useLanguage()

  const [mealPlan, setMealPlan] = useState(null)
  const [remaining, setRemaining] = useState(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [recLoading, setRecLoading] = useState(false)
  const [planError, setPlanError] = useState(null)
  const [recError, setRecError] = useState(null)

  const targets = {
    calories: profile?.daily_calories || 2000,
    protein:  profile?.daily_protein_g || 150,
    carbs:    profile?.daily_carbs_g || 200,
    fat:      profile?.daily_fat_g || 70,
  }

  const eaten = {
    calories: sum(foodLogs, 'calories'),
    protein:  sum(foodLogs, 'protein_g'),
    carbs:    sum(foodLogs, 'carbs_g'),
    fat:      sum(foodLogs, 'fat_g'),
  }

  async function generateMealPlan() {
    setPlanLoading(true); setPlanError(null)
    try {
      const result = await callClaude('generate_meal_plan', {
        profile: {
          goal: profile?.goal,
          weight_kg: profile?.weight_kg,
          daily_calories: targets.calories,
          daily_protein_g: targets.protein,
          daily_carbs_g: targets.carbs,
          daily_fat_g: targets.fat,
        },
      }, lang)
      setMealPlan(result.meals || [])
    } catch { setPlanError(t('nutrition.error_plan')) }
    finally { setPlanLoading(false) }
  }

  async function getRemaining() {
    setRecLoading(true); setRecError(null)
    try {
      const result = await callClaude('recommend_remaining_meals', {
        eaten,
        targets,
        profile: {
          goal: profile?.goal,
          weight_kg: profile?.weight_kg,
        },
        language: lang,
      }, lang)
      setRemaining(result.recommendation || result.message || result)
    } catch { setRecError(t('nutrition.error_rec')) }
    finally { setRecLoading(false) }
  }

  // Re-clear AI suggestions if language changes
  useEffect(() => {
    setMealPlan(null)
    setRemaining(null)
  }, [lang])

  return (
    <div className="flex flex-col min-h-full bg-zinc-50 p-4 gap-4 pt-16">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{t('nutrition.title')}</h1>
      </div>

      {/* Macro bars */}
      <div className="bg-white rounded-2xl p-4 border border-zinc-100 shadow-sm flex flex-col gap-4">
        <MacroBar
          label={`${t('nutrition.calories')} (${t('nutrition.kcal')})`}
          current={eaten.calories}
          target={targets.calories}
          unit=""
          color="bg-orange-400"
        />
        <MacroBar
          label={`${t('nutrition.protein')} (g)`}
          current={eaten.protein}
          target={targets.protein}
          color="bg-blue-400"
        />
        <MacroBar
          label={`${t('nutrition.carbs')} (g)`}
          current={eaten.carbs}
          target={targets.carbs}
          color="bg-amber-400"
        />
        <MacroBar
          label={`${t('nutrition.fat')} (g)`}
          current={eaten.fat}
          target={targets.fat}
          color="bg-rose-400"
        />
      </div>

      {/* Today's food log */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-sm font-semibold text-zinc-700">{t('nutrition.today_log')}</h2>
        </div>
        {logsLoading ? (
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <div className="w-4 h-4 border-2 border-zinc-300 border-t-transparent rounded-full animate-spin" />
              {t('common.loading')}
            </div>
          </div>
        ) : foodLogs.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-zinc-400">{t('nutrition.no_logs')}</p>
        ) : (
          <div className="px-4 pb-2">
            {foodLogs.map((entry) => (
              <FoodEntry key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>

      {/* Remaining recommendation */}
      {foodLogs.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-zinc-700">{t('nutrition.remaining')}</h2>
          {remaining ? (
            <p className="text-sm text-zinc-600 leading-relaxed">
              {typeof remaining === 'string' ? remaining : JSON.stringify(remaining)}
            </p>
          ) : recError ? (
            <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <p className="text-xs text-red-600">{recError}</p>
              <button onClick={getRemaining} className="text-xs text-red-500 font-medium ml-2">{t('common.retry')}</button>
            </div>
          ) : (
            <button
              onClick={getRemaining}
              disabled={recLoading}
              className="w-full py-2.5 rounded-xl border border-zinc-200 hover:border-orange-300 hover:bg-orange-50 text-sm font-medium text-zinc-600 hover:text-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {recLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                  {t('nutrition.generating_rec')}
                </>
              ) : t('nutrition.get_remaining')}
            </button>
          )}
        </div>
      )}

      {/* Meal plan */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-zinc-700">{t('nutrition.meal_plan')}</h2>
        {mealPlan && mealPlan.length > 0 ? (
          <div className="flex flex-col gap-3">
            {mealPlan.map((meal, i) => (
              <div key={i} className="bg-zinc-50 rounded-xl px-3 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-orange-500 uppercase tracking-wide">{meal.name}</span>
                  <span className="text-xs font-semibold text-zinc-700">{meal.calories} kcal</span>
                </div>
                <p className="text-sm text-zinc-700 leading-relaxed">{meal.foods}</p>
                <div className="flex gap-2 mt-2">
                  <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md text-xs font-medium">{meal.protein_g}P</span>
                  <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-md text-xs font-medium">{meal.carbs_g}C</span>
                  <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded-md text-xs font-medium">{meal.fat_g}F</span>
                </div>
              </div>
            ))}
          </div>
        ) : planError ? (
          <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <p className="text-xs text-red-600">{planError}</p>
            <button onClick={generateMealPlan} className="text-xs text-red-500 font-medium ml-2">{t('common.retry')}</button>
          </div>
        ) : (
          <button
            onClick={generateMealPlan}
            disabled={planLoading}
            className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white text-sm font-semibold transition-all active:scale-95 shadow-sm shadow-orange-100 flex items-center justify-center gap-2"
          >
            {planLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                {t('nutrition.generating_plan')}
              </>
            ) : t('nutrition.get_plan')}
          </button>
        )}
      </div>
    </div>
  )
}
