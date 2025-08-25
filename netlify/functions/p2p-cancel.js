// Netlify Function: Cancel P2P Order (refund escrow if any)
// Auth: Authorization: Bearer <Firebase ID token>
// Body: { orderId }

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
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders(), body: '' }
    if (event.httpMethod !== 'POST') return badMethod()

    initAdmin()
    const db = admin.firestore()

    const authHeader = event.headers['authorization'] || event.headers['Authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ')) return unauthorized()
    const idToken = authHeader.substring('Bearer '.length)
    const decoded = await admin.auth().verifyIdToken(idToken)
    const uid = decoded.uid

    const { orderId } = JSON.parse(event.body || '{}')
    if (!orderId) return badRequest('orderId required')

    const orderRef = db.collection('p2p_orders').doc(orderId)

    await db.runTransaction(async (tx) => {
      const oSnap = await tx.get(orderRef)
      if (!oSnap.exists) throw new Error('Order not found')
      const o = oSnap.data()
      // Only participants can cancel while pending_payment
      if (o.status !== 'pending_payment') throw new Error('Only pending orders can be cancelled')
      if (o.buyerUid !== uid && o.sellerUid !== uid) throw new Error('Not a participant')

      if (o.escrow === true) {
        const sellerRef = db.collection('users').doc(o.sellerUid)
        const sellerSnap = await tx.get(sellerRef)
        const bal = Number(sellerSnap.data()?.realBalance || 0)
        const amt = Number(o.amountUsd || 0)
        tx.update(sellerRef, { realBalance: bal + amt })
      }
      tx.update(orderRef, { status: 'cancelled', cancelledAt: admin.firestore.FieldValue.serverTimestamp() })
    })

    return ok({ ok: true })
  } catch (e) {
    return serverError(e)
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}
function ok(body) { return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify(body) } }
function badMethod() { return { statusCode: 405, headers: corsHeaders(), body: 'Method Not Allowed' } }
function badRequest(msg) { return { statusCode: 400, headers: corsHeaders(), body: msg } }
function unauthorized() { return { statusCode: 401, headers: corsHeaders(), body: 'Unauthorized' } }
function serverError(e) { return { statusCode: 500, headers: corsHeaders(), body: e.message } }
