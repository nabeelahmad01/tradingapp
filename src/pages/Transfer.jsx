import React, { useState } from 'react'
import { Card, Typography, Form, Input, InputNumber, Button, Space, message, Alert } from 'antd'
import { auth } from '../firebase.js'

export default function Transfer() {
  const [form] = Form.useForm()
  const [confirmForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [transferId, setTransferId] = useState(null)
  const [otpSent, setOtpSent] = useState(false)

  const sendOtp = async () => {
    try {
      const user = auth.currentUser
      if (!user?.email) throw new Error('Login with an email account to send OTP')
      const res = await fetch('/.netlify/functions/sendEmailOtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      })
      if (!res.ok) throw new Error(await res.text())
      setOtpSent(true)
      message.success('OTP sent to your email')
    } catch (e) {
      message.error(e.message)
    }
  }

  const initiate = async (values) => {
    setLoading(true)
    try {
      const user = auth.currentUser
      if (!user) throw new Error('Please login')
      const idToken = await user.getIdToken()
      const amountUsd = Number(values.amount)
      if (!amountUsd || amountUsd <= 0) throw new Error('Enter valid amount')

      const res = await fetch('/.netlify/functions/internal-transfer-initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ toEmail: values.toEmail, amountUsd }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || data || 'Failed to initiate transfer')
      setTransferId(data.transferId)
      message.success('Transfer created. Now enter OTP to confirm.')
    } catch (e) {
      message.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const confirm = async (values) => {
    setLoading(true)
    try {
      const user = auth.currentUser
      if (!user) throw new Error('Please login')
      const idToken = await user.getIdToken()
      const res = await fetch('/.netlify/functions/internal-transfer-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ transferId, code: values.code }),
      })
      const data = await res.json().catch(()=>({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to confirm transfer')
      message.success('Transfer completed')
      setTransferId(null)
      confirmForm.resetFields()
      form.resetFields()
    } catch (e) {
      message.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <Card>
        <Typography.Title level={3}>Internal Transfer</Typography.Title>
        <Alert type="info" showIcon style={{ marginBottom: 12 }} message="Send crypto USD balance internally between users. OTP required." />
        <Form form={form} layout="vertical" onFinish={initiate}>
          <Form.Item label="Recipient Email" name="toEmail" rules={[{ required: true, type: 'email' }]}> 
            <Input placeholder="user@example.com" />
          </Form.Item>
          <Form.Item label="Amount (USD)" name="amount" rules={[{ required: true }]}> 
            <InputNumber min={1} prefix="$" style={{ width: '100%' }} />
          </Form.Item>
          <Space>
            <Button onClick={sendOtp}>Send OTP</Button>
            <Button type="primary" htmlType="submit" loading={loading}>Create Transfer</Button>
          </Space>
        </Form>
        {transferId && (
          <div style={{ marginTop: 16 }}>
            <Alert type="success" showIcon message={`Transfer created: ${transferId}`} style={{ marginBottom: 12 }} />
            <Form form={confirmForm} layout="inline" onFinish={confirm}>
              <Form.Item label="OTP Code" name="code" rules={[{ required: true }]}> 
                <Input placeholder="6-digit code" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} disabled={!otpSent}>Confirm Transfer</Button>
              </Form.Item>
            </Form>
          </div>
        )}
      </Card>
    </div>
  )
}
