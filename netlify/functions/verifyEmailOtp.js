const crypto = require('crypto')
const admin = require('firebase-admin')

function initAdmin() {
  if (admin.apps.length) return
  const svcB64 = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!svcB64) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT')
  const svcJson = Buffer.from(svcB64, 'base64').toString('utf8')
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(svcJson)),
  })
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }
    const { email, code } = JSON.parse(event.body || '{}')
    if (!email || !code) return { statusCode: 400, body: 'email and code required' }

    initAdmin()
    const db = admin.firestore()
    const ref = db.collection('emailOtps').doc(email.toLowerCase())
    const snap = await ref.get()
    if (!snap.exists) return { statusCode: 400, body: 'code invalid' }
    const data = snap.data()

    if (Date.now() > data.expiresAt) {
      await ref.delete()
      return { statusCode: 400, body: 'code expired' }
    }

    const hash = crypto.createHash('sha256').update(code).digest('hex')
    if (hash !== data.hash) {
      const attempts = (data.attempts || 0) + 1
      await ref.update({ attempts })
      return { statusCode: 400, body: 'code invalid' }
    }

    await ref.delete()
    return { statusCode: 200, body: JSON.stringify({ ok: true }) }
  } catch (e) {
    return { statusCode: 500, body: e.message }
  }
}
