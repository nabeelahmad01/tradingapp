import React, { useEffect, useState } from 'react'
import { Card, Typography, Form, InputNumber, Input, Button, message, Radio } from 'antd'
import { auth, db } from '../firebase.js'
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore'

export default function Withdraw() {
  const [loading, setLoading] = useState(false)
  const [balances, setBalances] = useState({ realBalance: 0, demoBalance: 10000 })
  const [accountType, setAccountType] = useState('real')

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) return
      const snap = await getDoc(doc(db, 'users', u.uid))
      const d = snap.data() || {}
      setBalances({ realBalance: Number(d.realBalance || 0), demoBalance: Number(d.demoBalance || 10000) })
    })
    return () => unsub()
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
      await addDoc(collection(db, 'withdrawals'), {
        uid: user.uid,
        email: user.email || null,
        amount,
        method: values.method,
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
            <InputNumber style={{ width: '100%' }} min={1} prefix="$" />
          </Form.Item>
          <Form.Item label="Receiving Method / Address" name="method" rules={[{ required: true }]}>
            <Input placeholder="USDT (TRC20) address or bank details" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            Submit Withdrawal
          </Button>
        </Form>
      </Card>
    </div>
  )
}
