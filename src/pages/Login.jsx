import React, { useState } from 'react'
import { Card, Typography, Form, Input, Button, message } from 'antd'
import { useDispatch } from 'react-redux'
import { setUser } from '../features/authSlice.js'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { signInWithEmail } from '../services/auth.js'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  const onLogin = async ({ email, password }) => {
    setLoading(true)
    try {
      const { user, profile } = await signInWithEmail({ email, password })
      dispatch(setUser({ uid: user.uid, email: user.email, phoneNumber: user.phoneNumber, role: profile?.role || 'user' }))
      message.success('Logged in')
      const to = location.state?.from?.pathname || '/'
      navigate(to, { replace: true })
    } catch (e) {
      message.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <Card>
        <Typography.Title level={3}>Login</Typography.Title>
        <Form layout="vertical" onFinish={onLogin}>
          <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email' }]}> 
            <Input placeholder="you@example.com" />
          </Form.Item>
          <Form.Item label="Password" name="password" rules={[{ required: true }]}> 
            <Input.Password placeholder="••••••••" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>Login</Button>
        </Form>
        <div style={{ marginTop: 12 }}>
          No account? <Link to="/signup">Signup</Link>
        </div>
      </Card>
    </div>
  )
}
