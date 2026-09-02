import { useState } from 'react'

const EMPTY = {
  name: '',
  sku: '',
  form: '',
  system_code: '',
  price: '',
  weight: '',
  description: '',
}

const FORM_OPTIONS = ['Tablet', 'Granules', 'Powder']
const FORM_SYSTEM_CODES = { Tablet: 'TAB', Granules: 'GRN', Powder: 'PWD' }

export default function ProductForm({ initial, onSubmit, onCancel, saving }) {
  const [values, setValues] = useState(initial || EMPTY)
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(initial?.image_path || null)
  const [errors, setErrors] = useState({})
  // Once the admin types their own SKU/system_code, stop overwriting it
  // with auto-suggestions — only auto-fill while the field is untouched.
  const [skuTouched, setSkuTouched] = useState(!!initial?.sku)
  const [codeTouched, setCodeTouched] = useState(!!initial?.system_code)
  // "Form" is a preset dropdown (Tablet/Granules/Powder/Others) — if the
  // existing product's form isn't one of the presets, start on "Others"
  // with the current value pre-filled in the custom text box.
  const initialIsPreset = !initial?.form || FORM_OPTIONS.includes(initial.form)
  const [formChoice, setFormChoice] = useState(initialIsPreset ? initial?.form || '' : 'Others')

  function firstToken(str, len) {
    const word = (str || '').trim().split(/\s+/)[0] || ''
    return word.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, len)
  }

  function suggestSku(name, form, weight) {
    const parts = [firstToken(name, 4), systemCodeFor(form), weight ? String(parseFloat(weight)) : '']
      .filter(Boolean)
    return parts.join('-')
  }

  function systemCodeFor(form) {
    return FORM_SYSTEM_CODES[form] || firstToken(form, 3)
  }

  function handleFormChoice(choice) {
    setFormChoice(choice)
    // Only commit a real form value immediately for presets — "Others"
    // waits for the admin to type the custom value below.
    if (choice !== 'Others') {
      update('form', choice)
    } else {
      update('form', '')
    }
  }
  function update(field, value) {
    setValues((v) => {
      const next = { ...v, [field]: value }
      if (!skuTouched && ['name', 'form', 'weight'].includes(field)) {
        next.sku = suggestSku(next.name, next.form, next.weight)
      }
      if (!codeTouched && field === 'form') {
        next.system_code = systemCodeFor(next.form)
      }
      return next
    })
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0] || null
    setImage(file)
    setImagePreview(file ? URL.createObjectURL(file) : null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const formData = new FormData()
    Object.entries(values).forEach(([key, val]) => {
      if (val !== '' && val !== null && val !== undefined) {
        formData.append(key, val)
      }
    })
    if (image) formData.append('image', image)

    try {
      await onSubmit(formData)
    } catch (err) {
      setErrors(err.response?.data?.errors || {})
    }
  }

  const field = (label, key, opts = {}) => {
    const { type = 'text', required = false, prefix, suffix, step, placeholder, hint, onTouch } = opts
    return (
      <div>
        <label className="mb-1 block text-sm font-medium text-ink">
          {label}
          {required && <span className="text-danger-500"> *</span>}
        </label>
        <div className="relative">
          {prefix && (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-ink-soft">
              {prefix}
            </span>
          )}
          <input
            type={type}
            required={required}
            value={values[key] ?? ''}
            onChange={(e) => update(key, e.target.value)}
            onKeyDown={onTouch}
            placeholder={placeholder}
            step={step ?? (type === 'number' ? '0.01' : undefined)}
            className={`w-full rounded-md border text-sm text-ink transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 ${
              errors[key] ? 'border-danger-500' : 'border-border'
            } ${prefix ? 'pl-7' : 'pl-3'} ${suffix ? 'pr-10' : 'pr-3'} py-2`}
          />
          {suffix && (
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-ink-soft">
              {suffix}
            </span>
          )}
        </div>
        {errors[key] ? (
          <p className="mt-1 text-xs text-danger-500">{errors[key][0]}</p>
        ) : hint ? (
          <p className="mt-1 text-xs text-ink-soft">{hint}</p>
        ) : null}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Image */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">Product image</label>
        <div className="flex w-full flex-col items-end gap-3">
          <div className="flex h-40 w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-bg-soft">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-10 w-10 text-ink-soft opacity-40"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 4.5h18M3 19.5h18M4.5 4.5v15m15-15v15"
                />
              </svg>
            )}
          </div>
          <label className="cursor-pointer rounded-md border border-border px-3 py-2 text-sm font-medium text-ink hover:bg-canvas">
            {imagePreview ? 'Change image' : 'Upload image'}
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </label>
        </div>
        {errors.image && <p className="mt-1 text-xs text-danger-500">{errors.image[0]}</p>}
      </div>

      {/* Basic info */}
      <div className="space-y-4">
        {field('Product name', 'name', { required: true, placeholder: 'e.g. Spirulina Granules' })}
        {field('SKU', 'sku', {
          required: true,
          placeholder: 'e.g. SPIR-GRN-45',
          hint: !skuTouched && values.sku ? 'Auto-suggested — edit if needed' : undefined,
          onTouch: () => setSkuTouched(true),
        })}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Form</label>
            <select
              value={formChoice}
              onChange={(e) => handleFormChoice(e.target.value)}
              required
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="" disabled hidden>
                Select form
              </option>
              {FORM_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
              <option value="Others">Others</option>
            </select>
          </div>
          {field('System code', 'system_code', {
            placeholder: 'e.g. GRN',
            hint: !codeTouched && values.system_code ? 'Auto-suggested — edit if needed' : undefined,
            onTouch: () => setCodeTouched(true),
          })}
        </div>
        {formChoice === 'Others' &&
          field('Specify form', 'form', { required: true, placeholder: 'e.g. Capsule' })}
      </div>

      {/* Pricing & stock */}
      <div className="grid grid-cols-2 gap-3">
        {field('Price', 'price', { type: 'number', required: true, prefix: '₱' })}
        {field('Weight', 'weight', { type: 'number', step: '1', suffix: 'g' })}
      </div>

      {/* Description */}
      <div>
        <label className="mb-1 block text-sm font-medium text-ink">Description</label>
        <textarea
          value={values.description ?? ''}
          onChange={(e) => update('description', e.target.value)}
          rows={3}
          placeholder="Optional notes shown on the product page"
          className="w-full rounded-md border border-border px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border px-4 py-2 text-sm text-ink-soft hover:bg-canvas"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Add product'}
        </button>
      </div>
    </form>
  )
}
