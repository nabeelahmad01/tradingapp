import React, { useState } from 'react'
import { Card, Typography, Form, Input, InputNumber, Upload, Button, message } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { auth, db, storage } from '../firebase.js'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'

export default function Deposit() {
  const [loading, setLoading] = useState(false)
  const [fileList, setFileList] = useState([])

  const onFinish = async (values) => {
    setLoading(true)
    try {
      const user = auth.currentUser
      if (!user) throw new Error('Please login to submit a deposit')
      let screenshotUrl = null
      if (fileList?.[0]?.originFileObj) {
        const file = fileList[0].originFileObj
        const path = `deposits/${user.uid}/${Date.now()}_${file.name}`
        const storageRef = ref(storage, path)
        await uploadBytes(storageRef, file)
        screenshotUrl = await getDownloadURL(storageRef)
      }
      await addDoc(collection(db, 'deposits'), {
        uid: user.uid,
        email: user.email || null,
        amount: Number(values.amount),
        txId: values.txId,
        screenshotUrl,
        status: 'pending',
        createdAt: serverTimestamp(),
      })
      message.success('Deposit submitted for review')
      setFileList([])
    } catch (e) {
      message.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <Card>
        <Typography.Title level={3}>Deposit</Typography.Title>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item label="Amount" name="amount" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={1} prefix="$" />
          </Form.Item>
          <Form.Item label="Binance Transaction ID" name="txId" rules={[{ required: true }]}>
            <Input placeholder="Enter TxID" />
          </Form.Item>
          <Form.Item label="Screenshot" required>
            <Upload
              beforeUpload={() => false}
              maxCount={1}
              accept="image/*"
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList)}
            >
              <Button icon={<UploadOutlined />}>Select Image</Button>
            </Upload>
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            Submit Deposit
          </Button>
        </Form>
      </Card>
    </div>
  )
}
