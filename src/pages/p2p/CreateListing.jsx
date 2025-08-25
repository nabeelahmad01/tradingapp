import React, { useState } from 'react'
import { Card, Typography, Form, InputNumber, Select, Button, message } from 'antd'
import { auth, db } from '../../firebase.js'
import { onAuthStateChanged } from 'firebase/auth'
import { addDoc, collection, serverTimestamp, onSnapshot, query, where } from 'firebase/firestore'
import { onSettings, defaultSettings } from '../../services/settings.js'

export default function CreateListing() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = React.useState(defaultSettings)
  const [pmOptions, setPmOptions] = useState([])

  React.useEffect(() => onSettings((s)=>setSettings(s)), [])

  // Load user's saved payment methods to suggest as tags (handle delayed auth readiness)
  React.useEffect(() => {
    let unsub = () => {}
    const stop = onAuthStateChanged(auth, (u) => {
      if (!u) { setPmOptions([]); return }
      const qy = query(collection(db, 'paymentMethods'), where('uid', '==', u.uid))
      unsub()
      unsub = onSnapshot(qy, (snap) => {
        const opts = snap.docs.map((d) => {
          const m = d.data()
          let text = m.label || ''
          if (!text) {
            if (m.type === 'bank') {
              const last4 = (m.accountNumber || '').slice(-4)
              text = [m.bankName, last4 ? `...${last4}` : null].filter(Boolean).join(' ')
            } else if (m.type === 'upi') {
              text = m.upiId || 'UPI'
            } else {
              text = 'Other'
            }
          }
          return { value: text, label: text }
        })
        setPmOptions(opts)
      })
    })
    return () => { stop(); unsub() }
  }, [])

  const onFinish = async (values) => {
    setLoading(true)
    try {
      const user = auth.currentUser
      if (!user) throw new Error('Please login')
      const price = Number(values.price)
      const min = Number(values.min)
      const max = Number(values.max)
      if (min <= 0 || max <= 0 || price <= 0 || min > max) throw new Error('Invalid limits/price')
      await addDoc(collection(db, 'p2p_listings'), {
        uid: user.uid,
        email: user.email || null,
        side: values.side, // 'buy' or 'sell'
        asset: values.asset,
        price, // in local fiat per 1 unit asset, display-only
        min,
        max,
        paymentMethods: values.paymentMethods || [],
        active: true,
        createdAt: serverTimestamp(),
      })
      message.success('Listing created')
      form.resetFields()
    } catch (e) {
      message.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <Card>
        <Typography.Title level={3}>Create P2P Listing</Typography.Title>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item label="Side" name="side" rules={[{ required: true }]}> 
            <Select options={[{label:'Sell', value:'sell'},{label:'Buy', value:'buy'}]} />
          </Form.Item>
          <Form.Item label="Asset" name="asset" rules={[{ required: true }]}> 
            <Select placeholder="Select asset">
              {(settings.supportedAssets||[]).map(a => <Select.Option key={a} value={a}>{a}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item label="Price (your fiat per 1 asset)" name="price" rules={[{ required: true }]}> 
            <InputNumber min={0.0001} step={0.0001} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Min Amount (USD)" name="min" rules={[{ required: true }]}>
            <InputNumber min={1} step={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Max Amount (USD)" name="max" rules={[{ required: true }]}>
            <InputNumber min={1} step={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Payment Methods (text tags)" name="paymentMethods"> 
            <Select
              mode="tags"
              tokenSeparators={[',']}
              placeholder="e.g., HBL Bank, UPI"
              options={pmOptions}
              showSearch
              allowClear
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>Create</Button>
        </Form>
      </Card>
    </div>
  )
}
