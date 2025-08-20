import React, { useState } from 'react'
import { Drawer, Typography, Space, Button, Divider, Collapse, Form, Input, message } from 'antd'
import { CustomerServiceOutlined, WhatsAppOutlined, MailOutlined } from '@ant-design/icons'

export default function SupportWidget() {
  const [open, setOpen] = useState(false)
  const [sending, setSending] = useState(false)

  const onFinish = async ({ name, email, issue }) => {
    // Simple: open mail client with prefilled subject/body
    try {
      setSending(true)
      const subject = encodeURIComponent(`Support Request from ${name}`)
      const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nIssue:\n${issue}`)
      window.location.href = `mailto:support@example.com?subject=${subject}&body=${body}`
      message.success('Opening your email client...')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <Button
        type="primary"
        size="large"
        icon={<CustomerServiceOutlined />}
        onClick={() => setOpen(true)}
        className="fab"
      >
        Support
      </Button>
      <Drawer
        title="Customer Support"
        open={open}
        onClose={() => setOpen(false)}
        placement="right"
        width={360}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Typography.Text>Contact us on:</Typography.Text>
          <Space>
            <Button icon={<WhatsAppOutlined />} href="https://wa.me/1234567890" target="_blank">WhatsApp</Button>
            <Button icon={<MailOutlined />} href="mailto:support@example.com">Email</Button>
          </Space>
          <Divider />
          <Typography.Title level={5} style={{ margin: 0 }}>Send quick message</Typography.Title>
          <Form layout="vertical" onFinish={onFinish}>
            <Form.Item label="Your name" name="name" rules={[{ required: true }]}> 
              <Input placeholder="e.g. Ali Raza" />
            </Form.Item>
            <Form.Item label="Your email" name="email" rules={[{ required: true, type: 'email' }]}> 
              <Input placeholder="you@example.com" />
            </Form.Item>
            <Form.Item label="Issue / Question" name="issue" rules={[{ required: true, min: 10 }]}> 
              <Input.TextArea rows={4} placeholder="Describe your issue..." />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={sending} block>
              Prepare Email
            </Button>
          </Form>
          <Divider />
          <Collapse
            items={[
              { key: '1', label: 'How do I deposit?', children: <p>Go to Deposit page, paste Binance TxID, upload screenshot, and submit.</p> },
              { key: '2', label: 'How to withdraw?', children: <p>Open Withdraw page, enter amount and wallet, submit request. Track status in History.</p> },
              { key: '3', label: 'Forgot password?', children: <p>Use the login page "Forgot password" (coming soon) or contact support via email.</p> },
            ]}
          />
        </Space>
      </Drawer>
    </>
  )
}
