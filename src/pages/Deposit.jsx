import React, { useState, useEffect } from 'react'
import { Card, Typography, Form, InputNumber, Button, message, Select, Alert, Modal, Input, Upload } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { auth, db, storage } from '../firebase.js'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { onSettings, defaultSettings } from '../services/settings.js'

export default function Deposit() {
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const [settings, setSettings] = useState(defaultSettings)
  const [lastInvoice, setLastInvoice] = useState(null)
  const [minUsd, setMinUsd] = useState(0)
  const [minLoading, setMinLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [iframeLoading, setIframeLoading] = useState(true)

  useEffect(() => {
    const unsub = onSettings((s) => setSettings(s))
    return () => unsub && unsub()
  }, [])

  const fetchMin = async (asset) => {
    if (!asset) { setMinUsd(0); return }
    setMinLoading(true)
    try {
      const res = await fetch('/.netlify/functions/nowpayments-min-amount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to fetch minimum amount')
      setMinUsd(Number(data.minUsd || 0))
    } catch (e) {
      setMinUsd(0)
      message.warning(e.message)
    } finally {
      setMinLoading(false)
    }
  }

  const onFinish = async (values) => {
    setLoading(true)
    try {
      const user = auth.currentUser
      if (!user) throw new Error('Please login to create a deposit')
      const amountUsd = Number(values.amount)
      if (!amountUsd || amountUsd <= 0) throw new Error('Enter a valid amount')
      const asset = values.asset
      if (!asset) throw new Error('Select an asset')

      // Manual Cash App flow
      if ((settings.paymentsProvider === 'manual_cashapp') && settings.cashAppEnabled) {
        const senderCashtag = values.senderCashtag?.trim()
        if (!senderCashtag) throw new Error('Enter your Cash App cashtag')
        const fileList = values.screenshot?.fileList || []
        if (!fileList.length) throw new Error('Upload a payment screenshot')
        const fileObj = fileList[0].originFileObj
        if (!fileObj) throw new Error('Invalid file upload')

        // upload screenshot
        const path = `deposits/${user.uid}/${Date.now()}-${fileObj.name}`
        const sref = ref(storage, path)
        await uploadBytes(sref, fileObj)
        const screenshotUrl = await getDownloadURL(sref)

        // create pending deposit
        await addDoc(collection(db, 'deposits'), {
          uid: user.uid,
          email: user.email || null,
          method: 'cashapp',
          amount: amountUsd,
          asset: 'USD',
          senderCashtag,
          txId: values.txId || null,
          screenshotUrl,
          status: 'pending',
          createdAt: serverTimestamp(),
        })
        message.success('Submitted. We will verify and approve shortly.')
        form.resetFields()
        return
      }

      // Re-fetch latest provider minimum to avoid price/rounding issues
      let currentMin = Number(minUsd || 0)
      try {
        const fres = await fetch('/.netlify/functions/nowpayments-min-amount', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ asset })
        })
        const fdata = await fres.json()
        if (fres.ok) {
          currentMin = Math.max(currentMin, Number(fdata?.minUsd || 0))
          setMinUsd(currentMin)
        }
      } catch { /* ignore and use existing min */ }

      // Enforce provider minimum with latest value
      if (currentMin && amountUsd < currentMin) {
        throw new Error(`Minimum for ${asset} is $${currentMin}`)
      }

      const res = await fetch('/.netlify/functions/nowpayments-create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset, amountUsd, uid: user.uid, email: user.email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to create invoice')
      const url = data?.invoice?.invoice_url
      setLastInvoice({ url, id: data?.invoice?.id, orderId: data?.orderId })
      message.success('Invoice created')
      // Open in the same tab for best compatibility (some providers block iframes)
      if (url) {
        window.location.href = url
        return
      }
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
        <Form form={form} layout="vertical" onFinish={onFinish} onValuesChange={(c, all)=>{
          if (Object.prototype.hasOwnProperty.call(c, 'asset')) fetchMin(c.asset)
        }}>
          <Form.Item label="Amount (USD)" name="amount" rules={[{ required: true }]}> 
            <InputNumber style={{ width: '100%' }} min={minUsd || 5} prefix="$" />
          </Form.Item>
          <Form.Item label="Asset" name="asset" rules={[{ required: true }]}> 
            <Select placeholder="Select asset">
              {(settings.supportedAssets || []).map((a) => (
                <Select.Option key={a} value={a}>{a}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          {minUsd > 0 && (
            <Alert type="info" showIcon style={{ marginBottom: 12 }} message={`Minimum for selected asset is $${minUsd}`} />
          )}
          <Alert type="info" showIcon style={{ marginBottom: 12 }} message={`Provider: ${settings.paymentsProvider || 'nowpayments'}`} />

          {settings.paymentsProvider === 'manual_cashapp' && settings.cashAppEnabled && (
            <div style={{ marginBottom: 12 }}>
              <Alert
                type="warning"
                showIcon
                message={`Send payment on Cash App to ${settings.cashAppCashtag || 'your cashtag'}`}
                description={settings.cashAppNote || 'After sending, enter your cashtag and upload a screenshot. We will verify and approve shortly.'}
                style={{ marginBottom: 12 }}
              />
              <Form.Item label="Your Cash App cashtag" name="senderCashtag" rules={[{ required: true, message: 'Enter your Cash App cashtag' }]}> 
                <Input placeholder="$YourCashtag" />
              </Form.Item>
              <Form.Item label="Payment Reference / Note (optional)" name="txId"> 
                <Input placeholder="Reference or note you used in Cash App" />
              </Form.Item>
              <Form.Item label="Screenshot" name="screenshot" valuePropName="fileList" getValueFromEvent={(e)=>e?.fileList} rules={[{ required: true, message: 'Upload screenshot' }]}> 
                <Upload beforeUpload={()=>false} listType="picture">
                  <Button icon={<UploadOutlined />}>Upload Screenshot</Button>
                </Upload>
              </Form.Item>
            </div>
          )}
          <Button type="primary" htmlType="submit" loading={loading || minLoading} block>
            Create Payment Link
          </Button>
        </Form>
        <Modal
          title="Complete Payment"
          open={showModal}
          onCancel={() => setShowModal(false)}
          footer={[
            <Button key="open" type="link" onClick={() => lastInvoice?.url && window.open(lastInvoice.url, '_blank')}>Open in new tab</Button>,
            <Button key="close" onClick={() => setShowModal(false)}>Close</Button>,
          ]}
          style={{ maxWidth: '95vw' }}
          destroyOnClose
        >
          {lastInvoice?.url ? (
            <div style={{ height: 600, position: 'relative' }}>
              {iframeLoading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography.Text>Loading payment page...</Typography.Text>
                </div>
              )}
              <iframe
                title="NOWPayments Invoice"
                src={lastInvoice.url}
                style={{ width: '100%', height: '100%', border: 0 }}
                onLoad={() => setIframeLoading(false)}
                referrerPolicy="no-referrer"
              />
              <div style={{ marginTop: 8 }}>
                <Alert
                  type="info"
                  showIcon
                  message="If the invoice does not display due to browser security settings, use 'Open in new tab'."
                />
              </div>
            </div>
          ) : (
            <Alert type="error" message="Missing invoice URL" />
          )}
        </Modal>
        {lastInvoice?.url && (
          <div style={{ marginTop: 12 }}>
            <Typography.Text>Latest invoice:</Typography.Text>{' '}
            <a href={lastInvoice.url} target="_blank" rel="noreferrer">{lastInvoice.url}</a>
          </div>
        )}
      </Card>
    </div>
  )
}
