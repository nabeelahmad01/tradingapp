import React, { useEffect, useState } from 'react'
import { Card, Typography, Table, Button, Modal, Form, InputNumber, message, Space, Tag } from 'antd'
import { auth, db } from '../../firebase.js'
import { collection, onSnapshot, query, where } from 'firebase/firestore'

export default function Market() {
  const [rows, setRows] = useState([])
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    const q = query(collection(db, 'p2p_listings'), where('active', '==', true))
    const unsub = onSnapshot(q, (snap) => {
      setRows(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => unsub()
  }, [])

  const createOrder = async (values) => {
    setLoading(true)
    try {
      const user = auth.currentUser
      if (!user) throw new Error('Please login')
      const amountUsd = Number(values.amount)
      if (!amountUsd || amountUsd <= 0) throw new Error('Enter amount')
      const listing = selected
      if (!listing) throw new Error('No listing selected')
      if (amountUsd < Number(listing.min || 0) || amountUsd > Number(listing.max || 0)) {
        throw new Error(`Amount must be between ${listing.min} and ${listing.max}`)
      }

      const idToken = await user.getIdToken()
      const res = await fetch('/.netlify/functions/p2p-create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ listingId: listing.id, amountUsd })
      })
      if (!res.ok) throw new Error(await res.text())

      message.success('Order created')
      setOpen(false)
      form.resetFields()
    } catch (e) {
      message.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    { title: 'Side', dataIndex: 'side', render: (s) => <Tag color={s==='sell'?'red':'green'}>{s}</Tag> },
    { title: 'Asset', dataIndex: 'asset' },
    { title: 'Price', dataIndex: 'price' },
    { title: 'Limits (USD)', render: (_, r) => `${r.min} - ${r.max}` },
    { title: 'Seller/Buyer', render: (_, r) => r.email || '-' },
    { title: 'Actions', render: (_, r) => (
      <Button type="primary" onClick={() => { setSelected(r); setOpen(true) }}>Create Order</Button>
    )},
  ]

  return (
    <div className="container">
      <Card>
        <Typography.Title level={3}>P2P Market</Typography.Title>
        <Table columns={columns} dataSource={rows} rowKey={(r)=>r.id} />
      </Card>
      <Modal open={open} onCancel={()=>setOpen(false)} footer={null} title="Create Order">
        <Form layout="vertical" form={form} onFinish={createOrder}>
          <Form.Item label="Amount (USD)" name="amount" rules={[{ required: true }]}> 
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Space>
            <Button onClick={()=>setOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>Create</Button>
          </Space>
        </Form>
      </Modal>
    </div>
  )
}
