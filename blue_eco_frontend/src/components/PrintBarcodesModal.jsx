import { useEffect, useRef, useState } from 'react'
import JsBarcode from 'jsbarcode'
import { markBatchPrinted } from '../lib/inventoryApi'

export default function PrintBarcodesModal({ batch, product, onClose, onPrinted }) {
  const containerRef = useRef(null)
  const [marking, setMarking] = useState(false)

  const barcodeValue = batch.batch_no
  const labelCount = batch.quantity

  useEffect(() => {
    // JsBarcode needs a real SVG node per label — render one per printed copy.
    const svgs = containerRef.current?.querySelectorAll('svg[data-code]') || []
    svgs.forEach((el) => {
      JsBarcode(el, barcodeValue, {
        format: 'CODE128',
        width: 1.6,
        height: 40,
        fontSize: 11,
        margin: 4,
        displayValue: true,
      })
    })
  }, [barcodeValue, labelCount])

  function handlePrint() {
    window.print()
  }

  async function handleMarkPrinted() {
    setMarking(true)
    try {
      await markBatchPrinted(batch.id)
      onPrinted?.()
    } finally {
      setMarking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 print:bg-white print:p-0">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-surface border border-border print:max-h-none print:overflow-visible print:border-0 print:rounded-none print:max-w-none print:shadow-none">
        <div className="flex items-center justify-between border-b border-border px-5 py-4 print:hidden">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">
              Barcode Sticker Labels — {product?.name}
            </h2>
            <p className="text-xs text-ink-soft mt-0.5">
              Batch {batch.batch_no} · {labelCount} label{labelCount === 1 ? '' : 's'}
            </p>
          </div>
          <button onClick={onClose} className="text-ink-soft hover:text-ink text-sm" aria-label="Close">
            ✕
          </button>
        </div>

        <div ref={containerRef} className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2">
          {Array.from({ length: labelCount }, (_, i) => (
            <div
              key={i}
              className="rounded-md border border-border p-2 flex flex-col items-center print:border print:break-inside-avoid"
            >
              <p className="text-[10px] text-ink-soft truncate w-full text-center">{product?.name}</p>
              <svg data-code={barcodeValue} className="w-full" />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4 print:hidden">
          <p className="text-xs text-ink-soft">
            {batch.printed ? 'Already marked as printed.' : 'Not yet marked as printed.'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleMarkPrinted}
              disabled={marking || batch.printed}
              className="rounded-md border border-border px-4 py-2 text-sm text-ink hover:bg-canvas disabled:opacity-50"
            >
              {marking ? 'Saving…' : batch.printed ? 'Printed ✓' : 'Mark as printed'}
            </button>
            <button
              onClick={handlePrint}
              className="rounded-md bg-brand-500 hover:bg-brand-600 px-4 py-2 text-sm font-medium text-white"
            >
              Print
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
