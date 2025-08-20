import React, { useState } from 'react'
import { Card, Form, Input, Button, Typography, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { auth } from '../../firebase.js'
import { signInWithEmailAndPassword } from 'firebase/auth'

// Default admin hint (you must create this user in Firebase Auth and set users/{uid}.role = 'admin')
const ADMIN_USER = 'admin@site.com'
const ADMIN_PASS = 'Admin@12345'

export default function AdminLogin() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onFinish = async ({ email, password }) => {
    setLoading(true)
    try {
      // Firebase sign-in: ensure this account exists in Firebase Auth
      // and that Firestore document users/{uid}.role == 'admin'
      await signInWithEmailAndPassword(auth, email, password)
      message.success('Admin login successful')
      navigate('/admin', { replace: true })
    } catch (e) {
      message.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <Card>
        <Typography.Title level={3} style={{ marginBottom: 8 }}>Admin Login</Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
          Enter admin credentials to access the dashboard.
        </Typography.Paragraph>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder={ADMIN_USER} autoComplete="username" />
          </Form.Item>
          <Form.Item label="Password" name="password" rules={[{ required: true }]}>
            <Input.Password placeholder="Admin password" autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            Login
          </Button>
        </Form>
      </Card>
    </div>
  )
}
