import { useLanguage } from '../lib/i18n.jsx'

const CONFIDENCE_STYLE = {
  high:   { label: '置信度：高', en: 'Confidence: High',   cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  medium: { label: '置信度：中', en: 'Confidence: Medium', cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  low:    { label: '置信度：低', en: 'Confidence: Low',    cls: 'bg-zinc-100 text-zinc-500 border-zinc-200' },
}

export default function PhotoConfirm({ previewUrl, foodData, onConfirm, onCancel }) {
  const { lang } = useLanguage()
  const conf = foodData?.confidence ? CONFIDENCE_STYLE[foodData.confidence] : null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">

        {previewUrl && (
          <img src={previewUrl} alt="Food preview" className="w-full h-48 object-cover" />
        )}

        <div className="p-5">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div>
              <p className="font-bold text-zinc-900 text-lg leading-tight">
                {foodData?.description || 'Unknown food'}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">
                {lang === 'zh' ? '确认后将保存到今日记录' : 'Will be saved to today\'s log'}
              </p>
            </div>
            {conf && (
              <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${conf.cls}`}>
                {lang === 'zh' ? conf.label : conf.en}
              </span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 mb-5">
            {[
              { value: foodData?.calories, label: lang === 'zh' ? '热量' : 'Cal', unit: 'kcal', bg: 'bg-orange-50', text: 'text-orange-600' },
              { value: foodData?.protein_g, label: lang === 'zh' ? '蛋白质' : 'Protein', unit: 'g', bg: 'bg-rose-50', text: 'text-rose-600' },
              { value: foodData?.carbs_g,   label: lang === 'zh' ? '碳水' : 'Carbs',   unit: 'g', bg: 'bg-blue-50',  text: 'text-blue-600' },
              { value: foodData?.fat_g,     label: lang === 'zh' ? '脂肪' : 'Fat',     unit: 'g', bg: 'bg-amber-50', text: 'text-amber-600' },
            ].map(({ value, label, unit, bg, text }) => (
              <div key={label} className={`${bg} rounded-2xl p-2.5 text-center`}>
                <p className={`text-base font-bold ${text}`}>{value ?? '—'}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{unit}</p>
                <p className="text-xs font-medium text-zinc-500">{label}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-2xl border border-zinc-200 bg-white text-zinc-600 font-medium text-sm hover:bg-zinc-50 transition-colors"
            >
              {lang === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 rounded-2xl bg-orange-500 hover:bg-orange-400 active:scale-95 text-white font-semibold text-sm transition-all shadow-sm shadow-orange-200"
            >
              {lang === 'zh' ? '确认保存' : 'Save it'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
