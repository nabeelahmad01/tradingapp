import React, { useState } from 'react'
import { Card, Typography, Form, Input, InputNumber, Upload, Button, message } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { auth, db, storage } from '../firebase.js'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'

export default function Deposit() {
  const [loading, setLoading] = useState(false)
  const [fileList, setFileList] = useState([])
  const [form] = Form.useForm()

  const onFinish = async (values) => {
    setLoading(true)
    try {
      const user = auth.currentUser
      if (!user) throw new Error('Please login to submit a deposit')
      const amount = Number(values.amount)
      if (!amount || amount <= 0) throw new Error('Enter a valid amount')
      if (!fileList?.[0]?.originFileObj) throw new Error('Please select a screenshot')

      // 1) Create deposit doc immediately
      const docRef = await addDoc(collection(db, 'deposits'), {
        uid: user.uid,
        email: user.email || null,
        amount,
        txId: values.txId,
        screenshotUrl: null,
        status: 'pending',
        createdAt: serverTimestamp(),
      })

      // Notify immediately and release UI
      message.success('Deposit submitted for review')
      setFileList([])
      form.resetFields()
      setLoading(false)

      // 2) Upload screenshot in background and patch the doc (do not await to avoid blocking UI)
      if (fileList?.[0]?.originFileObj) {
        ;(async () => {
          try {
            const file = fileList[0].originFileObj
            const path = `deposits/${user.uid}/${Date.now()}_${file.name}`
            const storageRef = ref(storage, path)
            await uploadBytes(storageRef, file)
            const screenshotUrl = await getDownloadURL(storageRef)
            const { updateDoc, doc } = await import('firebase/firestore')
            await updateDoc(doc(db, 'deposits', docRef.id), { screenshotUrl })
          } catch (e) {
            // Non-fatal: keep the deposit request without screenshot
            // eslint-disable-next-line no-console
            console.error('Screenshot upload failed:', e)
          }
        })()
      }
    } catch (e) {
      message.error(e.message)
    } finally {
      // loading is already turned off above on success; keep here for error paths
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <Card>
        <Typography.Title level={3}>Deposit</Typography.Title>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item label="Amount" name="amount" rules={[{ required: true }]}> 
            <InputNumber style={{ width: '100%' }} min={1} prefix="$" />
          </Form.Item>
          <Form.Item label="Binance Transaction ID" name="txId" rules={[{ required: true }]}> 
            <Input placeholder="Enter TxID" />
          </Form.Item>
          <Form.Item 
            label="Screenshot" 
            name="screenshot" 
            valuePropName="fileList"
            getValueFromEvent={({ fileList }) => fileList}
            rules={[{ required: true, validator: (_, v) => (v && v.length > 0 ? Promise.resolve() : Promise.reject(new Error('Screenshot is required'))) }]}>
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
