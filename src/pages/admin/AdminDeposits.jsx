import React, { useEffect, useState } from 'react'
import { Card, Table, Button, Space, Tag, message } from 'antd'
import { db } from '../../firebase.js'
import { collection, onSnapshot, query, where, doc, runTransaction, updateDoc } from 'firebase/firestore'

export default function AdminDeposits() {
  const [data, setData] = useState([])

  useEffect(() => {
    const q = query(collection(db, 'deposits'), where('status', '==', 'pending'))
    return onSnapshot(q, (snap) => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setData(rows)
    })
  }, [])

  const approve = async (id, uid, amount) => {
    try {
      await runTransaction(db, async (tx) => {
        const depRef = doc(db, 'deposits', id)
        const depSnap = await tx.get(depRef)
        if (!depSnap.exists()) throw new Error('Deposit not found')
        if (depSnap.data().status !== 'pending') throw new Error('Already processed')
        const userRef = doc(db, 'users', uid)
        const userSnap = await tx.get(userRef)
        const bal = Number(userSnap.data()?.realBalance || 0)
        tx.update(userRef, { realBalance: bal + Number(amount || 0) })
        tx.update(depRef, { status: 'approved' })
      })
      message.success('Deposit approved and balance updated')
    } catch (e) {
      message.error(e.message)
    }
  }
  const reject = async (id) => {
    try {
      await updateDoc(doc(db, 'deposits', id), { status: 'rejected' })
      message.success('Deposit rejected')
    } catch (e) {
      message.error(e.message)
    }
  }

  const columns = [
    { title: 'User', dataIndex: 'email' },
    { title: 'Amount', dataIndex: 'amount' },
    { title: 'TxID', dataIndex: 'txId' },
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
      <Card title="Pending Deposits">
        <Table columns={columns} dataSource={data} rowKey={(r)=>r.id} />
      </Card>
    </div>
  )
}
