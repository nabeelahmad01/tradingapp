import React from 'react'
import { Card, Row, Col, Statistic } from 'antd'

export default function AdminDashboard() {
  // TODO: Replace with Firestore aggregates
  return (
    <div className="container">
      <Row gutter={[16,16]}>
        <Col xs={24} md={8}><Card><Statistic title="Pending Deposits" value={3} /></Card></Col>
        <Col xs={24} md={8}><Card><Statistic title="Pending Withdrawals" value={1} /></Card></Col>
        <Col xs={24} md={8}><Card><Statistic title="Users" value={25} /></Card></Col>
      </Row>
    </div>
  )
}
