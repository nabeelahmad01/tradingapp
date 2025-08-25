// Netlify Function: Mark P2P Order as Paid
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
      if (o.buyerUid !== uid) throw new Error('Only buyer can mark paid')
      if (o.status !== 'pending_payment') throw new Error('Invalid state')
      tx.update(orderRef, { status: 'paid' })
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
