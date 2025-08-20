import React, { useState } from 'react'
import { Card, Typography, Row, Col, Button, Space, Steps, Collapse, Select, Input, Segmented } from 'antd'
import { Link } from 'react-router-dom'
import TradeChart from '../components/TradeChart.jsx'
import SupportWidget from '../components/SupportWidget.jsx'

export default function Home() {
  const [symbol, setSymbol] = useState('BTCUSDT')
  const [interval, setInterval] = useState('1m')
  const [custom, setCustom] = useState('')
  return (
    <div className="container" style={{ paddingBlock: 16 }}>
      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} lg={12}>
          <Space direction="vertical" size={12}>
            <Typography.Title className="heading" style={{ marginBottom: 0 }}>
              Trade Smart. Fast. Secure.
            </Typography.Title>
            <Typography.Paragraph className="para" type="secondary" style={{ marginTop: 0 }}>
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
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Space wrap>
                <Select
                  value={symbol}
                  style={{ width: 160 }}
                  onChange={setSymbol}
                  options={[
                    'BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','DOGEUSDT','ADAUSDT','TONUSDT','TRXUSDT','SHIBUSDT',
                  ].map(s => ({ label: s, value: s }))}
                />
                <Input
                  placeholder="Any symbol e.g. SHIBUSDT"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  style={{ width: 200 }}
                  allowClear
                />
                <Button onClick={() => custom && setSymbol(custom.toUpperCase().replace('/',''))}>Apply</Button>
                <Segmented
                  value={interval}
                  onChange={(v) => setInterval(v)}
                  options={[ '1m','5m','15m','1h','4h','1d' ]}
                />
              </Space>
              <TradeChart height={260} theme="dark" symbol={symbol} interval={interval} />
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={8}>
          <Card title="Secure Wallets">
            <span className="para">Your funds are safe. Deposit using Binance TxID and verify with screenshots.</span>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Fast Withdrawals">
            <span className="para">Request withdrawals easily and track request history inside the app.</span>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Daily News">
            <span className="para">Stay updated with market news and announcements.</span>
          </Card>
        </Col>
      </Row>

      {/* About Section */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card>
            <Typography.Title level={3} className="heading">About Our Platform</Typography.Title>
            <Typography.Paragraph className="para">
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
            <Typography.Text className="heading" strong>Ali R.</Typography.Text>
            <Typography.Paragraph className="para" type="secondary">Fast deposits and clear UI. Love the minimal design.</Typography.Paragraph>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Typography.Text className="heading" strong>Sara K.</Typography.Text>
            <Typography.Paragraph className="para" type="secondary">Withdrawals are quick and support is helpful.</Typography.Paragraph>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Typography.Text className="heading" strong>Hamza T.</Typography.Text>
            <Typography.Paragraph className="para" type="secondary">The chart is smooth and responsive on mobile.</Typography.Paragraph>
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
                { key: '1', label: 'Is my money safe?', children: <p className="para">We verify deposits and handle requests with strict checks.</p> },
                { key: '2', label: 'How long do withdrawals take?', children: <p className="para">Typically under 24 hours after approval.</p> },
                { key: '3', label: 'Can I trade on mobile?', children: <p className="para">Yes, the interface is optimized for mobile devices.</p> },
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
