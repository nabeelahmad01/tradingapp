// Netlify Function: Create P2P Order (server-side escrow)
// Auth: Authorization: Bearer <Firebase ID token>
// Body: { listingId, amountUsd }
// Env: FIREBASE_SERVICE_ACCOUNT

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

    const { listingId, amountUsd } = JSON.parse(event.body || '{}')
    const amt = Number(amountUsd)
    if (!listingId || !amt || amt <= 0) return badRequest('listingId and positive amountUsd required')

    const listingRef = db.collection('p2p_listings').doc(listingId)
    const listingSnap = await listingRef.get()
    if (!listingSnap.exists) return badRequest('Listing not found')
    const listing = listingSnap.data()
    if (listing.active !== true) return badRequest('Listing inactive')

    if (amt < Number(listing.min || 0) || amt > Number(listing.max || 0)) {
      return badRequest(`Amount must be between ${listing.min} and ${listing.max}`)
    }

    const orderRef = db.collection('p2p_orders').doc()

    await db.runTransaction(async (tx) => {
      const order = {
        listingId,
        side: listing.side,
        asset: listing.asset,
        price: listing.price,
        min: listing.min,
        max: listing.max,
        sellerUid: listing.side === 'sell' ? listing.uid : uid,
        sellerEmail: listing.side === 'sell' ? (listing.email || null) : (decoded.email || null),
        buyerUid: listing.side === 'buy' ? listing.uid : uid,
        buyerEmail: listing.side === 'buy' ? (listing.email || null) : (decoded.email || null),
        amountUsd: amt,
        status: 'pending_payment',
        escrow: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }

      tx.set(orderRef, order)

      // Escrow from seller if listing is sell
      if (listing.side === 'sell') {
        const sellerUid = listing.uid
        const sellerRef = db.collection('users').doc(sellerUid)
        const sellerSnap = await tx.get(sellerRef)
        const bal = Number(sellerSnap.data()?.realBalance || 0)
        if (bal < amt) throw new Error('Seller has insufficient balance for escrow')
        tx.update(sellerRef, { realBalance: bal - amt })
        tx.update(orderRef, { escrow: true })
      }
    })

    return ok({ orderId: orderRef.id })
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
