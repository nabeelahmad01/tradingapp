// Netlify Function: Get NOWPayments minimum USD amount for selected pay_currency
// Request: POST { asset }
// Response: { minUsd, payCurrency }

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors(), body: '' }
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors(), body: 'Method Not Allowed' }

    const { asset } = JSON.parse(event.body || '{}')
    if (!asset) return { statusCode: 400, headers: cors(), body: 'asset required' }

    const apiKey = process.env.NOWPAYMENTS_API_KEY
    if (!apiKey) return { statusCode: 500, headers: cors(), body: 'NOWPAYMENTS_API_KEY not set' }

    const payCurrency = mapAssetToNow(asset)

    const url = `https://api.nowpayments.io/v1/min-amount?currency_from=usd&currency_to=${encodeURIComponent(payCurrency)}`
    const res = await fetch(url, { headers: { 'x-api-key': apiKey } })
    const data = await res.json()
    if (!res.ok) {
      return { statusCode: res.status, headers: cors(), body: JSON.stringify({ error: data?.message || 'NOWPayments error', data }) }
    }

    // API returns { min_amount, currency_from, currency_to }
    const minUsdRaw = Number(data?.min_amount || 0)
    // Add safety buffer to account for exchange rate drift and rounding to crypto units
    // Use a stronger buffer for BTC since its minimum in crypto often causes rounding issues
    const isBtc = payCurrency === 'btc'
    const buffered = isBtc
      ? Math.max(minUsdRaw * 1.06, minUsdRaw + 1) // ~6% or +$1 for BTC
      : Math.max(minUsdRaw * 1.02, minUsdRaw + 0.5)
    const minUsd = Math.round(buffered * 100) / 100 // 2 decimals

    return { statusCode: 200, headers: cors(), body: JSON.stringify({ ok: true, minUsd, payCurrency }) }
  } catch (e) {
    return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: e.message }) }
  }
}

function mapAssetToNow(asset) {
  const a = String(asset).toUpperCase()
  if (a === 'BTC') return 'btc'
  if (a === 'ETH') return 'eth'
  if (a === 'TRX') return 'trx'
  if (a === 'BNB' || a === 'BNB-BEP20') return 'bnbbsc'
  if (a === 'USDT-TRC20' || a === 'USDT TRC20' || a === 'USDTTRC20') return 'usdttrc20'
  if (a === 'USDT-ERC20' || a === 'USDT ERC20' || a === 'USDTERC20') return 'usdterc20'
  return a.toLowerCase()
}

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}
