import React, { useState } from 'react'
import { Card, Form, Input, Button, List, message } from 'antd'

export default function AdminNews() {
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState([
    { id: 'n1', title: 'Welcome', body: 'Post your daily updates', createdAt: new Date().toISOString() },
  ])

  const onFinish = async ({ title, body }) => {
    setLoading(true)
    try {
      // TODO: Save to Firestore `news` collection with server timestamp
      const newItem = { id: Math.random().toString(36).slice(2), title, body, createdAt: new Date().toISOString() }
      setItems([newItem, ...items])
      message.success('News posted')
    } catch (e) {
      message.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <Card title="Post News" style={{ marginBottom: 16 }}>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item label="Title" name="title" rules={[{ required: true }]}> <Input /> </Form.Item>
          <Form.Item label="Body" name="body" rules={[{ required: true }]}> <Input.TextArea rows={4} /> </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>Publish</Button>
        </Form>
      </Card>

      <Card title="Recent News">
        <List
          itemLayout="vertical"
          dataSource={items}
          renderItem={(item) => (
            <List.Item key={item.id}>
              <List.Item.Meta title={item.title} description={new Date(item.createdAt).toLocaleString()} />
              <div>{item.body}</div>
            </List.Item>
          )}
        />
      </Card>
    </div>
  )
}
