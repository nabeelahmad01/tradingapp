const crypto = require('crypto')
const { Resend } = require('resend')
const admin = require('firebase-admin')

// Expect env: RESEND_API_KEY, FIREBASE_SERVICE_ACCOUNT (base64 JSON)

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
    const { email } = JSON.parse(event.body || '{}')
    if (!email) return { statusCode: 400, body: 'email required' }

    initAdmin()
    const db = admin.firestore()

    // generate 6-digit code and hash
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const hash = crypto.createHash('sha256').update(code).digest('hex')
    const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutes

    await db.collection('emailOtps').doc(email.toLowerCase()).set({
      hash,
      expiresAt,
      attempts: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'Auth <no-reply@yourdomain.com>',
      to: email,
      subject: 'Your login verification code',
      text: `Your verification code is ${code}. It expires in 10 minutes.`,
    })

    return { statusCode: 200, body: JSON.stringify({ ok: true }) }
  } catch (e) {
    return { statusCode: 500, body: e.message }
  }
}
