// Netlify Function: NOWPayments IPN/Webhook handler
// Verifies signature and credits user balance on confirmed payments.
// Env: NOWPAYMENTS_IPN_SECRET, FIREBASE_SERVICE_ACCOUNT

const crypto = require('crypto')
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
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers: cors(), body: 'Method Not Allowed' }
    }

    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET
    if (!ipnSecret) return { statusCode: 500, headers: cors(), body: 'NOWPAYMENTS_IPN_SECRET not set' }

    const body = event.body || ''
    // NOWPayments sends HMAC-SHA512 signature in 'x-nowpayments-sig'
    const signature = event.headers['x-nowpayments-sig'] || event.headers['X-Nowpayments-Sig'] || ''
    const computed = crypto.createHmac('sha512', ipnSecret).update(body).digest('hex')
    if (computed !== signature) {
      return { statusCode: 401, headers: cors(), body: 'invalid signature' }
    }

    const payload = JSON.parse(body)
    // Reference: https://nowpayments.io/docs/ipn
    // Check payment_status: finished/confirmed/partially_paid etc.
    const invoiceId = String(payload?.invoice_id || '')
    const paymentStatus = String(payload?.payment_status || '').toLowerCase()
    const payAmount = Number(payload?.pay_amount || 0)

    if (!invoiceId) return { statusCode: 400, headers: cors(), body: 'missing invoice_id' }

    initAdmin()
    const db = admin.firestore()

    // Load deposit intent
    const intentRef = db.collection('depositIntents').doc(invoiceId)
    const intentSnap = await intentRef.get()
    if (!intentSnap.exists) {
      // Unknown invoice, ignore
      return { statusCode: 200, headers: cors(), body: JSON.stringify({ ok: true }) }
    }
    const intent = intentSnap.data()

    // Process only once
    if (intent.status === 'confirmed' || intent.status === 'credited') {
      return { statusCode: 200, headers: cors(), body: JSON.stringify({ ok: true }) }
    }

    // Accept only completed statuses
    const success = paymentStatus === 'finished' || paymentStatus === 'confirmed'
    if (!success) {
      // Update status for visibility
      await intentRef.update({ status: paymentStatus })
      return { statusCode: 200, headers: cors(), body: JSON.stringify({ ok: true }) }
    }

    // Credit user balance atomically
    await db.runTransaction(async (tx) => {
      const userRef = db.collection('users').doc(intent.uid)
      const userSnap = await tx.get(userRef)
      const bal = Number(userSnap.data()?.realBalance || 0)
      // Credit amount in USD equivalent stored in intent.amountUsd
      const creditUsd = Number(intent.amountUsd || 0)
      tx.update(userRef, { realBalance: bal + creditUsd })
      tx.update(intentRef, { status: 'confirmed', confirmedAt: admin.firestore.FieldValue.serverTimestamp(), payAmount })

      // Also record in deposits collection for admin view
      const depRef = db.collection('deposits').doc()
      tx.set(depRef, {
        uid: intent.uid,
        email: intent.email || null,
        amount: creditUsd,
        txId: `NOWP:${invoiceId}`,
        screenshotUrl: null,
        status: 'approved',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    })

    return { statusCode: 200, headers: cors(), body: JSON.stringify({ ok: true }) }
  } catch (e) {
    return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: e.message }) }
  }
}

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}
