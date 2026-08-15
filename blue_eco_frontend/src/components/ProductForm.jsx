import { useState } from 'react'

const EMPTY = {
  name: '',
  sku: '',
  form: '',
  system_code: '',
  price: '',
  weight: '',
  stock_quantity: '',
  description: '',
}

export default function ProductForm({ initial, onSubmit, onCancel, saving }) {
  const [values, setValues] = useState(initial || EMPTY)
  const [image, setImage] = useState(null)
  const [errors, setErrors] = useState({})

  function update(field, value) {
    setValues((v) => ({ ...v, [field]: value }))
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

  const field = (label, key, type = 'text', required = false) => (
    <div>
      <label className="block text-sm font-medium text-ink mb-1">{label}</label>
      <input
        type={type}
        required={required}
        value={values[key] ?? ''}
        onChange={(e) => update(key, e.target.value)}
        className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500"
        step={type === 'number' ? '0.01' : undefined}
      />
      {errors[key] && <p className="mt-1 text-xs text-danger-500">{errors[key][0]}</p>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {field('Product name', 'name', 'text', true)}
      {field('SKU', 'sku', 'text', true)}
      <div className="grid grid-cols-2 gap-3">
        {field('Form (e.g. Granules)', 'form')}
        {field('System code', 'system_code')}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {field('Price (₱)', 'price', 'number', true)}
        {field('Weight (kg)', 'weight', 'number')}
      </div>
      {!initial && field('Initial stock quantity', 'stock_quantity', 'number')}

      <div>
        <label className="block text-sm font-medium text-ink mb-1">Description</label>
        <textarea
          value={values.description ?? ''}
          onChange={(e) => update('description', e.target.value)}
          rows={3}
          className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-1">Product image</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files?.[0] || null)}
          className="w-full text-sm"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
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
          className="rounded-md bg-brand-500 hover:bg-brand-600 disabled:opacity-60 px-4 py-2 text-sm font-medium text-white"
        >
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Add product'}
        </button>
      </div>
    </form>
  )
}
