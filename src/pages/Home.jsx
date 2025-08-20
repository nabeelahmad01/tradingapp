import React from 'react'
import { Card, Typography, Row, Col, Button, Space, Steps, Collapse } from 'antd'
import { Link } from 'react-router-dom'
import TradeChart from '../components/TradeChart.jsx'
import SupportWidget from '../components/SupportWidget.jsx'

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

      {/* About Section */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card>
            <Typography.Title level={3} className="heading">About Our Platform</Typography.Title>
            <Typography.Paragraph>
              We built a lightweight trading experience focused on speed, clarity, and reliability. Deposit and withdraw with confidence, view live charts, and stay informed with curated news.
            </Typography.Paragraph>
          </Card>
        </Col>
      </Row>

      {/* How It Works */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card>
            <Typography.Title level={3} className="heading">How It Works</Typography.Title>
            <Steps
              direction="vertical"
              items={[
                { title: 'Create Account', description: 'Sign up with your email and password.' },
                { title: 'Deposit', description: 'Submit Binance TxID and screenshot for verification.' },
                { title: 'Trade', description: 'Use the chart and actions to place trades.' },
                { title: 'Withdraw', description: 'Request payout and track status in History.' },
              ]}
            />
          </Card>
        </Col>
      </Row>

      {/* Testimonials */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={8}>
          <Card>
            <Typography.Text strong>Ali R.</Typography.Text>
            <Typography.Paragraph type="secondary">Fast deposits and clear UI. Love the minimal design.</Typography.Paragraph>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Typography.Text strong>Sara K.</Typography.Text>
            <Typography.Paragraph type="secondary">Withdrawals are quick and support is helpful.</Typography.Paragraph>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Typography.Text strong>Hamza T.</Typography.Text>
            <Typography.Paragraph type="secondary">The chart is smooth and responsive on mobile.</Typography.Paragraph>
          </Card>
        </Col>
      </Row>

      {/* FAQ */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card>
            <Typography.Title level={3} className="heading">FAQ</Typography.Title>
            <Collapse
              items={[
                { key: '1', label: 'Is my money safe?', children: <p>We verify deposits and handle requests with strict checks.</p> },
                { key: '2', label: 'How long do withdrawals take?', children: <p>Typically under 24 hours after approval.</p> },
                { key: '3', label: 'Can I trade on mobile?', children: <p>Yes, the interface is optimized for mobile devices.</p> },
              ]}
            />
          </Card>
        </Col>
      </Row>

      {/* CTA */}
      <Row gutter={[16, 16]} style={{ margin: '16px 0 80px' }}>
        <Col span={24}>
          <Card>
            <Space direction="vertical" size={12}>
              <Typography.Title level={3} className="heading" style={{ marginBottom: 0 }}>Ready to start?</Typography.Title>
              <Space wrap>
                <Link to="/signup"><Button type="primary" size="large">Create your account</Button></Link>
                <Link to="/trade"><Button size="large">Go to Trade</Button></Link>
              </Space>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Floating Customer Support */}
      <SupportWidget />
    </div>
  )
}
