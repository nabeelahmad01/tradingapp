import React from 'react'
import { Card, Table, Button, Space, Tag } from 'antd'

export default function AdminWithdrawals() {
  // TODO: Replace with Firestore listener for status === 'pending'
  const data = [
    { id: 'w1', user: 'user2@example.com', amount: 50, method: 'USDT TRC20', status: 'pending' },
  ]

  const approve = (id) => {
    // TODO: update Firestore doc to approved and notify user
    console.log('approve withdraw', id)
  }
  const reject = (id) => {
    // TODO: update Firestore doc to rejected and notify user
    console.log('reject withdraw', id)
  }

  const columns = [
    { title: 'User', dataIndex: 'user' },
    { title: 'Amount', dataIndex: 'amount' },
    { title: 'Method', dataIndex: 'method' },
    { title: 'Status', dataIndex: 'status', render: (s) => <Tag color={s==='pending'?'orange':s==='approved'?'green':'red'}>{s}</Tag> },
    { title: 'Actions', key: 'actions', render: (_, r) => (
      <Space>
        <Button type="primary" onClick={() => approve(r.id)}>Approve</Button>
        <Button danger onClick={() => reject(r.id)}>Reject</Button>
      </Space>
    ) },
  ]

  return (
    <div className="container">
      <Card title="Pending Withdrawals">
        <Table columns={columns} dataSource={data} rowKey={(r)=>r.id} />
      </Card>
    </div>
  )
}
