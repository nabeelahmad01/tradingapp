import { auth, db } from '../firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  updateProfile,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'

export async function getUserProfile(uid) {
  const ref = doc(db, 'users', uid)
  const snap = await getDoc(ref)
  return snap.exists() ? snap.data() : null
}

export async function saveUserProfile(user, extra = {}) {
  const ref = doc(db, 'users', user.uid)
  const data = {
    uid: user.uid,
    email: user.email || null,
    phoneNumber: user.phoneNumber || null,
    displayName: user.displayName || null,
    photoURL: user.photoURL || null,
    role: 'user',
    createdAt: serverTimestamp(),
    ...extra,
  }
  await setDoc(ref, data, { merge: true })
  return data
}

export async function signUpWithEmail({ email, password, displayName }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  if (displayName) {
    await updateProfile(cred.user, { displayName })
  }
  const profile = await saveUserProfile(cred.user)
  return { user: cred.user, profile }
}

export async function signInWithEmail({ email, password }) {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  const profile = (await getUserProfile(cred.user.uid)) || (await saveUserProfile(cred.user))
  return { user: cred.user, profile }
}

// Phone auth
export function getRecaptcha(containerId = 'recaptcha-container') {
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
    })
  }
  return window.recaptchaVerifier
}

export async function startPhoneSignIn(phoneE164, containerId) {
  const verifier = getRecaptcha(containerId)
  const confirmation = await signInWithPhoneNumber(auth, phoneE164, verifier)
  return confirmation // use confirmation.confirm(code) later
}

export async function confirmPhoneOtp(confirmation, code) {
  const cred = await confirmation.confirm(code)
  const profile = (await getUserProfile(cred.user.uid)) || (await saveUserProfile(cred.user))
  return { user: cred.user, profile }
}

// Email OTP helpers via Netlify Functions
export async function sendEmailOtp(email) {
  const res = await fetch('/api/sendEmailOtp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) throw new Error(await res.text())
  return true
}

export async function verifyEmailOtp(email, code) {
  const res = await fetch('/api/verifyEmailOtp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  })
  if (!res.ok) throw new Error(await res.text())
  return true
}

export async function createAccountAfterEmailOtp({ name, email, password }) {
  // This is used by Signup Email flow: verify OTP first, then create account
  const { user } = await createUserWithEmailAndPassword(auth, email, password)
  if (name) await updateProfile(user, { displayName: name })
  const profile = await saveUserProfile(user)
  return { user, profile }
}

export async function loginAfterEmailOtp({ email, password }) {
  // Used by Login Email flow after OTP verification
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  const profile = (await getUserProfile(user.uid)) || (await saveUserProfile(user))
  return { user, profile }
}
