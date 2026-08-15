import { useState, useEffect, useRef, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { ScanLine, Trash2, CheckCircle2 } from 'lucide-react'
import { lookupBarcode } from '../lib/inventoryApi'
import { createSale } from '../lib/salesApi'

const SCANNER_ELEMENT_ID = 'barcode-scanner-region'

export default function BarcodeStockout() {
  const [scanning, setScanning] = useState(false)
  const [cart, setCart] = useState([]) // [{product_id, name, price, quantity, batch_no}]
  const [scannedCount, setScannedCount] = useState(0)
  const [lookupError, setLookupError] = useState(null)
  const [manualCode, setManualCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const scannerRef = useRef(null)
  const lastScanRef = useRef({ code: null, time: 0 })

  const startScanner = useCallback(async () => {
    setLookupError(null)
    try {
      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID)
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 140 } },
        (decodedText) => handleScanResult(decodedText),
        () => {} // ignore per-frame "not found" noise
      )
      setScanning(true)
    } catch (err) {
      setLookupError('Could not access the camera. Check browser permissions, or use manual entry below.')
    }
  }, [])

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        await scannerRef.current.clear()
      } catch {
        // scanner may already be stopped — safe to ignore
      }
    }
    setScanning(false)
  }, [])

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  async function handleScanResult(code) {
    // Debounce: the camera fires the same decode many times per second
    // while the barcode stays in frame — ignore repeats within 2s.
    const now = Date.now()
    if (lastScanRef.current.code === code && now - lastScanRef.current.time < 2000) return
    lastScanRef.current = { code, time: now }

    await lookupAndAdd(code)
  }

  async function lookupAndAdd(code) {
    setLookupError(null)
    try {
      const { product, batch } = await lookupBarcode(code)
      setScannedCount((c) => c + 1)
      setCart((prev) => {
        const existing = prev.find((item) => item.product_id === product.id)
        if (existing) {
          return prev.map((item) =>
            item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          )
        }
        return [
          ...prev,
          {
            product_id: product.id,
            name: product.name,
            price: Number(product.price),
            quantity: 1,
            batch_no: batch.batch_no,
          },
        ]
      })
    } catch (err) {
      setLookupError(err.response?.data?.message || 'No product found for this barcode.')
    }
  }

  function handleManualSubmit(e) {
    e.preventDefault()
    if (!manualCode.trim()) return
    lookupAndAdd(manualCode.trim())
    setManualCode('')
  }

  function updateQuantity(productId, quantity) {
    setCart((prev) =>
      prev.map((item) => (item.product_id === productId ? { ...item, quantity: Math.max(1, quantity) } : item))
    )
  }

  function removeItem(productId) {
    setCart((prev) => prev.filter((item) => item.product_id !== productId))
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  async function handleCompleteSale() {
    if (cart.length === 0) return
    setSubmitting(true)
    try {
      const sale = await createSale(cart.map((item) => ({ product_id: item.product_id, quantity: item.quantity })))
      setReceipt({ sale, items: cart, total })
      setCart([])
      setScannedCount(0)
      stopScanner()
    } catch (err) {
      setLookupError(err.response?.data?.message || 'Could not complete this sale.')
    } finally {
      setSubmitting(false)
    }
  }

  if (receipt) {
    return <ReceiptView receipt={receipt} onNewSale={() => setReceipt(null)} />
  }

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-ink">Barcode Stock-Out</h1>
      <p className="mt-1 text-sm text-ink-soft">Scan product barcodes to build a sale.</p>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Scanner column */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-ink flex items-center gap-1.5">
              <ScanLine size={16} /> Scanner
            </p>
            <span className="text-xs text-ink-soft">{scannedCount} scanned this session</span>
          </div>

          <div
            id={SCANNER_ELEMENT_ID}
            className="rounded-lg overflow-hidden bg-canvas"
            style={{ minHeight: scanning ? 'auto' : '180px' }}
          />

          {!scanning ? (
            <button
              onClick={startScanner}
              className="mt-3 w-full rounded-md bg-brand-500 hover:bg-brand-600 px-4 py-2.5 text-sm font-medium text-white"
            >
              Start camera
            </button>
          ) : (
            <button
              onClick={stopScanner}
              className="mt-3 w-full rounded-md border border-border px-4 py-2.5 text-sm font-medium text-ink-soft hover:bg-canvas"
            >
              Stop camera
            </button>
          )}

          {lookupError && (
            <div className="mt-3 rounded-md bg-danger-50 border border-danger-500/30 px-3 py-2 text-sm text-danger-700">
              {lookupError}
            </div>
          )}

          <form onSubmit={handleManualSubmit} className="mt-4 pt-4 border-t border-border">
            <label className="block text-xs font-medium text-ink mb-1">
              Camera not working? Enter barcode manually
            </label>
            <div className="flex gap-2">
              <input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="e.g. SP-2024-GRN-03-0001"
                className="flex-1 rounded-md border border-border px-3 py-2 text-sm font-mono focus:border-brand-500"
              />
              <button
                type="submit"
                className="rounded-md border border-border px-4 py-2 text-sm text-ink hover:bg-canvas"
              >
                Add
              </button>
            </div>
          </form>
        </div>

        {/* Cart column */}
        <div className="rounded-xl border border-border bg-surface p-5 flex flex-col">
          <p className="text-sm font-medium text-ink mb-3">Cart ({cart.length})</p>
          <div className="flex-1 space-y-2 max-h-80 overflow-y-auto">
            {cart.map((item) => (
              <div key={item.product_id} className="flex items-center gap-2 border-b border-border pb-2 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{item.name}</p>
                  <p className="text-xs text-ink-soft font-mono">Batch {item.batch_no}</p>
                </div>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateQuantity(item.product_id, Number(e.target.value))}
                  className="w-16 rounded-md border border-border px-2 py-1 text-sm text-center focus:border-brand-500"
                />
                <p className="w-20 text-right text-sm font-medium text-ink">
                  ₱{(item.price * item.quantity).toFixed(2)}
                </p>
                <button onClick={() => removeItem(item.product_id)} className="text-danger-500 shrink-0">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {cart.length === 0 && (
              <p className="text-sm text-ink-soft text-center py-10">Scan a barcode to add items.</p>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <p className="text-sm text-ink-soft">
              Total: <span className="font-semibold text-ink text-base">₱{total.toFixed(2)}</span>
            </p>
            <button
              onClick={handleCompleteSale}
              disabled={cart.length === 0 || submitting}
              className="rounded-md bg-brand-500 hover:bg-brand-600 disabled:opacity-50 px-5 py-2.5 text-sm font-medium text-white"
            >
              {submitting ? 'Completing…' : 'Complete Sale'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReceiptView({ receipt, onNewSale }) {
  const { sale, items, total } = receipt
  return (
    <div className="max-w-md mx-auto">
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="text-center mb-4">
          <CheckCircle2 className="mx-auto text-brand-500" size={40} />
          <h1 className="mt-2 font-display text-lg font-semibold text-ink">Sale Complete</h1>
          <p className="text-xs text-ink-soft">Sale #{sale.id} · {new Date(sale.created_at).toLocaleString()}</p>
        </div>

        <div className="border-t border-dashed border-border pt-3 space-y-1.5">
          {items.map((item) => (
            <div key={item.product_id} className="flex justify-between text-sm">
              <span className="text-ink-soft">{item.name} ×{item.quantity}</span>
              <span className="text-ink">₱{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-border mt-3 pt-3 flex justify-between">
          <span className="font-medium text-ink">Total</span>
          <span className="font-display font-semibold text-lg text-brand-600">₱{total.toFixed(2)}</span>
        </div>

        <button
          onClick={onNewSale}
          className="mt-6 w-full rounded-md bg-brand-500 hover:bg-brand-600 px-4 py-2.5 text-sm font-medium text-white"
        >
          Start new sale
        </button>
      </div>
    </div>
  )
}
