'use client'

import { useEffect, useRef } from 'react'
import { Printer, X } from 'lucide-react'
import type { Order } from '@/types'
import { parseTs } from '@/lib/utils'

const STORE_NAME    = process.env.NEXT_PUBLIC_STORE_NAME    || 'Pizza Company'
const STORE_ADDRESS = process.env.NEXT_PUBLIC_STORE_ADDRESS || 'Main Road, Okara, Punjab'
const STORE_PHONE   = process.env.NEXT_PUBLIC_STORE_PHONE   || '+92 317 8457586'
const TRACK_ORIGIN  = process.env.NEXT_PUBLIC_SITE_URL      || 'https://pizzacomp.vercel.app'

function fmtDateTime(ts?: string) {
  if (!ts) return ''
  const ms = parseTs(ts as any)
  if (isNaN(ms)) return ''
  return new Date(ms).toLocaleString('en-US', {
    timeZone: 'Asia/Karachi',
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function ReceiptModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const barcodeRef = useRef<SVGSVGElement>(null)
  const paperRef   = useRef<HTMLDivElement>(null)

  const trackingId =
    (order as any).tracking_id || (order as any).order_id || order.id || ''
  const trackUrl = `${TRACK_ORIGIN.replace(/\/$/, '')}/track-order?orderId=${trackingId}`

  // Generate a real scannable Code128 barcode
  useEffect(() => {
    if (!barcodeRef.current) return
    let cancelled = false
    import('jsbarcode').then(({ default: JsBarcode }) => {
      if (cancelled || !barcodeRef.current) return
      try {
        JsBarcode(barcodeRef.current, trackUrl, {
          format: 'CODE128',
          displayValue: false,
          height: 70,
          width: 1.6,
          margin: 0,
          background: '#ffffff',
          lineColor: '#000000',
        })
      } catch (e) { console.error('barcode error:', e) }
    })
    return () => { cancelled = true }
  }, [trackUrl])

  const items    = Array.isArray(order.items) ? (order.items as any[]) : []
  const subtotal = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 1), 0)
  const total    = Number(order.total) || subtotal
  const delivery = Math.max(0, total - subtotal)
  const payment  = ((order as any).payment_method || (order as any).paymentMethod || 'Cash').toUpperCase()
  const orderType= (order as any).order_type || (order as any).orderType || 'Delivery'
  const custName = (order as any).customer?.name || (order as any).customer || ''
  const custPhone= (order as any).customer?.phone || (order as any).phone || ''

  const handlePrint = () => {
    if (!paperRef.current) return
    const html = paperRef.current.outerHTML
    const w = window.open('', '_blank', 'width=420,height=760')
    if (!w) {
      alert('Please allow popups to print the receipt.')
      return
    }
    w.document.write(`<!doctype html>
<html><head>
<meta charset="utf-8" />
<title>Receipt ${trackingId}</title>
<style>
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font-family: 'Courier New', ui-monospace, Menlo, monospace; color: #000; }
  .receipt-paper { background: #fff; color: #000; padding: 14px 12px; font-size: 13px; line-height: 1.45; width: 80mm; box-sizing: border-box; margin: 0 auto; }
  .r-center { text-align: center; }
  .r-logo { font-size: 28px; margin-bottom: 4px; }
  .r-store { font-size: 20px; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 4px; }
  .r-addr { font-size: 12px; }
  .r-sep  { border-top: 1px dashed #000; margin: 10px 0; }
  .r-row  { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; }
  .r-meta { font-size: 12px; margin-top: 2px; }
  .r-item { display: flex; justify-content: space-between; gap: 10px; margin: 3px 0; font-size: 13px; }
  .r-item-name { flex: 1; }
  .r-item-price { white-space: nowrap; font-weight: 600; }
  .r-total { font-weight: 800; font-size: 15px; margin-top: 4px; }
  .r-barcode { margin: 6px 0 4px; }
  .r-barcode svg { width: 100%; height: 70px; display: block; margin: 0 auto; }
  .r-barcode-label { font-size: 11px; margin-top: 2px; letter-spacing: 1px; }
  .r-thanks { margin-top: 10px; font-size: 12px; }
  @page { margin: 0; size: 80mm auto; }
  @media print {
    html, body { width: 80mm; }
    .receipt-paper { width: 80mm; padding: 6mm; }
  }
</style>
</head><body>${html}<script>
  window.onload = function(){ setTimeout(function(){ window.focus(); window.print(); }, 300); };
  window.onafterprint = function(){ window.close(); };
</script></body></html>`)
    w.document.close()
  }

  return (
    <>
      <div
        className="no-print fixed inset-0 z-[200] flex items-start sm:items-center justify-center p-4 overflow-y-auto"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      >
        <div className="relative my-8" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 380 }}>
          {/* Action bar */}
          <div className="no-print flex justify-end gap-2 mb-3">
            <button onClick={handlePrint}
              className="px-5 py-2 rounded-xl font-bold text-white text-sm flex items-center gap-2 shadow-lg transition hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#ea580c,#f97316)' }}>
              <Printer className="w-4 h-4" /> Print
            </button>
            <button onClick={onClose}
              className="px-4 py-2 rounded-xl font-semibold text-sm transition flex items-center gap-1.5"
              style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}>
              <X className="w-4 h-4" /> Close
            </button>
          </div>

          {/* Printable receipt */}
          <div ref={paperRef} id="receipt-paper" className="receipt-paper">
            <div className="r-center">
              <div className="r-logo">🍕</div>
              <div className="r-store">{STORE_NAME}</div>
              <div className="r-addr">{STORE_ADDRESS}</div>
              <div className="r-addr">{STORE_PHONE}</div>
            </div>

            <div className="r-row r-meta"><span>Order: {trackingId}</span><span>{orderType}</span></div>
            <div className="r-row r-meta"><span>Date: {fmtDateTime(order.created_at)}</span></div>
            {custName  && <div className="r-row r-meta"><span>Customer: {custName}</span></div>}
            {custPhone && <div className="r-row r-meta"><span>Phone: {custPhone}</span></div>}

            <div className="r-sep" />

            {items.map((it, i) => (
              <div key={i} className="r-item">
                <div className="r-item-name">
                  {it.qty}× {it.name}{it.size ? ` (${it.size})` : ''}
                </div>
                <div className="r-item-price">
                  Rs. {((Number(it.price) || 0) * (Number(it.qty) || 1)).toLocaleString()}
                </div>
              </div>
            ))}

            <div className="r-sep" />

            <div className="r-row"><span>Subtotal</span><span>Rs. {subtotal.toLocaleString()}</span></div>
            {delivery > 0 && (
              <div className="r-row"><span>Delivery</span><span>Rs. {delivery.toLocaleString()}</span></div>
            )}
            <div className="r-row r-total"><span>TOTAL</span><span>Rs. {total.toLocaleString()}</span></div>

            <div className="r-sep" />
            <div className="r-row"><span>Payment</span><span>{payment}</span></div>
            <div className="r-row r-meta"><span>Status</span><span>{order.status}</span></div>

            <div className="r-sep" />

            <div className="r-center r-barcode">
              <svg ref={barcodeRef} />
              <div className="r-barcode-label">Scan to view order</div>
            </div>

            <div className="r-center r-thanks">
              <div>Thank you for choosing {STORE_NAME}!</div>
              <div style={{ marginTop: 4 }}>We hope to see you again soon.</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .receipt-paper {
          background: #ffffff;
          color: #000;
          font-family: 'Courier New', ui-monospace, Menlo, monospace;
          padding: 22px 18px;
          border-radius: 6px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          font-size: 13px;
          line-height: 1.45;
        }
        .r-center    { text-align: center; }
        .r-logo      { font-size: 28px; margin-bottom: 4px; }
        .r-store     { font-size: 20px; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 4px; }
        .r-addr      { font-size: 12px; }
        .r-sep       { border-top: 1px dashed #000; margin: 10px 0; }
        .r-row       { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; }
        .r-meta      { font-size: 12px; margin-top: 2px; }
        .r-item      { display: flex; justify-content: space-between; gap: 10px; margin: 3px 0; font-size: 13px; }
        .r-item-name { flex: 1; }
        .r-item-price{ white-space: nowrap; font-weight: 600; }
        .r-total     { font-weight: 800; font-size: 15px; margin-top: 4px; }
        .r-barcode   { margin: 6px 0 4px; }
        .r-barcode svg { width: 100%; height: 70px; display: block; margin: 0 auto; }
        .r-barcode-label { font-size: 11px; margin-top: 2px; letter-spacing: 1px; }
        .r-thanks    { margin-top: 10px; font-size: 12px; }
      `}</style>
    </>
  )
}
