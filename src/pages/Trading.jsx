import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Row, Col, Card, Button, Segmented, Typography, Space, InputNumber, Drawer, Tabs, List, Tag, Divider, Select, Input, Radio, message, Alert } from 'antd'
import TradeChart from '../components/TradeChart.jsx'
import { auth, db } from '../firebase.js'
import { doc, onSnapshot, runTransaction, collection, addDoc, serverTimestamp, query, where } from 'firebase/firestore'

const { Title, Text } = Typography

export default function Trading() {
  const [theme] = useState('dark')
  const [amount, setAmount] = useState(10)
  const [timeframe, setTimeframe] = useState('1m')
  const [symbol, setSymbol] = useState('BTCUSDT')
  const [custom, setCustom] = useState('')
  const [latestPrice, _setLatestPrice] = useState(null)
  const latestPriceRef = useRef(null)
  const setLatestPrice = (p) => { latestPriceRef.current = p; _setLatestPrice(p) }
  const [duration, setDuration] = useState('1m') // 30s, 1m, 5m
  const [payoutPct] = useState(85)
  const [positions, setPositions] = useState([])
  const [history, setHistory] = useState([])
  const [historyRemote, setHistoryRemote] = useState([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [accountType, setAccountType] = useState('real') // 'real' | 'demo'
  const [balances, setBalances] = useState({ realBalance: 0, demoBalance: 1000 })
  const [lastPlaced, setLastPlaced] = useState(null)

  // Auto-clear lastPlaced banner after a few seconds
  useEffect(() => {
    if (!lastPlaced) return
    const t = setTimeout(() => setLastPlaced(null), 5000)
    return () => clearTimeout(t)
  }, [lastPlaced])

  // Subscribe to user wallet balances
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (!u) return
      const ref = doc(db, 'users', u.uid)
      return onSnapshot(ref, (snap) => {
        const d = snap.data() || {}
        setBalances({
          realBalance: Number(d.realBalance || 0),
          demoBalance: Number(d.demoBalance || 10000),
        })
      })
    })
    return () => unsub()
  }, [])

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

  const createPosition = async (side) => {
    if (!latestPrice) return
    const user = auth.currentUser
    if (!user) {
      message.error('Please login to trade')
      return
    }
    const useDemo = accountType === 'demo'
    const balField = useDemo ? 'demoBalance' : 'realBalance'
    const currentBal = balances[balField]
    if (amount > currentBal) {
      message.error(`Insufficient ${useDemo ? 'demo' : 'real'} balance`)
      return
    }
    const now = Date.now()
    const pos = {
      id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
      side, // 'Buy' | 'Sell'
      amount,
      accountType,
      entryPrice: latestPrice,
      payoutPct,
      duration,
      openTime: now,
      expiryTime: now + (durToMs[duration] || 60000),
      status: 'open',
    }
    setPositions((prev) => [pos, ...prev])

    // Deduct stake immediately and record trade document
    try {
      await runTransaction(db, async (tx) => {
        const userRef = doc(db, 'users', user.uid)
        const userSnap = await tx.get(userRef)
        const data = userSnap.data() || {}
        // Initialize demo balance to 10000 if missing to allow demo trading by default
        if (useDemo && (data.demoBalance === undefined || data.demoBalance === null)) {
          tx.set(userRef, { demoBalance: 10000 }, { merge: true })
        }
        const bal = Number((useDemo ? (data.demoBalance ?? 10000) : (data.realBalance ?? 0)))
        if (bal < amount && !useDemo) throw new Error('Insufficient real balance')
        if (bal < amount && useDemo) throw new Error('Insufficient demo balance')
        tx.update(userRef, { [balField]: bal - amount })
        const tradesCol = collection(db, 'trades')
        tx.set(doc(tradesCol), { // create with auto-id via addDoc alternative pattern is not possible in tx, so set with doc(tradesCol)
          uid: user.uid,
          email: user.email || null,
          symbol,
          timeframe,
          binanceInterval: tfToBinance[timeframe],
          side,
          amount,
          accountType,
          entryPrice: latestPrice,
          payoutPct,
          status: 'open',
          openTime: now,
          expiryTime: pos.expiryTime,
          createdAt: serverTimestamp(),
        })
      })
      // Visual indication
      setLastPlaced({
        side,
        amount,
        duration,
        expiryTime: pos.expiryTime,
        accountType,
        symbol,
      })
      message.success(`${side} $${amount} ${symbol} • ${duration}. Expires at ${new Date(pos.expiryTime).toLocaleTimeString()}`)
    } catch (e) {
      message.error(e.message)
    }
  }

  const onBuy = () => createPosition('Buy')
  const onSell = () => createPosition('Sell')

  // Settle each position exactly at expiry using a timer and the latest price snapshot at that time
  useEffect(() => {
    // whenever positions change, for any open position without a timer, schedule settlement
    const timers = []
    positions.forEach((p) => {
      const delay = Math.max(0, p.expiryTime - Date.now())
      const timer = setTimeout(() => {
        const priceAtExpiry = latestPriceRef.current
        setPositions((prev) => prev.filter((x) => x.id !== p.id))
        if (!priceAtExpiry) return
        const won = p.side === 'Buy' ? priceAtExpiry > p.entryPrice : priceAtExpiry < p.entryPrice
        const pnl = won ? (p.amount * (p.payoutPct / 100)) : -p.amount
        setHistory((h) => [{ ...p, status: won ? 'won' : 'lost', exitPrice: priceAtExpiry, closeTime: Date.now(), pnl }, ...h])
      }, delay)
      timers.push(timer)
    })
    return () => { timers.forEach(clearTimeout) }
  }, [positions])

  // When positions close, settle PnL to the appropriate wallet
  useEffect(() => {
    if (!history.length) return
    const last = history[0]
    const user = auth.currentUser
    if (!user) return
    const balField = last.accountType === 'demo' ? 'demoBalance' : 'realBalance'
    const delta = last.pnl > 0 ? last.pnl + last.amount : 0 // add back stake + profit if won (stake already deducted)
    if (delta === 0) return
    runTransaction(db, async (tx) => {
      const userRef = doc(db, 'users', user.uid)
      const snap = await tx.get(userRef)
      const data = snap.data() || {}
      const bal = Number(data[balField] || 0)
      tx.update(userRef, { [balField]: bal + delta })
    }).catch(() => {})

    // Record trade result in history collection
    addDoc(collection(db, 'tradeHistory'), {
      uid: user.uid,
      email: user.email || null,
      symbol,
      timeframe,
      side: last.side,
      accountType: last.accountType,
      amount: last.amount,
      entryPrice: last.entryPrice,
      exitPrice: last.exitPrice,
      payoutPct: last.payoutPct,
      pnl: last.pnl,
      status: last.status,
      openTime: last.openTime,
      closeTime: last.closeTime,
      createdAt: serverTimestamp(),
    }).catch(() => {})
  }, [history])

  // Subscribe to Firestore trade history for the signed-in user (for persistent history display)
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => {
      if (!u) { setHistoryRemote([]); return }
      const q = query(collection(db, 'tradeHistory'), where('uid', '==', u.uid))
      const unsub = onSnapshot(q, (snap) => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        // Sort newest first by closeTime or createdAt if closeTime missing
        items.sort((a, b) => (b.closeTime || 0) - (a.closeTime || 0) || (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
        setHistoryRemote(items)
      })
      return unsub
    })
    return () => unsubAuth()
  }, [])

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
                  <Text type="secondary">Account</Text>
                  <Radio.Group size="small" value={accountType} onChange={(e)=>setAccountType(e.target.value)}>
                    <Radio.Button value="real">Real (${balances.realBalance.toFixed(2)})</Radio.Button>
                    <Radio.Button value="demo">Demo (${balances.demoBalance.toFixed(2)})</Radio.Button>
                  </Radio.Group>
                </div>
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
            {lastPlaced && (
              <Alert
                showIcon
                type={lastPlaced.side === 'Buy' ? 'success' : 'error'}
                message={`${lastPlaced.side} placed: $${lastPlaced.amount} ${lastPlaced.symbol} • ${lastPlaced.duration}`}
                description={`Expires at ${new Date(lastPlaced.expiryTime).toLocaleTimeString()} • Account: ${lastPlaced.accountType}`}
                style={{ marginBottom: 8 }}
              />
            )}
            <TradeChart height={460} theme={theme} symbol={symbol} interval={tfToBinance[timeframe]} onPriceUpdate={setLatestPrice} />
            {/* Mobile trade panel under chart */}
            <div className="only-mobile" style={{ marginTop: 8 }}>
              <Card size="small" styles={{ body: { padding: 12 } }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {latestPrice && (
                    <Text>Market: <b>${latestPrice.toFixed(2)}</b></Text>
                  )}
                  <Text type="secondary">Duration</Text>
                  <Segmented
                    size="small"
                    value={duration}
                    onChange={setDuration}
                    options={[{label:'30s',value:'30s'},{label:'1m',value:'1m'},{label:'5m',value:'5m'}]}
                  />
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
                    <Button onClick={() => createPosition('Sell')} block size="large" style={{ background: '#ea3943', color: '#fff' }}>Sell</Button>
                    <Button onClick={() => createPosition('Buy')} block type="primary" size="large" style={{ background: '#16c784' }}>Buy</Button>
                  </div>
                </Space>
              </Card>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Space direction="vertical" style={{ width: '100%' }} size={16} className="only-desktop">
            <Card title="Balance">
              <Space direction="vertical">
                <Title level={4} style={{ margin: 0 }}>${accountType === 'real' ? balances.realBalance.toFixed(2) : balances.demoBalance.toFixed(2)}</Title>
                <Text type="secondary">{accountType === 'real' ? 'Real' : 'Demo'}</Text>
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
                  <Button onClick={() => createPosition('Sell')} block size="large" style={{ background: '#ea3943', color: '#fff' }}>Sell</Button>
                  <Button onClick={() => createPosition('Buy')} block type="primary" size="large" style={{ background: '#16c784' }}>Buy</Button>
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
                        dataSource={historyRemote}
                        renderItem={(p) => (
                          <List.Item>
                            <Space direction="vertical" style={{ width: '100%' }}>
                              <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                                <Text strong>{p.side}</Text>
                                <Tag color={p.status === 'won' ? 'green' : 'red'}>{(p.status || '').toString().toUpperCase()}</Tag>
                              </Space>
                              <Text type="secondary">Amount: ${p.amount} • Entry: ${Number(p.entryPrice || 0).toFixed(2)} • Exit: ${Number(p.exitPrice || 0).toFixed(2)}</Text>
                              <Text type={(p.pnl || 0) >= 0 ? 'success' : 'danger'}>PnL: {(p.pnl || 0) >= 0 ? '+' : ''}${Number(p.pnl || 0).toFixed(2)}</Text>
                              {p.closeTime ? (
                                <Text type="secondary">Closed: {new Date(p.closeTime).toLocaleTimeString()}</Text>
                              ) : null}
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

      {/* Fixed bottom mobile Buy/Sell bar */}
      <div className="mobile-trade-bar only-mobile">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {latestPrice && (
            <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>Mkt ${latestPrice.toFixed(2)}</Text>
          )}
          <InputNumber
            size="small"
            min={1}
            step={1}
            value={amount}
            onChange={setAmount}
            addonBefore="$"
            style={{ flex: 1 }}
          />
          <Button onClick={onSell} size="large" style={{ background: '#ea3943', color: '#fff' }}>Sell</Button>
          <Button onClick={onBuy} size="large" type="primary" style={{ background: '#16c784' }}>Buy</Button>
        </div>
      </div>

      {/* Mobile Trade Bottom Sheet Trigger */}
      {/* <Button className="fab" type="primary" size="large" onClick={() => setDrawerOpen(true)}>Trade</Button>
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
      </Drawer> */}
    </div>
  )
}
