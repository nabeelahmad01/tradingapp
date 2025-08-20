import React, { useState } from 'react'
import { Card, Typography, Form, Input, InputNumber, Upload, Button, message } from 'antd'
import { UploadOutlined } from '@ant-design/icons'

export default function Deposit() {
  const [loading, setLoading] = useState(false)
  const [fileList, setFileList] = useState([])

  const onFinish = async (values) => {
    setLoading(true)
    try {
      // TODO: Upload screenshot to Firebase Storage and save request in Firestore
      console.log('Deposit submit', { ...values, fileList })
      message.success('Deposit submitted for review')
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
