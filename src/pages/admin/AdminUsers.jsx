import React, { useEffect, useMemo, useState } from 'react'
import { Card, Table, Space, Button, Tag, Input, Drawer, Tabs, List, Typography, Modal, InputNumber, Radio, message } from 'antd'
import AdminHeader from '../../components/admin/AdminHeader.jsx'
import { db } from '../../firebase.js'
import { collection, onSnapshot, query, where, runTransaction, doc } from 'firebase/firestore'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [deposits, setDeposits] = useState([])
  const [withdrawals, setWithdrawals] = useState([])

  useEffect(() => {
    let unsub
    try {
      const q = query(collection(db, 'users'))
      unsub = onSnapshot(q, (snap) => {
        setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      })
    } catch (e) { console.error('Error loading users:', e) }
    return () => { if (unsub) unsub() }
  }, [])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return users
    return users.filter(u => (u.email || '').toLowerCase().includes(s) || (u.uid || '').includes(s))
  }, [users, search])

  const showHistory = (u) => {
    setSelectedUser(u)
    setOpen(true)
    // subscribe to this user's deposits and withdrawals
    const unsubDeps = onSnapshot(
      query(collection(db, 'deposits'), where('uid', '==', u.id)),
      (snap) => setDeposits(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    )
    const unsubWdr = onSnapshot(
      query(collection(db, 'withdrawals'), where('uid', '==', u.id)),
      (snap) => setWithdrawals(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    )
    // store for cleanup on close
    setUnsubs([unsubDeps, unsubWdr])
  }

  const [unsubs, setUnsubs] = useState([])
  const closeDrawer = () => {
    setOpen(false)
    setSelectedUser(null)
    setDeposits([])
    setWithdrawals([])
    unsubs.forEach((fn) => fn && fn())
    setUnsubs([])
  }

  const columns = [
    { title: 'Email', dataIndex: 'email' },
    { title: 'UID', dataIndex: 'id', responsive: ['lg'] },
    { title: 'Role', dataIndex: 'role', render: (r) => <Tag color={r==='admin'?'gold':'blue'}>{r||'user'}</Tag> },
    { title: 'Real', dataIndex: 'realBalance', render: (v) => `$${Number(v||0).toFixed(2)}` },
    { title: 'Demo', dataIndex: 'demoBalance', render: (v) => `$${Number(v||0).toFixed(2)}`, responsive: ['md'] },
    {
      title: 'Actions', key: 'actions', render: (_, r) => (
        <Space>
          <Button onClick={() => showHistory(r)}>View History</Button>
          <Button type="primary" onClick={() => openAdjust(r)}>Adjust Balance</Button>
        </Space>
      )
    },
  ]

  // Adjust Balance Modal state
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustUser, setAdjustUser] = useState(null)
  const [adjustType, setAdjustType] = useState('real') // 'real' | 'demo'
  const [adjustMode, setAdjustMode] = useState('credit') // 'credit' | 'debit'
  const [adjustAmount, setAdjustAmount] = useState(50)

  const openAdjust = (u) => {
    setAdjustUser(u)
    setAdjustType('real')
    setAdjustMode('credit')
    setAdjustAmount(50)
    setAdjustOpen(true)
  }

  const doAdjust = async () => {
    if (!adjustUser) return
    const uid = adjustUser.id
    const field = adjustType === 'demo' ? 'demoBalance' : 'realBalance'
    const amt = Number(adjustAmount || 0)
    if (amt <= 0) { message.error('Enter a valid amount'); return }
    try {
      await runTransaction(db, async (tx) => {
        const ref = doc(db, 'users', uid)
        const snap = await tx.get(ref)
        const data = snap.data() || {}
        const current = Number(data[field] || (field==='demoBalance'?10000:0))
        const next = adjustMode === 'credit' ? current + amt : current - amt
        if (next < 0) throw new Error('Balance cannot go negative')
        tx.set(ref, { [field]: next }, { merge: true })
      })
      message.success('Balance updated')
      setAdjustOpen(false)
    } catch (e) {
      message.error(e.message)
    }
  }

  return (
    <div className="container">
      <AdminHeader />
      <Card title="Users">
        <Space style={{ marginBottom: 12 }} wrap>
          <Input.Search placeholder="Search by email or uid" allowClear onSearch={setSearch} onChange={(e)=>setSearch(e.target.value)} style={{ minWidth: 260 }} />
        </Space>
        <Table rowKey="id" dataSource={filtered} columns={columns} pagination={{ pageSize: 10 }} />
      </Card>

      <Modal
        title={adjustUser ? `Adjust Balance: ${adjustUser.email||adjustUser.id}` : 'Adjust Balance'}
        open={adjustOpen}
        onCancel={() => setAdjustOpen(false)}
        onOk={doAdjust}
        okText={adjustMode==='credit'?'Credit':'Debit'}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Radio.Group value={adjustType} onChange={(e)=>setAdjustType(e.target.value)}>
            <Radio.Button value="real">Real</Radio.Button>
            <Radio.Button value="demo">Demo</Radio.Button>
          </Radio.Group>
          <Radio.Group value={adjustMode} onChange={(e)=>setAdjustMode(e.target.value)}>
            <Radio.Button value="credit">Credit</Radio.Button>
            <Radio.Button value="debit">Debit</Radio.Button>
          </Radio.Group>
          <InputNumber min={1} step={1} value={adjustAmount} onChange={setAdjustAmount} addonBefore="$" style={{ width: '100%' }} />
        </Space>
      </Modal>

      <Drawer title={selectedUser ? `History: ${selectedUser.email||selectedUser.id}` : 'History'} open={open} onClose={closeDrawer} width={Math.min(720, window.innerWidth - 40)}>
        <Tabs
          items={[
            {
              key: 'deposits',
              label: 'Deposits',
              children: (
                <List
                  dataSource={deposits}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta
                        title={<Space><Typography.Text strong>${Number(item.amount||0).toFixed(2)}</Typography.Text><Tag color={item.status==='pending'?'orange':item.status==='approved'?'green':'red'}>{item.status}</Tag></Space>}
                        description={<div>
                          <div>TxID: {item.txId || '-'}</div>
                          <div>At: {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : '-'}</div>
                          {item.screenshotUrl ? <a href={item.screenshotUrl} target="_blank" rel="noreferrer">Open screenshot</a> : null}
                        </div>}
                      />
                    </List.Item>
                  )}
                />
              )
            },
            {
              key: 'withdrawals',
              label: 'Withdrawals',
              children: (
                <List
                  dataSource={withdrawals}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta
                        title={<Space><Typography.Text strong>${Number(item.amount||0).toFixed(2)}</Typography.Text><Tag color={item.status==='pending'?'orange':item.status==='approved'?'green':'red'}>{item.status}</Tag></Space>}
                        description={<div>
                          <div>Method: {item.method || '-'}</div>
                          <div>At: {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : '-'}</div>
                        </div>}
                      />
                    </List.Item>
                  )}
                />
              )
            }
          ]}
        />
      </Drawer>
    </div>
  )
}
