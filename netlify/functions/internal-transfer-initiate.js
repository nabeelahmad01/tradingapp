// Netlify Function: Initiate internal transfer (creates pending transfer)
// Auth: expects Authorization: Bearer <Firebase ID token>
// Body: { toEmail, amountUsd }
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
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }
    initAdmin()
    const db = admin.firestore()

    const authHeader = event.headers['authorization'] || event.headers['Authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ')) return { statusCode: 401, body: 'Unauthorized' }
    const idToken = authHeader.substring('Bearer '.length)
    const decoded = await admin.auth().verifyIdToken(idToken)
    const fromUid = decoded.uid

    const { toEmail, amountUsd } = JSON.parse(event.body || '{}')
    if (!toEmail || !amountUsd) return { statusCode: 400, body: 'toEmail and amountUsd required' }
    const amount = Number(amountUsd)
    if (!amount || amount <= 0) return { statusCode: 400, body: 'Invalid amount' }

    // Load sender
    const fromRef = db.collection('users').doc(fromUid)
    const fromSnap = await fromRef.get()
    if (!fromSnap.exists) return { statusCode: 400, body: 'Sender not found' }
    const from = fromSnap.data()

    // Load recipient by email
    const usersQ = await db.collection('users').where('email', '==', toEmail).limit(1).get()
    if (usersQ.empty) return { statusCode: 400, body: 'Recipient not found' }
    const toDoc = usersQ.docs[0]
    const toUid = toDoc.id

    // Create a pending transfer entry
    const transferRef = await db.collection('internalTransfers').add({
      fromUid,
      fromEmail: from.email || decoded.email || null,
      toUid,
      toEmail,
      amountUsd: amount,
      status: 'otp_pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return { statusCode: 200, body: JSON.stringify({ ok: true, transferId: transferRef.id }) }
  } catch (e) {
    return { statusCode: 500, body: e.message }
  }
}
