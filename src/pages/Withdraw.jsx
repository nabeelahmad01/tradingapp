import React, { useEffect, useState } from 'react'
import { Card, Typography, Form, InputNumber, Input, Button, message, Radio, Alert, Select } from 'antd'
import { auth, db } from '../firebase.js'
import { doc, getDoc, addDoc, collection, serverTimestamp, query, where, orderBy, limit as qlimit, getDocs, Timestamp } from 'firebase/firestore'
import { onSettings, defaultSettings } from '../services/settings.js'

export default function Withdraw() {
  const [loading, setLoading] = useState(false)
  const [balances, setBalances] = useState({ realBalance: 0, demoBalance: 10000 })
  const [accountType, setAccountType] = useState('real')
  const [settings, setSettings] = useState(defaultSettings)
  const [amountPreview, setAmountPreview] = useState(0)

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) return
      const snap = await getDoc(doc(db, 'users', u.uid))
      const d = snap.data() || {}
      setBalances({ realBalance: Number(d.realBalance || 0), demoBalance: Number(d.demoBalance || 10000) })
    })
    return () => unsub()
  }, [])

  // subscribe settings
  useEffect(() => {
    const unsub = onSettings((s) => setSettings(s))
    return () => unsub && unsub()
  }, [])

  const onFinish = async (values) => {
    setLoading(true)
    try {
      const user = auth.currentUser
      if (!user) throw new Error('Please login to request withdrawal')
      if (accountType === 'demo') throw new Error('Withdrawals are only allowed from Real balance')
      const amount = Number(values.amount)
      if (amount <= 0) throw new Error('Amount must be greater than 0')
      if (amount > balances.realBalance) throw new Error('Amount exceeds available Real balance')
      if (amount < Number(settings.withdrawMin || 0)) throw new Error(`Minimum withdrawal is $${Number(settings.withdrawMin||0).toFixed(2)}`)
      const flatFee = Number(settings.flatWithdrawFeeUsd || 0)
      if (amount <= flatFee) throw new Error(`Amount must be greater than flat fee $${flatFee.toFixed(2)}`)
      // KYC enforcement
      if (settings.kycRequired) {
        const uSnap = await getDoc(doc(db, 'users', user.uid))
        const uData = uSnap.data() || {}
        if (!uData.kycVerified) throw new Error('KYC is required before withdrawal')
      }
      // Cooldown after last approved deposit
      const depQ = query(
        collection(db, 'deposits'),
        where('uid', '==', user.uid),
        where('status', '==', 'approved'),
        orderBy('createdAt', 'desc'),
        qlimit(1)
      )
      const depDocs = await getDocs(depQ)
      if (!depDocs.empty) {
        const lastDep = depDocs.docs[0].data()
        const lastDepAt = lastDep.approvedAt || lastDep.createdAt // fallback if approvedAt not present
        if (lastDepAt?.toDate) {
          const diffMs = Date.now() - lastDepAt.toDate().getTime()
          const hours = diffMs / (1000 * 60 * 60)
          if (hours < Number(settings.withdrawCooldownHoursAfterDeposit || 0)) {
            throw new Error(`You can withdraw ${Math.ceil(Number(settings.withdrawCooldownHoursAfterDeposit)-hours)} hour(s) after your last approved deposit`)
          }
        }
      }
      // Min trades and volume (real account only)
      const tradesQ = query(collection(db, 'trades'), where('uid', '==', user.uid), where('accountType', '==', 'real'))
      const tSnap = await getDocs(tradesQ)
      const tradeCount = tSnap.size
      let volume = 0
      tSnap.forEach((d)=>{ volume += Number(d.data()?.amount || 0) })
      if (tradeCount < Number(settings.withdrawMinTrades || 0)) {
        throw new Error(`Minimum ${settings.withdrawMinTrades} trades required before withdrawal`)
      }
      if (volume < Number(settings.withdrawMinVolumeUsd || 0)) {
        throw new Error(`Minimum trading volume $${Number(settings.withdrawMinVolumeUsd).toFixed(2)} required before withdrawal`)
      }
      // Max requests per day
      const startOfDay = new Date()
      startOfDay.setHours(0,0,0,0)
      const wQ = query(
        collection(db, 'withdrawals'),
        where('uid', '==', user.uid),
        where('createdAt', '>=', Timestamp.fromDate(startOfDay))
      )
      const wSnap = await getDocs(wQ)
      if (wSnap.size >= Number(settings.withdrawMaxRequestsPerDay || 0)) {
        throw new Error(`Daily limit reached: max ${settings.withdrawMaxRequestsPerDay} withdrawal request(s) per day`)
      }
      // Sum today's requested gross amounts to enforce daily cap
      let todaysGross = 0
      wSnap.forEach((d)=>{ todaysGross += Number(d.data()?.amount || 0) })
      const maxPerDay = Number(settings.withdrawMaxPerDay || 0)
      if (maxPerDay > 0 && (todaysGross + amount) > maxPerDay) {
        const remaining = Math.max(0, maxPerDay - todaysGross)
        throw new Error(`Daily withdrawal cap $${maxPerDay.toFixed(2)}. You can request up to $${remaining.toFixed(2)} more today`)
      }
      // compute flat fee and net
      const feeUsd = +Number(settings.flatWithdrawFeeUsd || 0).toFixed(2)
      const netUsd = +(amount - feeUsd).toFixed(2)
      await addDoc(collection(db, 'withdrawals'), {
        uid: user.uid,
        email: user.email || null,
        amount, // gross
        feeUsd,
        netUsd,
        asset: values.asset,
        address: values.address,
        status: 'pending',
        createdAt: serverTimestamp(),
      })
      message.success('Withdrawal request submitted')
    } catch (e) {
      message.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <Card>
        <Typography.Title level={3}>Withdraw</Typography.Title>
        <div style={{ marginBottom: 12 }}>
          <Typography.Text type="secondary">Account</Typography.Text>
          <br />
          <Radio.Group value={accountType} onChange={(e)=>setAccountType(e.target.value)}>
            <Radio.Button value="real">Real (${balances.realBalance.toFixed(2)})</Radio.Button>
            <Radio.Button value="demo" disabled>Demo (${balances.demoBalance.toFixed(2)})</Radio.Button>
          </Radio.Group>
        </div>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item label="Amount" name="amount" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={1} prefix="$" onChange={(v)=>setAmountPreview(Number(v||0))} />
          </Form.Item>
          <Form.Item label="Asset" name="asset" rules={[{ required: true }]}> 
            <Select placeholder="Select asset">
              {(settings.supportedAssets || []).map((a) => (
                <Select.Option key={a} value={a}>{a}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="Address / Details" name="address" rules={[{ required: true }]}>
            <Input placeholder="Recipient address or bank details" />
          </Form.Item>
          <Alert
            style={{ marginBottom: 12 }}
            type="info"
            showIcon
            message={`Flat fee $${Number(settings.flatWithdrawFeeUsd||0).toFixed(2)} • Min $${Number(settings.withdrawMin||0).toFixed(2)}`}
            description={`If you request $${amountPreview||0}, fee $${Number(settings.flatWithdrawFeeUsd||0).toFixed(2)} and net $${Math.max(0, (amountPreview||0) - Number(settings.flatWithdrawFeeUsd||0)).toFixed(2)}`}
          />
          <Button type="primary" htmlType="submit" loading={loading} block>
            Submit Withdrawal
          </Button>
        </Form>
      </Card>
    </div>
  )
}
