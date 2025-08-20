import React, { useEffect, useMemo, useState } from 'react'
import { Row, Col, Card, Button, Segmented, Typography, Space, InputNumber, Drawer, Tabs, List, Tag, Divider, Select, Input } from 'antd'
import TradeChart from '../components/TradeChart.jsx'

const { Title, Text } = Typography

export default function Trading() {
  const [theme] = useState('dark')
  const [amount, setAmount] = useState(10)
  const [timeframe, setTimeframe] = useState('1m')
  const [symbol, setSymbol] = useState('BTCUSDT')
  const [custom, setCustom] = useState('')
  const [latestPrice, setLatestPrice] = useState(null)
  const [duration, setDuration] = useState('1m') // 30s, 1m, 5m
  const [payoutPct] = useState(85)
  const [positions, setPositions] = useState([])
  const [history, setHistory] = useState([])
  const [drawerOpen, setDrawerOpen] = useState(false)

  const tfToBinance = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '1H': '1h',
    '4H': '4h',
    '1D': '1d',
  }

  const durToMs = {
    '30s': 30 * 1000,
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
  }

  const payoutText = useMemo(() => `${payoutPct}% payout`, [payoutPct])

  const createPosition = (side) => {
    if (!latestPrice) return
    const now = Date.now()
    const pos = {
      id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
      side, // 'Buy' | 'Sell'
      amount,
      entryPrice: latestPrice,
      payoutPct,
      duration,
      openTime: now,
      expiryTime: now + (durToMs[duration] || 60000),
      status: 'open',
    }
    setPositions((prev) => [pos, ...prev])
  }

  const onBuy = () => createPosition('Buy')
  const onSell = () => createPosition('Sell')

  // Close expired positions and move to history using latest price
  useEffect(() => {
    const t = setInterval(() => {
      setPositions((prev) => {
        const now = Date.now()
        const stillOpen = []
        const toHistory = []
        for (const p of prev) {
          if (now >= p.expiryTime && latestPrice) {
            const won = p.side === 'Buy' ? latestPrice > p.entryPrice : latestPrice < p.entryPrice
            const pnl = won ? (p.amount * (p.payoutPct / 100)) : -p.amount
            toHistory.push({ ...p, status: won ? 'won' : 'lost', exitPrice: latestPrice, closeTime: now, pnl })
          } else {
            stillOpen.push(p)
          }
        }
        if (toHistory.length) setHistory((h) => [...toHistory, ...h])
        return stillOpen
      })
    }, 1000)
    return () => clearInterval(t)
  }, [latestPrice])

  return (
    <div className="container" style={{ paddingBlock: 8 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            styles={{ body: { padding: 12 } }}
            style={{ height: '100%' }}
            title={<Space direction="vertical" size={0}>
              <Title level={5} style={{ margin: 0 }}>{symbol.replace('USDT', '/USDT')} {latestPrice ? <Text type="secondary">• ${latestPrice.toFixed(2)}</Text> : null}</Title>
              <Space size={8} wrap>
                <div>
                  <Text type="secondary">Pair</Text>
                  <Space wrap>
                    <Select
                      size="small"
                      value={symbol}
                      style={{ width: 140 }}
                      onChange={setSymbol}
                      options={[
                        'BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','DOGEUSDT','ADAUSDT','TONUSDT','TRXUSDT','SHIBUSDT',
                      ].map(s => ({ label: s, value: s }))}
                    />
                    <Input
                      size="small"
                      placeholder="Custom e.g. AVAXUSDT"
                      value={custom}
                      onChange={(e) => setCustom(e.target.value)}
                      style={{ width: 160 }}
                      allowClear
                    />
                    <Button size="small" onClick={() => custom && setSymbol(custom.toUpperCase().replace('/',''))}>Apply</Button>
                  </Space>
                </div>
                <div>
                  <Text type="secondary">Timeframe</Text>
                  <Segmented
                    size="small"
                    value={timeframe}
                    onChange={setTimeframe}
                    options={[
                      { label: '1m', value: '1m' },
                      { label: '5m', value: '5m' },
                      { label: '15m', value: '15m' },
                      { label: '1H', value: '1H' },
                      { label: '4H', value: '4H' },
                      { label: '1D', value: '1D' },
                    ]}
                  />
                </div>
                <div>
                  <Text type="secondary">Duration</Text>
                  <Segmented
                    size="small"
                    value={duration}
                    onChange={setDuration}
                    options={[
                      { label: '30s', value: '30s' },
                      { label: '1m', value: '1m' },
                      { label: '5m', value: '5m' },
                    ]}
                  />
                </div>
                <Tag color="green" style={{ alignSelf: 'end' }}>{payoutText}</Tag>
              </Space>
            </Space>}
          >
            <TradeChart height={460} theme={theme} symbol={symbol} interval={tfToBinance[timeframe]} onPriceUpdate={setLatestPrice} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <Card title="Balance">
              <Space direction="vertical">
                <Title level={4} style={{ margin: 0 }}>$1,250.00</Title>
                <Text type="secondary">Demo</Text>
              </Space>
            </Card>

            <Card title="Trade">
              <Space direction="vertical" style={{ width: '100%' }}>
                {latestPrice && (
                  <Text>Market: <b>${latestPrice.toFixed(2)}</b></Text>
                )}
                <Text type="secondary">Duration</Text>
                <Segmented
                  value={duration}
                  onChange={setDuration}
                  options={[{label:'30s',value:'30s'},{label:'1m',value:'1m'},{label:'5m',value:'5m'}]}
                />
                <Text type="secondary">Payout</Text>
                <Tag color="green">{payoutText}</Tag>
                <Text type="secondary">Amount</Text>
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  step={1}
                  value={amount}
                  onChange={setAmount}
                  addonBefore="$"
                />
                <div className="trade-actions" style={{ display: 'flex', gap: 8 }}>
                  <Button onClick={onSell} block size="large" style={{ background: '#ea3943', color: '#fff' }}>Sell</Button>
                  <Button onClick={onBuy} block type="primary" size="large" style={{ background: '#16c784' }}>Buy</Button>
                </div>
              </Space>
            </Card>

            <Card>
              <Tabs
                items={[
                  {
                    key: 'open',
                    label: 'Open Positions',
                    children: (
                      <List
                        locale={{ emptyText: 'No open positions' }}
                        dataSource={positions}
                        renderItem={(p) => (
                          <List.Item>
                            <Space direction="vertical" style={{ width: '100%' }}>
                              <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                                <Text strong>{p.side}</Text>
                                <Tag>{p.duration}</Tag>
                              </Space>
                              <Text type="secondary">Amount: ${p.amount} • Entry: ${p.entryPrice.toFixed(2)}</Text>
                              <Text type="secondary">Expires: {new Date(p.expiryTime).toLocaleTimeString()}</Text>
                            </Space>
                          </List.Item>
                        )}
                      />
                    ),
                  },
                  {
                    key: 'history',
                    label: 'History',
                    children: (
                      <List
                        locale={{ emptyText: 'No history yet' }}
                        dataSource={history}
                        renderItem={(p) => (
                          <List.Item>
                            <Space direction="vertical" style={{ width: '100%' }}>
                              <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                                <Text strong>{p.side}</Text>
                                <Tag color={p.status === 'won' ? 'green' : 'red'}>{p.status.toUpperCase()}</Tag>
                              </Space>
                              <Text type="secondary">Amount: ${p.amount} • Entry: ${p.entryPrice.toFixed(2)} • Exit: ${p.exitPrice.toFixed(2)}</Text>
                              <Text type={p.pnl >= 0 ? 'success' : 'danger'}>PnL: {p.pnl >= 0 ? '+' : ''}${p.pnl.toFixed(2)}</Text>
                              <Text type="secondary">Closed: {new Date(p.closeTime).toLocaleTimeString()}</Text>
                            </Space>
                          </List.Item>
                        )}
                      />
                    ),
                  },
                ]}
              />
            </Card>
          </Space>
        </Col>
      </Row>

      {/* Mobile Trade Bottom Sheet Trigger */}
      <Button className="fab" type="primary" size="large" onClick={() => setDrawerOpen(true)}>Trade</Button>
      <Drawer
        title="Trade"
        placement="bottom"
        height="auto"
        destroyOnClose
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          {latestPrice && (
            <Text>Market: <b>${latestPrice.toFixed(2)}</b></Text>
          )}
          <Text type="secondary">Duration</Text>
          <Segmented
            value={duration}
            onChange={setDuration}
            options={[{label:'30s',value:'30s'},{label:'1m',value:'1m'},{label:'5m',value:'5m'}]}
          />
          <Text type="secondary">Amount</Text>
          <InputNumber style={{ width: '100%' }} min={1} step={1} value={amount} onChange={setAmount} addonBefore="$" />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={onSell} block size="large" style={{ background: '#ea3943', color: '#fff' }}>Sell</Button>
            <Button onClick={onBuy} block type="primary" size="large" style={{ background: '#16c784' }}>Buy</Button>
          </div>
          <Divider style={{ margin: '8px 0' }} />
          <Text type="secondary">{payoutText}</Text>
        </Space>
      </Drawer>
    </div>
  )
}
