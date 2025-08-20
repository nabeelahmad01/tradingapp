import React, { useState } from 'react'
import { Card, Typography, Form, InputNumber, Input, Button, message } from 'antd'

export default function Withdraw() {
  const [loading, setLoading] = useState(false)

  const onFinish = async (values) => {
    setLoading(true)
    try {
      // TODO: Save withdrawal request to Firestore
      console.log('Withdraw request', values)
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
