// Netlify Function: Confirm internal transfer with OTP
// Auth: Authorization: Bearer <Firebase ID token>
// Body: { transferId, code }
// Env: FIREBASE_SERVICE_ACCOUNT

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
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }
    initAdmin()
    const db = admin.firestore()

    const authHeader = event.headers['authorization'] || event.headers['Authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ')) return { statusCode: 401, body: 'Unauthorized' }
    const idToken = authHeader.substring('Bearer '.length)
    const decoded = await admin.auth().verifyIdToken(idToken)
    const uid = decoded.uid

    const { transferId, code } = JSON.parse(event.body || '{}')
    if (!transferId || !code) return { statusCode: 400, body: 'transferId and code required' }

    const tRef = db.collection('internalTransfers').doc(transferId)
    const tSnap = await tRef.get()
    if (!tSnap.exists) return { statusCode: 400, body: 'Transfer not found' }
    const t = tSnap.data()

    if (t.fromUid !== uid) return { statusCode: 403, body: 'Not allowed' }
    if (t.status !== 'otp_pending') return { statusCode: 400, body: 'Transfer already processed' }

    // Verify OTP from emailOtps collection
    const email = (t.fromEmail || decoded.email || '').toLowerCase()
    if (!email) return { statusCode: 400, body: 'Sender email missing' }
    const otpRef = db.collection('emailOtps').doc(email)
    const otpSnap = await otpRef.get()
    if (!otpSnap.exists) return { statusCode: 400, body: 'code invalid' }
    const otp = otpSnap.data()
    if (Date.now() > otp.expiresAt) {
      await otpRef.delete()
      return { statusCode: 400, body: 'code expired' }
    }
    const hash = crypto.createHash('sha256').update(code).digest('hex')
    if (hash !== otp.hash) {
      const attempts = (otp.attempts || 0) + 1
      await otpRef.update({ attempts })
      return { statusCode: 400, body: 'code invalid' }
    }

    // Passed OTP; consume it and process transfer transactionally
    await db.runTransaction(async (tx) => {
      const fromRef = db.collection('users').doc(t.fromUid)
      const toRef = db.collection('users').doc(t.toUid)
      const tDoc = await tx.get(tRef)
      if (!tDoc.exists) throw new Error('Transfer disappeared')
      if (tDoc.data().status !== 'otp_pending') throw new Error('Transfer state changed')

      const fromSnap = await tx.get(fromRef)
      const toSnap = await tx.get(toRef)
      const fromBal = Number(fromSnap.data()?.realBalance || 0)
      const toBal = Number(toSnap.data()?.realBalance || 0)
      const amt = Number(t.amountUsd || 0)
      if (fromBal < amt) throw new Error('Insufficient balance')

      tx.update(fromRef, { realBalance: fromBal - amt })
      tx.update(toRef, { realBalance: toBal + amt })
      tx.update(tRef, { status: 'completed', completedAt: admin.firestore.FieldValue.serverTimestamp() })
      tx.delete(otpRef)

      // Optional: add history records
      const hist = db.collection('transfersHistory').doc()
      tx.set(hist, {
        transferId,
        fromUid: t.fromUid,
        toUid: t.toUid,
        amountUsd: amt,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    })

    return { statusCode: 200, body: JSON.stringify({ ok: true }) }
  } catch (e) {
    return { statusCode: 500, body: e.message }
  }
}
