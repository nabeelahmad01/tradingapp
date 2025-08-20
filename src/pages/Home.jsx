import React from 'react'
import { Card, Typography, Row, Col, Button, Space } from 'antd'
import { Link } from 'react-router-dom'
import TradeChart from '../components/TradeChart.jsx'

export default function Home() {
  return (
    <div className="container" style={{ paddingBlock: 16 }}>
      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} lg={12}>
          <Space direction="vertical" size={12}>
            <Typography.Title style={{ marginBottom: 0 }}>
              Trade Smart. Fast. Secure.
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
              Modern trading interface with real-time candles, quick deposits, and instant withdrawals.
            </Typography.Paragraph>
            <Space wrap>
              <Link to="/trade"><Button type="primary" size="large">Start Trading</Button></Link>
              <Link to="/signup"><Button size="large">Create Account</Button></Link>
            </Space>
          </Space>
        </Col>
        <Col xs={24} lg={12}>
          <Card styles={{ body: { padding: 8 } }}>
            <TradeChart height={260} theme="dark" />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={8}>
          <Card title="Secure Wallets">
            Your funds are safe. Deposit using Binance TxID and verify with screenshots.
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Fast Withdrawals">
            Request withdrawals easily and track request history inside the app.
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Daily News">
            Stay updated with market news and announcements.
          </Card>
        </Col>
      </Row>
    </div>
  )
}
