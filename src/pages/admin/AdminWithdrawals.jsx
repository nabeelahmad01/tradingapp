import React, { useEffect, useState } from 'react'
import { Card, Table, Button, Space, Tag, message } from 'antd'
import { db } from '../../firebase.js'
import { collection, onSnapshot, query, where, doc, runTransaction, updateDoc } from 'firebase/firestore'

export default function AdminWithdrawals() {
  const [data, setData] = useState([])

  useEffect(() => {
    const q = query(collection(db, 'withdrawals'), where('status', '==', 'pending'))
    return onSnapshot(q, (snap) => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setData(rows)
    })
  }, [])

  const approve = async (id, uid, amount) => {
    try {
      await runTransaction(db, async (tx) => {
        const wRef = doc(db, 'withdrawals', id)
        const wSnap = await tx.get(wRef)
        if (!wSnap.exists()) throw new Error('Withdrawal not found')
        if (wSnap.data().status !== 'pending') throw new Error('Already processed')
        const userRef = doc(db, 'users', uid)
        const userSnap = await tx.get(userRef)
        const bal = Number(userSnap.data()?.realBalance || 0)
        const amt = Number(amount || 0)
        if (bal < amt) throw new Error('User balance is insufficient to approve')
        tx.update(userRef, { realBalance: bal - amt })
        tx.update(wRef, { status: 'approved' })
      })
      message.success('Withdrawal approved and balance deducted')
    } catch (e) {
      message.error(e.message)
    }
  }
  const reject = async (id) => {
    try {
      await updateDoc(doc(db, 'withdrawals', id), { status: 'rejected' })
      message.success('Withdrawal rejected')
    } catch (e) {
      message.error(e.message)
    }
  }

  const columns = [
    { title: 'User', dataIndex: 'email' },
    { title: 'Amount', dataIndex: 'amount' },
    { title: 'Method', dataIndex: 'method' },
    { title: 'Status', dataIndex: 'status', render: (s) => <Tag color={s==='pending'?'orange':s==='approved'?'green':'red'}>{s}</Tag> },
    { title: 'Actions', key: 'actions', render: (_, r) => (
      <Space>
        <Button type="primary" onClick={() => approve(r.id, r.uid, r.amount)}>Approve</Button>
        <Button danger onClick={() => reject(r.id)}>Reject</Button>
      </Space>
    ) },
  ]

  return (
    <div className="container">
      <Card title="Pending Withdrawals">
        <Table columns={columns} dataSource={data} rowKey={(r)=>r.id} />
      </Card>
    </div>
  )
}
