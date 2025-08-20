import React, { useState } from 'react'
import { Card, Typography, Form, Input, Button, message } from 'antd'
import { useDispatch } from 'react-redux'
import { setUser } from '../features/authSlice.js'
import { Link, useNavigate } from 'react-router-dom'
import { signUpWithEmail } from '../services/auth.js'

export default function Signup() {
  const [loading, setLoading] = useState(false)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const onFinish = async ({ name, email, password }) => {
    setLoading(true)
    try {
      const { user, profile } = await signUpWithEmail({ email, password, displayName: name })
      dispatch(setUser({ uid: user.uid, email: user.email, phoneNumber: user.phoneNumber, role: profile?.role || 'user' }))
      message.success('Account created')
      navigate('/')
    } catch (e) {
      message.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <Card>
        <Typography.Title level={3}>Signup</Typography.Title>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item label="Full Name" name="name" rules={[{ required: true }]}> 
            <Input placeholder="Your name" />
          </Form.Item>
          <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email' }]}> 
            <Input placeholder="you@example.com" />
          </Form.Item>
          <Form.Item label="Password" name="password" rules={[{ required: true, min: 6 }]}> 
            <Input.Password placeholder="Minimum 6 characters" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>Create account</Button>
        </Form>
        <div style={{ marginTop: 12 }}>
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </Card>
    </div>
  )
}
