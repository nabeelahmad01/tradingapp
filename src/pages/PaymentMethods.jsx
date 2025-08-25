import React, { useEffect, useState } from 'react'
import { Card, Typography, Form, Input, Button, Table, Space, message, Select } from 'antd'
import { auth, db } from '../firebase.js'
import { collection, addDoc, serverTimestamp, onSnapshot, query, where, doc, deleteDoc } from 'firebase/firestore'

export default function PaymentMethods() {
  const [form] = Form.useForm()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const u = auth.currentUser
    if (!u) return
    const q = query(collection(db, 'paymentMethods'), where('uid', '==', u.uid))
    const unsub = onSnapshot(q, (snap) => {
      setRows(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => unsub()
  }, [])

  const add = async (values) => {
    setLoading(true)
    try {
      const u = auth.currentUser
      if (!u) throw new Error('Please login')
      await addDoc(collection(db, 'paymentMethods'), {
        uid: u.uid,
        type: values.type,
        label: values.label,
        accountName: values.accountName || null,
        accountNumber: values.accountNumber || null,
        bankName: values.bankName || null,
        upiId: values.upiId || null,
        createdAt: serverTimestamp(),
      })
      form.resetFields()
      message.success('Payment method added')
    } catch (e) {
      message.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id) => {
    try {
      await deleteDoc(doc(db, 'paymentMethods', id))
      message.success('Removed')
    } catch (e) {
      message.error(e.message)
    }
  }

  const columns = [
    { title: 'Type', dataIndex: 'type' },
    { title: 'Label', dataIndex: 'label' },
    { title: 'Account Name', dataIndex: 'accountName' },
    { title: 'Account No.', dataIndex: 'accountNumber' },
    { title: 'Bank', dataIndex: 'bankName' },
    { title: 'UPI ID', dataIndex: 'upiId' },
    { title: 'Actions', render: (_, r) => (
      <Space>
        <Button danger onClick={() => remove(r.id)}>Delete</Button>
      </Space>
    )},
  ]

  return (
    <div className="container" style={{ maxWidth: 800 }}>
      <Card>
        <Typography.Title level={3}>Payment Methods</Typography.Title>
        <Form layout="vertical" form={form} onFinish={add}>
          <Form.Item label="Type" name="type" rules={[{ required: true }]}> 
            <Select options={[
              { label: 'Bank', value: 'bank' },
              { label: 'UPI', value: 'upi' },
              { label: 'Other', value: 'other' },
            ]} />
          </Form.Item>
          <Form.Item label="Label" name="label" rules={[{ required: true }]}> 
            <Input placeholder="e.g., My HBL Account" />
          </Form.Item>
          <Form.Item label="Account Name" name="accountName"> 
            <Input />
          </Form.Item>
          <Form.Item label="Account Number" name="accountNumber"> 
            <Input />
          </Form.Item>
          <Form.Item label="Bank Name" name="bankName"> 
            <Input />
          </Form.Item>
          <Form.Item label="UPI ID" name="upiId"> 
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>Add</Button>
        </Form>
      </Card>
      <Card style={{ marginTop: 16 }} title="Your Methods">
        <Table columns={columns} dataSource={rows} rowKey={(r)=>r.id} />
      </Card>
    </div>
  )
}
