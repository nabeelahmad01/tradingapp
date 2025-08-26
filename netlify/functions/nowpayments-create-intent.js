// Netlify Function: Create NOWPayments Invoice/Payment Intent
// Env required: NOWPAYMENTS_API_KEY, APP_BASE_URL (for redirects), NOWPAYMENTS_IPN_SECRET
// Docs: https://nowpayments.io/docs

const admin = require('firebase-admin')

function initAdmin() {
  if (admin.apps.length) return
  const svcB64 = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!svcB64) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT')
  const svcJson = Buffer.from(svcB64, 'base64').toString('utf8')
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(svcJson)) })
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 204, headers: cors(), body: '' }
    }
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers: cors(), body: 'Method Not Allowed' }
    }
    const { asset, amountUsd, uid, email } = JSON.parse(event.body || '{}')
    if (!asset || !amountUsd || !uid) {
      return { statusCode: 400, headers: cors(), body: 'asset, amountUsd, uid required' }
    }
    const apiKey = process.env.NOWPAYMENTS_API_KEY
    const baseUrl = process.env.APP_BASE_URL || 'https://example.com'
    if (!apiKey) return { statusCode: 500, headers: cors(), body: 'NOWPAYMENTS_API_KEY not set' }

    // Map UI asset to NOWPayments pay_currency code
    const payCurrency = mapAssetToNow(asset)

    const orderId = `${uid}-${Date.now()}`
    const payload = {
      price_amount: Number(amountUsd),
      price_currency: 'usd',
      pay_currency: payCurrency, // e.g., btc, eth, usdttrc20
      order_id: orderId,
      order_description: `Deposit ${amountUsd} USD by ${email || uid}`,
      success_url: `${baseUrl}/deposit?status=success` ,
      cancel_url: `${baseUrl}/deposit?status=cancel`,
      ipn_callback_url: `${baseUrl}/.netlify/functions/nowpayments-webhook`,
    }

    const res = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    if (!res.ok) {
      return { statusCode: res.status, headers: cors(), body: JSON.stringify({ error: data?.message || 'NOWPayments error', data }) }
    }

    // Save deposit intent for tracking
    initAdmin()
    const db = admin.firestore()
    await db.collection('depositIntents').doc(String(data.id)).set({
      provider: 'nowpayments',
      invoiceId: String(data.id),
      orderId,
      uid,
      email: email || null,
      asset,
      payCurrency,
      amountUsd: Number(amountUsd),
      invoiceUrl: data?.invoice_url || null,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    // Return hosted invoice URL and identifiers
    return {
      statusCode: 200,
      headers: cors(),
      body: JSON.stringify({ ok: true, invoice: data, orderId }),
    }
  } catch (e) {
    return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: e.message }) }
  }
}

function mapAssetToNow(asset) {
  const a = String(asset).toUpperCase()
  // Common NOWPayments pay_currency codes
  if (a === 'BTC') return 'btc'
  if (a === 'ETH') return 'eth'
  if (a === 'TRX') return 'trx'
  if (a === 'BNB' || a === 'BNB-BEP20') return 'bnbbsc'
  if (a === 'USDT-TRC20' || a === 'USDT TRC20' || a === 'USDTTRC20') return 'usdttrc20'
  if (a === 'USDT-ERC20' || a === 'USDT ERC20' || a === 'USDTERC20') return 'usdterc20'
  // Fallback: try generic symbol lowercased
  return a.toLowerCase()
}

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}
