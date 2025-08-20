import React, { useEffect, useRef } from 'react'
import { createChart, CrosshairMode } from 'lightweight-charts'

function toCandles(klines) {
  // Binance kline array format: [openTime, open, high, low, close, volume, closeTime, ...]
  return klines.map((k) => ({
    time: Math.floor(k[0] / 1000),
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
  }))
}

export default function TradeChart({ height = 420, theme = 'light', symbol = 'BTCUSDT', interval = '1m', onPriceUpdate }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)
  const pollRef = useRef(null)
  const base = import.meta.env.DEV ? '/api/binance' : '/.netlify/functions/binance'

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: 'solid', color: theme === 'dark' ? '#0b0e11' : '#ffffff' },
        textColor: theme === 'dark' ? '#d1d4dc' : '#333',
      },
      grid: {
        vertLines: { color: theme === 'dark' ? '#1f2329' : '#eee' },
        horzLines: { color: theme === 'dark' ? '#1f2329' : '#eee' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
      autoSize: true,
      height,
    })
    if (typeof chart.addCandlestickSeries !== 'function') {
      // Prevent crash if Vite is still serving an incompatible pre-bundled build
      // Likely needs a dev server restart after changing lightweight-charts version
      // eslint-disable-next-line no-console
      console.error('Chart API missing addCandlestickSeries — try restarting the dev server to clear Vite cache')
      return () => { chart.remove() }
    }
    const series = chart.addCandlestickSeries({
      upColor: '#16c784',
      downColor: '#ea3943',
      borderVisible: false,
      wickUpColor: '#16c784',
      wickDownColor: '#ea3943',
    })

    async function loadInitial() {
      try {
        const url = `${base}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=500`
        const res = await fetch(url)
        if (!res.ok) throw new Error('Failed to fetch klines')
        const data = await res.json()
        const candles = toCandles(data)
        series.setData(candles)
        chart.timeScale().fitContent()
        if (onPriceUpdate && candles.length) onPriceUpdate(candles[candles.length - 1].close)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Chart init error', e)
      }
    }

    function startPolling() {
      stopPolling()
      pollRef.current = setInterval(async () => {
        try {
          const url = `${base}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=2`
          const res = await fetch(url)
          if (!res.ok) return
          const data = await res.json()
          const candles = toCandles(data)
          const last = candles[candles.length - 1]
          series.update(last)
          if (onPriceUpdate) onPriceUpdate(last.close)
        } catch {}
      }, 5000)
    }

    function stopPolling() {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }

    loadInitial()
    startPolling()

    chartRef.current = chart
    seriesRef.current = series

    // Resize handling
    const ro = new ResizeObserver(() => {
      chart.applyOptions({}) // autoSize takes care of it
      chart.timeScale().fitContent()
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      stopPolling()
      chart.remove()
    }
  }, [height, theme, symbol, interval])

  return (
    <div ref={containerRef} style={{ width: '100%', height }} />
  )
}
