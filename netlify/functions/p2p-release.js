// Netlify Function: Release P2P Order (move escrow or direct transfer)
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
      if (o.sellerUid !== uid) throw new Error('Only seller can release')
      if (o.status !== 'paid') throw new Error('Order must be in paid state')

      const buyerRef = db.collection('users').doc(o.buyerUid)
      const sellerRef = db.collection('users').doc(o.sellerUid)
      const buyerSnap = await tx.get(buyerRef)
      const sellerSnap = await tx.get(sellerRef)
      const buyerBal = Number(buyerSnap.data()?.realBalance || 0)
      const sellerBal = Number(sellerSnap.data()?.realBalance || 0)
      const amt = Number(o.amountUsd || 0)

      if (o.escrow === true) {
        // already deducted earlier
        tx.update(buyerRef, { realBalance: buyerBal + amt })
      } else {
        if (sellerBal < amt) throw new Error('Seller balance insufficient to release')
        tx.update(sellerRef, { realBalance: sellerBal - amt })
        tx.update(buyerRef, { realBalance: buyerBal + amt })
      }
      tx.update(orderRef, { status: 'released', releasedAt: admin.firestore.FieldValue.serverTimestamp() })
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
