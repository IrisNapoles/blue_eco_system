import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PageHeader, styles, LoadingState } from '../components/ui'
import {
  getProductCosts,
  updateProductCost,
  bulkUpdateProductCosts,
  getOperatingExpenses,
  updateOperatingExpense,
  updateTaxRate,
} from '../lib/businessSettingsApi'

function formatPeso(amount) {
  const n = Number(amount) || 0
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function BusinessSettings() {
  const [tab, setTab] = useState('costs') // 'costs' | 'expenses'

  return (
    <div className="font-['Plus_Jakarta_Sans']">
      <Link to="/settings" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-ink/50 hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Settings
      </Link>
      <PageHeader
        title="Product Costs & Expenses"
        subtitle="Used to compute Net Profit on the Dashboard. Changing a value here never changes past reports — it only takes effect from the date you set."
      />

      <div className="mt-5 flex gap-2">
        <button
          onClick={() => setTab('costs')}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === 'costs' ? 'bg-ink text-white' : 'bg-white text-ink/50 hover:bg-brand-100'
          }`}
        >
          Product Costs (COGS)
        </button>
        <button
          onClick={() => setTab('expenses')}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === 'expenses' ? 'bg-ink text-white' : 'bg-white text-ink/50 hover:bg-brand-100'
          }`}
        >
          Operating Expenses & Tax
        </button>
      </div>

      <div className="mt-5">{tab === 'costs' ? <ProductCostsSection /> : <OperatingExpensesSection />}</div>
    </div>
  )
}

function ProductCostsSection() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ cost_price: '', effective_from: todayStr() })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [bulkPercent, setBulkPercent] = useState('')
  const [bulkSkipExisting, setBulkSkipExisting] = useState(true)
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkMessage, setBulkMessage] = useState('')

  function load() {
    setLoading(true)
    getProductCosts()
      .then(setProducts)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  function startEdit(product) {
    setEditingId(product.id)
    setForm({ cost_price: product.cost_price ?? '', effective_from: todayStr() })
    setError('')
  }

  async function save(productId) {
    setError('')
    if (form.cost_price === '' || Number(form.cost_price) < 0) {
      setError('Enter a valid cost.')
      return
    }
    setSaving(true)
    try {
      await updateProductCost(productId, form)
      setEditingId(null)
      load()
    } catch {
      setError('Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function applyBulk() {
    setBulkMessage('')
    setError('')
    if (bulkPercent === '' || Number(bulkPercent) < 0) {
      setError('Enter a valid percentage.')
      return
    }
    setBulkSaving(true)
    try {
      const result = await bulkUpdateProductCosts({
        percent_of_price: bulkPercent,
        skip_existing: bulkSkipExisting,
      })
      setBulkMessage(result.message)
      load()
    } catch {
      setError('Could not apply. Please try again.')
    } finally {
      setBulkSaving(false)
    }
  }

  if (loading) return <LoadingState label="Loading product costs…" />

  return (
    <div className="space-y-4">
      <div className={styles.card}>
        <h2 className="text-sm font-bold text-ink">Quick setup: set cost as % of selling price</h2>
        <p className="mt-1 text-xs text-ink/50">
          Sets every product's cost to this percentage of its own selling price, in one go — a fast starting point
          instead of entering each product one by one. You can still fine-tune any product individually afterward.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="1"
              placeholder="60"
              className={`${styles.inputSquare} max-w-[100px]`}
              value={bulkPercent}
              onChange={(e) => setBulkPercent(e.target.value)}
            />
            <span className="text-sm text-ink/50">% of selling price</span>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-ink/60">
            <input
              type="checkbox"
              checked={bulkSkipExisting}
              onChange={(e) => setBulkSkipExisting(e.target.checked)}
            />
            Skip products that already have a cost set
          </label>
          <button onClick={applyBulk} disabled={bulkSaving} className={`${styles.btnPrimary} disabled:opacity-50`}>
            {bulkSaving ? 'Applying…' : 'Apply to all products'}
          </button>
        </div>
        {bulkMessage && <p className="mt-2 text-xs font-semibold text-brand-600">{bulkMessage}</p>}
      </div>

      <div className={styles.card}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-[11px] uppercase tracking-wide text-ink/40">
              <th className="pb-2 pr-3">Product</th>
              <th className="pb-2 pr-3">SKU</th>
              <th className="pb-2 pr-3">Selling price</th>
              <th className="pb-2 pr-3">Current cost</th>
              <th className="pb-2 pr-3">Effective from</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-ink/5 last:border-0">
                <td className="py-2.5 pr-3 font-semibold text-ink">{p.name}</td>
                <td className="py-2.5 pr-3 text-ink/50">{p.sku || '—'}</td>
                <td className="py-2.5 pr-3 text-ink/70">{formatPeso(p.price)}</td>
                {editingId === p.id ? (
                  <>
                    <td className="py-2.5 pr-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className={styles.inputSquare}
                        value={form.cost_price}
                        onChange={(e) => setForm((f) => ({ ...f, cost_price: e.target.value }))}
                        autoFocus
                      />
                    </td>
                    <td className="py-2.5 pr-3">
                      <input
                        type="date"
                        className={styles.inputSquare}
                        value={form.effective_from}
                        onChange={(e) => setForm((f) => ({ ...f, effective_from: e.target.value }))}
                      />
                    </td>
                    <td className="py-2.5 whitespace-nowrap">
                      <button
                        onClick={() => save(p.id)}
                        disabled={saving}
                        className="mr-2 text-xs font-bold text-brand-600 hover:underline disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-xs text-ink/40 hover:underline">
                        Cancel
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-2.5 pr-3 font-semibold text-ink">
                      {p.cost_price !== null ? formatPeso(p.cost_price) : <span className="text-ink/30">Not set</span>}
                    </td>
                    <td className="py-2.5 pr-3 text-ink/50">{p.cost_effective_from || '—'}</td>
                    <td className="py-2.5">
                      <button onClick={() => startEdit(p)} className="text-xs font-bold text-brand-600 hover:underline">
                        Edit
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <p className={`${styles.errorBox} mt-3`}>{error}</p>}
    </div>
    </div>
  )
}

function OperatingExpensesSection() {
  const [items, setItems] = useState([])
  const [taxRate, setTaxRate] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingKey, setEditingKey] = useState(null) // `${category}|${label}`
  const [form, setForm] = useState({ monthly_amount: '', effective_from: todayStr() })
  const [addingCustom, setAddingCustom] = useState(false)
  const [customForm, setCustomForm] = useState({ label: '', monthly_amount: '', effective_from: todayStr() })
  const [savingTax, setSavingTax] = useState(false)
  const [error, setError] = useState('')

  function load() {
    setLoading(true)
    getOperatingExpenses()
      .then((data) => {
        setItems(data.items)
        setTaxRate(String(data.tax_rate_percent))
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  function startEdit(item) {
    setEditingKey(`${item.category}|${item.label || ''}`)
    setForm({ monthly_amount: item.monthly_amount || '', effective_from: todayStr() })
    setError('')
  }

  async function save(item) {
    setError('')
    if (form.monthly_amount === '' || Number(form.monthly_amount) < 0) {
      setError('Enter a valid amount.')
      return
    }
    try {
      await updateOperatingExpense({
        category: item.category,
        label: item.category === 'other' ? item.label : undefined,
        monthly_amount: form.monthly_amount,
        effective_from: form.effective_from,
      })
      setEditingKey(null)
      load()
    } catch {
      setError('Could not save. Please try again.')
    }
  }

  async function saveCustom() {
    setError('')
    if (!customForm.label.trim()) {
      setError('Enter a name for this expense.')
      return
    }
    if (customForm.monthly_amount === '' || Number(customForm.monthly_amount) < 0) {
      setError('Enter a valid amount.')
      return
    }
    try {
      await updateOperatingExpense({ category: 'other', ...customForm })
      setAddingCustom(false)
      setCustomForm({ label: '', monthly_amount: '', effective_from: todayStr() })
      load()
    } catch {
      setError('Could not save. Please try again.')
    }
  }

  async function saveTaxRate() {
    setError('')
    if (taxRate === '' || Number(taxRate) < 0 || Number(taxRate) > 100) {
      setError('Enter a valid tax rate (0–100).')
      return
    }
    setSavingTax(true)
    try {
      await updateTaxRate(taxRate)
    } catch {
      setError('Could not save tax rate.')
    } finally {
      setSavingTax(false)
    }
  }

  if (loading) return <LoadingState label="Loading operating expenses…" />

  const monthlyTotal = items.reduce((sum, i) => sum + Number(i.monthly_amount || 0), 0)

  return (
    <div className="space-y-4">
      <div className={styles.card}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">Tax rate</h2>
        </div>
        <p className="mt-1 text-xs text-ink/50">
          Percentage of gross sales. Default 3% is the PH Percentage Tax rate for a non-VAT-registered business — use
          12% if VAT-registered, or your actual rate.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            className={`${styles.inputSquare} max-w-[120px]`}
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
          />
          <span className="text-sm text-ink/50">%</span>
          <button onClick={saveTaxRate} disabled={savingTax} className={`${styles.btnPrimary} disabled:opacity-50`}>
            {savingTax ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">Monthly operating expenses</h2>
          <p className="text-sm font-bold text-ink">{formatPeso(monthlyTotal)}/mo total</p>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-[11px] uppercase tracking-wide text-ink/40">
                <th className="pb-2 pr-3">Category</th>
                <th className="pb-2 pr-3">Monthly amount</th>
                <th className="pb-2 pr-3">Effective from</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const key = `${item.category}|${item.label || ''}`
                return (
                  <tr key={key} className="border-b border-ink/5 last:border-0">
                    <td className="py-2.5 pr-3 font-semibold text-ink">{item.label}</td>
                    {editingKey === key ? (
                      <>
                        <td className="py-2.5 pr-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className={styles.inputSquare}
                            value={form.monthly_amount}
                            onChange={(e) => setForm((f) => ({ ...f, monthly_amount: e.target.value }))}
                            autoFocus
                          />
                        </td>
                        <td className="py-2.5 pr-3">
                          <input
                            type="date"
                            className={styles.inputSquare}
                            value={form.effective_from}
                            onChange={(e) => setForm((f) => ({ ...f, effective_from: e.target.value }))}
                          />
                        </td>
                        <td className="py-2.5 whitespace-nowrap">
                          <button
                            onClick={() => save(item)}
                            className="mr-2 text-xs font-bold text-brand-600 hover:underline"
                          >
                            Save
                          </button>
                          <button onClick={() => setEditingKey(null)} className="text-xs text-ink/40 hover:underline">
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2.5 pr-3 font-semibold text-ink">{formatPeso(item.monthly_amount)}</td>
                        <td className="py-2.5 pr-3 text-ink/50">{item.effective_from || '—'}</td>
                        <td className="py-2.5">
                          <button onClick={() => startEdit(item)} className="text-xs font-bold text-brand-600 hover:underline">
                            Edit
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {error && <p className={`${styles.errorBox} mt-3`}>{error}</p>}

        <div className="mt-4 border-t border-ink/10 pt-4">
          {addingCustom ? (
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label className={styles.label}>Name</label>
                <input
                  className={styles.inputSquare}
                  placeholder="e.g. Delivery van fuel"
                  value={customForm.label}
                  onChange={(e) => setCustomForm((f) => ({ ...f, label: e.target.value }))}
                />
              </div>
              <div>
                <label className={styles.label}>Monthly amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={styles.inputSquare}
                  value={customForm.monthly_amount}
                  onChange={(e) => setCustomForm((f) => ({ ...f, monthly_amount: e.target.value }))}
                />
              </div>
              <div>
                <label className={styles.label}>Effective from</label>
                <input
                  type="date"
                  className={styles.inputSquare}
                  value={customForm.effective_from}
                  onChange={(e) => setCustomForm((f) => ({ ...f, effective_from: e.target.value }))}
                />
              </div>
              <button onClick={saveCustom} className={styles.btnPrimary}>
                Add
              </button>
              <button onClick={() => setAddingCustom(false)} className={styles.btnSecondary}>
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setAddingCustom(true)} className="text-sm font-bold text-brand-600 hover:underline">
              + Add a custom expense
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
