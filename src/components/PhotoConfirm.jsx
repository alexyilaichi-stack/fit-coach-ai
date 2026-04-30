export default function PhotoConfirm({ previewUrl, foodData, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white border border-zinc-100 rounded-2xl w-full max-w-sm p-5 shadow-2xl">
        <h3 className="font-semibold text-zinc-900 text-lg mb-1">Confirm food entry</h3>
        <p className="text-sm text-zinc-400 mb-4">Claude identified the following — confirm to save.</p>

        {previewUrl && (
          <img
            src={previewUrl}
            alt="Food preview"
            className="w-full h-44 object-cover rounded-xl mb-4"
          />
        )}

        <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-4 mb-5">
          <p className="font-semibold text-zinc-900 capitalize mb-3">
            {foodData?.description || 'Unknown food'}
          </p>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { value: foodData?.calories, label: 'Cal' },
              { value: foodData?.protein_g != null ? `${foodData.protein_g}g` : '—', label: 'Protein' },
              { value: foodData?.carbs_g != null ? `${foodData.carbs_g}g` : '—', label: 'Carbs' },
              { value: foodData?.fat_g != null ? `${foodData.fat_g}g` : '—', label: 'Fat' },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-base font-bold text-zinc-900">{value ?? '—'}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-zinc-200 bg-white text-zinc-600 font-medium text-sm hover:bg-zinc-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 active:scale-95 text-white font-medium text-sm transition-all"
          >
            Save it
          </button>
        </div>
      </div>
    </div>
  )
}
