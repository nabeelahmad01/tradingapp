import React, { useEffect, useMemo, useState } from 'react'
import { Card, Table, Space, Button, Tag, Input, Drawer, Tabs, List, Typography } from 'antd'
import AdminHeader from '../../components/admin/AdminHeader.jsx'
import { db } from '../../firebase.js'
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [deposits, setDeposits] = useState([])
  const [withdrawals, setWithdrawals] = useState([])

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'users'), orderBy('email')), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    return () => unsub()
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
      query(collection(db, 'deposits'), where('uid', '==', u.id), orderBy('createdAt', 'desc')),
      (snap) => setDeposits(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    )
    const unsubWdr = onSnapshot(
      query(collection(db, 'withdrawals'), where('uid', '==', u.id), orderBy('createdAt', 'desc')),
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
        </Space>
      )
    },
  ]

  return (
    <div className="container">
      <AdminHeader />
      <Card title="Users">
        <Space style={{ marginBottom: 12 }} wrap>
          <Input.Search placeholder="Search by email or uid" allowClear onSearch={setSearch} onChange={(e)=>setSearch(e.target.value)} style={{ minWidth: 260 }} />
        </Space>
        <Table rowKey="id" dataSource={filtered} columns={columns} pagination={{ pageSize: 10 }} />
      </Card>

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
