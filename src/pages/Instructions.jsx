import React from 'react'
import { Card, Typography, List } from 'antd'

export default function Instructions() {
  const steps = [
    'Signup or Login with your email (Phone OTP can be added later).',
    'Go to Deposit, enter Amount, Binance TxID, and upload Screenshot.',
    'Wait for admin approval. On approval, your balance updates.',
    'For Withdraw, submit Amount and your receiving address/method.',
    'Check History for status of all requests.',
    'Read News for latest updates.',
  ]

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <Card>
        <Typography.Title level={3}>Instructions</Typography.Title>
        <List
          dataSource={steps}
          renderItem={(s, i) => <List.Item key={i}>{s}</List.Item>}
        />
      </Card>
    </div>
  )
}
