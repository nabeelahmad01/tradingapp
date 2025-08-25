import React, { useEffect, useState } from 'react'
import { Card, Typography, Table, Button, Space, Tag, message } from 'antd'
import { auth, db } from '../../firebase.js'
import { collection, onSnapshot, query, where } from 'firebase/firestore'

export default function MyOrders() {
  const [rows, setRows] = useState([])

  useEffect(() => {
    const u = auth.currentUser
    if (!u) return
    const q = query(collection(db, 'p2p_orders'), where('buyerUid', '==', u.uid))
    const s = query(collection(db, 'p2p_orders'), where('sellerUid', '==', u.uid))
    const unsub1 = onSnapshot(q, (snap) => {
      const buyer = snap.docs.map(d => ({ id: d.id, role: 'buyer', ...d.data() }))
      setRows((prev) => {
        const others = prev.filter(r => r.role !== 'buyer')
        return [...others, ...buyer]
      })
    })
    const unsub2 = onSnapshot(s, (snap) => {
      const seller = snap.docs.map(d => ({ id: d.id, role: 'seller', ...d.data() }))
      setRows((prev) => {
        const others = prev.filter(r => r.role !== 'seller')
        return [...others, ...seller]
      })
    })
    return () => { unsub1(); unsub2() }
  }, [])

  const markPaid = async (order) => {
    try {
      const user = auth.currentUser
      if (!user) throw new Error('Please login')
      const idToken = await user.getIdToken()
      const res = await fetch('/.netlify/functions/p2p-mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ orderId: order.id })
      })
      if (!res.ok) throw new Error(await res.text())
      message.success('Marked as paid')
    } catch (e) {
      message.error(e.message)
    }
  }

  const release = async (order) => {
    try {
      const user = auth.currentUser
      if (!user) throw new Error('Please login')
      const idToken = await user.getIdToken()
      const res = await fetch('/.netlify/functions/p2p-release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ orderId: order.id })
      })
      if (!res.ok) throw new Error(await res.text())
      message.success('Funds released')
    } catch (e) {
      message.error(e.message)
    }
  }

  const cancel = async (order) => {
    try {
      const user = auth.currentUser
      if (!user) throw new Error('Please login')
      const idToken = await user.getIdToken()
      const res = await fetch('/.netlify/functions/p2p-cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ orderId: order.id })
      })
      if (!res.ok) throw new Error(await res.text())
      message.success('Order cancelled')
    } catch (e) {
      message.error(e.message)
    }
  }

  const columns = [
    { title: 'Role', dataIndex: 'role', render: (v) => <Tag color={v==='seller'?'red':'green'}>{v}</Tag> },
    { title: 'Asset', dataIndex: 'asset' },
    { title: 'Amount (USD)', dataIndex: 'amountUsd' },
    { title: 'Status', dataIndex: 'status', render: (s) => <Tag color={s==='pending_payment'?'orange':s==='paid'?'blue':s==='released'?'green':'default'}>{s}</Tag> },
    { title: 'Actions', render: (_, r) => (
      <Space>
        {r.role === 'buyer' && r.status === 'pending_payment' && (
          <Button onClick={() => markPaid(r)}>Mark Paid</Button>
        )}
        {r.role === 'seller' && r.status === 'paid' && (
          <Button type="primary" onClick={() => release(r)}>Release</Button>
        )}
        {(r.status === 'pending_payment') && (
          <Button danger onClick={() => cancel(r)}>Cancel</Button>
        )}
      </Space>
    )},
  ]

  return (
    <div className="container">
      <Card>
        <Typography.Title level={3}>My P2P Orders</Typography.Title>
        <Table columns={columns} dataSource={rows} rowKey={(r)=>r.id} />
      </Card>
    </div>
  )
}
