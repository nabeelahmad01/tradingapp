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
  // Market data source
  defaultExchange: 'binance', // 'binance' | 'mexc'
  // Payments provider settings (Phase 1)
  paymentsProvider: 'nowpayments', // 'nowpayments' | 'coinbase_commerce' | 'manual_cashapp'
  supportedAssets: ['USDT-TRC20', 'BTC', 'ETH', 'BNB-BEP20', 'TRX', 'USDT-ERC20'],
  flatWithdrawFeeUsd: 3, // flat USD fee applied to withdrawals
  // Manual Cash App settings (optional)
  cashAppEnabled: false,
  cashAppCashtag: '', // e.g., $YourTag
  cashAppNote: 'Include your registered email in the Cash App note. Upload a screenshot after sending.',
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
