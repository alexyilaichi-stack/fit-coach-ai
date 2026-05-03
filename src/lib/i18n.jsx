import { createContext, useContext, useState } from 'react'

const T = {
  en: {
    // Nav
    'nav.training':    'Training',
    'nav.nutrition':   'Nutrition',
    'nav.body':        'Body',
    'nav.log':         'Log',

    // Workout types
    'workout.push':      'Push',
    'workout.pull':      'Pull',
    'workout.legs':      'Legs',
    'workout.arms':      'Arms',
    'workout.full_body': 'Full Body',

    // Readiness
    'readiness.low':         'Low',
    'readiness.normal':      'Normal',
    'readiness.high':        'High',
    'readiness.low.note':    'Weights scaled down 10%',
    'readiness.normal.note': 'Your standard weights',
    'readiness.high.note':   'Weights bumped up 5% — push it',

    // Training tab
    'training.title':           'Training Plan',
    'training.energy':          'Energy today',
    'training.coach_note':      'Coach Note',
    'training.analyzing':       'Analyzing your training frequency...',
    'training.generating':      'Generating your training plan...',
    'training.no_plan':         "Couldn't load a plan.",
    'training.fallback':        'Showing previous plan — tap to retry',
    'training.swap_label':      'Swap an exercise',
    'training.swap_placeholder':'e.g. replace bench press with dumbbell press',
    'training.swap_btn':        'Swap',
    'training.swap_error':      'Could not update plan — try again',
    'training.history_btn':     'History',
    'training.history_title':   'Workout History',
    'training.history_loading': 'Loading history...',
    'training.history_empty':   'No workouts logged yet. Use "Log Workout" below to add your first session.',
    'training.log_workout':         'Log Workout',
    'training.log_workout_placeholder': 'Paste your workout notes...\ne.g.:\n20250430\nLat Pulldown 85lbs×10, 100lbs 2×10\nSeated Row 100lbs 3×10\nFace Pull 50lbs×8, 45lbs×12',
    'training.log_workout_btn':     'Parse & Save',
    'training.log_success':         'Workout saved!',
    'training.log_error':           'Could not parse workout — try again',
    'training.parsing':             'Parsing workout...',

    // Quick Log
    'quicklog.title':          'Quick Log',
    'quicklog.subtitle':       'Log anything — food, injuries, workouts',
    'quicklog.placeholder':    'e.g. just ate a banana, left shoulder hurts, did 30 min run...',
    'quicklog.submit':         'Log it',
    'quicklog.or_upload':      'or upload',
    'quicklog.food_photo':     'Food photo',
    'quicklog.camera':         'Camera',
    'quicklog.gallery':        'Gallery',
    'quicklog.apple_health':   'Apple Health',
    'quicklog.analyzing':      'Analyzing your log...',
    'quicklog.identifying':    'Identifying food...',
    'quicklog.reading_health': 'Reading Apple Health data...',
    'quicklog.saving':         'Saving...',
    'quicklog.error_general':  'Something went wrong — try again',
    'quicklog.error_food':     'Could not identify food — try again',
    'quicklog.error_health':   'Could not read Apple Health data — try again',
    'quicklog.error_save':     'Could not save — try again',
    'quicklog.go_nutrition':   'Go to Nutrition →',
    'quicklog.go_training':    'Go to Training →',
    'quicklog.workout_notes':  'Workout Notes',

    // Log feedback badges
    'feedback.food':         'Logged to Nutrition',
    'feedback.injury':       'Logged to Injury',
    'feedback.workout':      'Logged to Training',
    'feedback.apple_health': 'Logged to Training',
    'feedback.other':        'Logged',

    // Injury / Body tab
    'body.title':             'Body & Condition',
    'body.stats':             'Body Stats',
    'body.edit':              'Edit',
    'body.save':              'Save',
    'body.cancel':            'Cancel',
    'body.height':            'Height (cm)',
    'body.weight':            'Weight (kg)',
    'body.body_fat':          'Body Fat %',
    'body.muscle_mass':       'Muscle Mass (kg)',
    'body.bench':             'Bench Press (kg)',
    'body.squat':             'Squat (kg)',
    'body.deadlift':          'Deadlift (kg)',
    'body.goal':              'Goal',
    'body.target':            'Target',
    'body.macros':            'Daily Macro Targets',
    'body.calories':          'Calories',
    'body.protein':           'Protein (g)',
    'body.carbs':             'Carbs (g)',
    'body.fat':               'Fat (g)',
    'body.goal.weight_loss':  'Lose weight',
    'body.goal.muscle_gain':  'Build muscle',
    'body.goal.other':        'Other',
    'body.conditions':        'Condition Log',
    'body.no_conditions':     'No conditions logged yet.',
    'body.workout_frequency': 'Workout Frequency',
    'body.composition':   'Body Composition',
    'body.fat_mass':      'Fat',
    'body.lifts':         'Strength',
    'body.bench_short':   'Bench',
    'body.squat_short':   'Squat',
    'body.deadlift_short':'Deadlift',
    'body.active':            'Active',
    'body.resolved':          'Resolved',
    'body.saving':            'Saving...',
    'body.save_error':        'Could not save — try again',

    // Nutrition tab
    'nutrition.title':           'Nutrition',
    'nutrition.calories':        'Calories',
    'nutrition.protein':         'Protein',
    'nutrition.carbs':           'Carbs',
    'nutrition.fat':             'Fat',
    'nutrition.today_log':       "Today's Food",
    'nutrition.no_logs':         'No food logged yet.',
    'nutrition.meal_plan':       'Suggested Meal Plan',
    'nutrition.remaining':       'Remaining Recommendations',
    'nutrition.generating_plan': 'Building your meal plan...',
    'nutrition.generating_rec':  'Getting recommendations...',
    'nutrition.error_plan':      'Could not generate meal plan — try again',
    'nutrition.error_rec':       'Could not get recommendations — try again',
    'nutrition.get_plan':        'Generate meal plan',
    'nutrition.get_remaining':   'What should I eat next?',
    'nutrition.kcal':            'kcal',
    'nutrition.history':         'Food History',
    'nutrition.show_history':    'Show past 7 days',
    'nutrition.hide_history':    'Hide history',
    'nutrition.history_empty':   'No food logged in the past 7 days.',
    'nutrition.history_loading': 'Loading history...',
    'nutrition.trend_title':        '14-Day Trend',
    'nutrition.trend_target':       'Target',
    'nutrition.past_log_label':     'Log a past meal',
    'nutrition.past_log_placeholder': 'e.g. had a chicken sandwich and orange juice for lunch',
    'nutrition.past_log_submit':    'Log it',
    'nutrition.past_not_food':      'Could not identify food — try describing a meal or drink',
    'quicklog.logging_for_past':    'Logging for past date',
    'quicklog.history':             'Recent logs',

    // Common
    'common.retry':     'Retry',
    'common.try_again': 'Try again',
    'common.loading':   'Loading...',
  },

  zh: {
    // Nav
    'nav.training':    '训练',
    'nav.nutrition':   '营养',
    'nav.body':        '身体',
    'nav.log':         '记录',

    // Workout types
    'workout.push':      '推',
    'workout.pull':      '拉',
    'workout.legs':      '腿',
    'workout.arms':      '手臂',
    'workout.full_body': '全身',

    // Readiness
    'readiness.low':         '低',
    'readiness.normal':      '正常',
    'readiness.high':        '高',
    'readiness.low.note':    '重量降低10%',
    'readiness.normal.note': '使用标准重量',
    'readiness.high.note':   '重量提升5% — 冲！',

    // Training tab
    'training.title':           '训练计划',
    'training.energy':          '今日状态',
    'training.coach_note':      '教练建议',
    'training.analyzing':       '正在分析训练频率…',
    'training.generating':      '正在生成训练计划…',
    'training.no_plan':         '无法加载训练计划',
    'training.fallback':        '显示上次计划 — 点击重试',
    'training.swap_label':      '替换动作',
    'training.swap_placeholder':'例如：用哑铃推替换杠铃卧推',
    'training.swap_btn':        '替换',
    'training.swap_error':      '无法更新计划 — 请重试',
    'training.history_btn':     '历史',
    'training.history_title':   '训练记录',
    'training.history_loading': '正在加载历史…',
    'training.history_empty':   '暂无训练记录，在下方"记录训练"里添加第一条吧',
    'training.log_workout':         '记录训练',
    'training.log_workout_placeholder': '粘贴你的训练记录...\n例如：\n20250430\n高位下拉85磅*10 100磅 2*10\n窄握下拉100磅3*10\n面拉50磅*8 45磅*12',
    'training.log_workout_btn':     '解析并保存',
    'training.log_success':         '训练已保存！',
    'training.log_error':           '解析失败 — 请重试',
    'training.parsing':             '正在解析...',

    // Quick Log
    'quicklog.title':          '快速记录',
    'quicklog.subtitle':       '记录任何内容 — 饮食、伤病、训练',
    'quicklog.placeholder':    '例如：刚吃了一根香蕉，左肩有点疼，跑了30分钟…',
    'quicklog.submit':         '记录',
    'quicklog.or_upload':      '或上传图片',
    'quicklog.food_photo':     '食物照片',
    'quicklog.camera':         '拍照',
    'quicklog.gallery':        '相册',
    'quicklog.apple_health':   'Apple健康',
    'quicklog.analyzing':      '正在分析记录…',
    'quicklog.identifying':    '正在识别食物…',
    'quicklog.reading_health': '正在读取健康数据…',
    'quicklog.saving':         '正在保存…',
    'quicklog.error_general':  '出现错误 — 请重试',
    'quicklog.error_food':     '无法识别食物 — 请重试',
    'quicklog.error_health':   '无法读取健康数据 — 请重试',
    'quicklog.error_save':     '无法保存 — 请重试',
    'quicklog.go_nutrition':   '前往营养 →',
    'quicklog.go_training':    '前往训练 →',
    'quicklog.workout_notes':  '训练记录',

    // Log feedback badges
    'feedback.food':         '已记录到营养',
    'feedback.injury':       '已记录到伤病',
    'feedback.workout':      '已记录到训练',
    'feedback.apple_health': '已记录到训练',
    'feedback.other':        '已记录',

    // Injury / Body tab
    'body.title':             '身体状况',
    'body.stats':             '身体数据',
    'body.edit':              '编辑',
    'body.save':              '保存',
    'body.cancel':            '取消',
    'body.height':            '身高 (cm)',
    'body.weight':            '体重 (kg)',
    'body.body_fat':          '体脂率 %',
    'body.muscle_mass':       '肌肉量 (kg)',
    'body.bench':             '卧推 (kg)',
    'body.squat':             '深蹲 (kg)',
    'body.deadlift':          '硬拉 (kg)',
    'body.goal':              '目标',
    'body.target':            '具体目标',
    'body.macros':            '每日宏量营养素目标',
    'body.calories':          '热量',
    'body.protein':           '蛋白质 (g)',
    'body.carbs':             '碳水 (g)',
    'body.fat':               '脂肪 (g)',
    'body.goal.weight_loss':  '减脂',
    'body.goal.muscle_gain':  '增肌',
    'body.goal.other':        '其他',
    'body.conditions':        '身体状况记录',
    'body.no_conditions':     '暂无记录',
    'body.workout_frequency': '训练频率',
    'body.composition':   '体组成',
    'body.fat_mass':      '脂肪',
    'body.lifts':         '力量数据',
    'body.bench_short':   '卧推',
    'body.squat_short':   '深蹲',
    'body.deadlift_short':'硬拉',
    'body.active':            '未解决',
    'body.resolved':          '已解决',
    'body.saving':            '正在保存…',
    'body.save_error':        '无法保存 — 请重试',

    // Nutrition tab
    'nutrition.title':           '营养',
    'nutrition.calories':        '热量',
    'nutrition.protein':         '蛋白质',
    'nutrition.carbs':           '碳水',
    'nutrition.fat':             '脂肪',
    'nutrition.today_log':       '今日饮食',
    'nutrition.no_logs':         '暂无饮食记录',
    'nutrition.meal_plan':       '建议饮食计划',
    'nutrition.remaining':       '剩余饮食建议',
    'nutrition.generating_plan': '正在生成饮食计划…',
    'nutrition.generating_rec':  '正在获取建议…',
    'nutrition.error_plan':      '无法生成饮食计划 — 请重试',
    'nutrition.error_rec':       '无法获取建议 — 请重试',
    'nutrition.get_plan':        '生成饮食计划',
    'nutrition.get_remaining':   '我接下来该吃什么？',
    'nutrition.kcal':            '千卡',
    'nutrition.history':         '饮食历史',
    'nutrition.show_history':    '查看过去7天',
    'nutrition.hide_history':    '收起历史',
    'nutrition.history_empty':   '过去7天暂无饮食记录',
    'nutrition.history_loading': '正在加载历史…',
    'nutrition.trend_title':        '14天趋势',
    'nutrition.trend_target':       '目标',
    'nutrition.past_log_label':     '补录历史饮食',
    'nutrition.past_log_placeholder': '例如：昨天午饭吃了鸡肉三明治和橙汁',
    'nutrition.past_log_submit':    '记录',
    'nutrition.past_not_food':      '未能识别食物，请描述具体的餐食或饮料',
    'quicklog.logging_for_past':    '正在补录历史数据',
    'quicklog.history':             '历史记录',

    // Common
    'common.retry':     '重试',
    'common.try_again': '重试',
    'common.loading':   '加载中…',
  },
}

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('fc_lang') || 'en' } catch { return 'en' }
  })

  function toggleLang() {
    const next = lang === 'en' ? 'zh' : 'en'
    setLang(next)
    try { localStorage.setItem('fc_lang', next) } catch {}
  }

  function t(key) {
    return T[lang]?.[key] ?? T.en[key] ?? key
  }

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider')
  return ctx
}
