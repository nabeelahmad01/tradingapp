import React from 'react'
import { Card, Tabs, Table } from 'antd'

const columns = [
  { title: 'Date', dataIndex: 'date', key: 'date' },
  { title: 'Type', dataIndex: 'type', key: 'type' },
  { title: 'Amount', dataIndex: 'amount', key: 'amount' },
  { title: 'Status', dataIndex: 'status', key: 'status' },
]

export default function History() {
  // TODO: Replace with Firestore queries for current user
  const data = []
  return (
    <div className="container">
      <Card>
        <Tabs
          items={[
            { key: 'deposits', label: 'Deposits', children: <Table columns={columns} dataSource={data} rowKey={(r)=>r.id} /> },
            { key: 'withdrawals', label: 'Withdrawals', children: <Table columns={columns} dataSource={data} rowKey={(r)=>r.id} /> },
          ]}
        />
      </Card>
    </div>
  )
}
