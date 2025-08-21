import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase.js'

// Firestore doc for platform settings
const SETTINGS_DOC = doc(db, 'config', 'settings')

// Default settings if Firestore empty
export const defaultSettings = {
  payoutPct: 82, // house edge (user wins get 82%)
  withdrawFeePct: 2.5, // platform fee on withdrawals
  withdrawMin: 20, // minimum withdraw in USD
  withdrawMaxPerDay: 1000,
  demoBalanceDefault: 10000,
  kycRequired: false,
  referralRewardUsd: 0, // simple placeholder
  // Withdrawal restriction controls
  withdrawCooldownHoursAfterDeposit: 24, // hours after last approved deposit
  withdrawMinTrades: 5, // minimum lifetime trades before first withdrawal
  withdrawMinVolumeUsd: 100, // minimum lifetime traded amount before withdrawal
  withdrawMaxRequestsPerDay: 2, // per-user max requests per day
  withdrawProcessingETA: '24-48 hours',
}

export async function getSettingsOnce() {
  const snap = await getDoc(SETTINGS_DOC)
  return snap.exists() ? { ...defaultSettings, ...snap.data() } : { ...defaultSettings }
}

export function onSettings(callback) {
  return onSnapshot(SETTINGS_DOC, (snap) => {
    const data = snap.exists() ? { ...defaultSettings, ...snap.data() } : { ...defaultSettings }
    callback(data)
  }, () => callback({ ...defaultSettings }))
}

export async function saveSettings(partial) {
  await setDoc(SETTINGS_DOC, { ...defaultSettings, ...partial }, { merge: true })
}
