import React, { useEffect, useState } from 'react'
import { Card, Form, InputNumber, Switch, Button, Space, message, Input } from 'antd'
import AdminHeader from '../../components/admin/AdminHeader.jsx'
import { getSettingsOnce, onSettings, saveSettings } from '../../services/settings.js'

export default function AdminSettings() {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const unsub = onSettings((s) => {
      form.setFieldsValue({
        payoutPct: Number(s.payoutPct || 0),
        withdrawFeePct: Number(s.withdrawFeePct || 0),
        withdrawMin: Number(s.withdrawMin || 0),
        withdrawMaxPerDay: Number(s.withdrawMaxPerDay || 0),
        demoBalanceDefault: Number(s.demoBalanceDefault || 10000),
        kycRequired: !!s.kycRequired,
        withdrawCooldownHoursAfterDeposit: Number(s.withdrawCooldownHoursAfterDeposit || 0),
        withdrawMinTrades: Number(s.withdrawMinTrades || 0),
        withdrawMinVolumeUsd: Number(s.withdrawMinVolumeUsd || 0),
        withdrawMaxRequestsPerDay: Number(s.withdrawMaxRequestsPerDay || 0),
        withdrawProcessingETA: s.withdrawProcessingETA || '24-48 hours',
      })
    })
    return () => unsub && unsub()
  }, [form])

  const onFinish = async (values) => {
    setSaving(true)
    try {
      await saveSettings(values)
      message.success('Settings saved')
    } catch (e) {
      message.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container">
      <AdminHeader />
      <Card title="Platform Settings" style={{ maxWidth: 720 }}>
        <Form layout="vertical" form={form} onFinish={onFinish}>
          <Form.Item label="Payout % (user win payout)" name="payoutPct" rules={[{ required: true }]}> 
            <InputNumber min={50} max={98} step={0.5} addonAfter="%" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Withdrawal Fee %" name="withdrawFeePct" rules={[{ required: true }]}> 
            <InputNumber min={0} max={15} step={0.1} addonAfter="%" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Minimum Withdrawal ($)" name="withdrawMin" rules={[{ required: true }]}> 
            <InputNumber min={1} step={1} addonBefore="$" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Max Withdrawal Per Day ($)" name="withdrawMaxPerDay" rules={[{ required: true }]}> 
            <InputNumber min={0} step={10} addonBefore="$" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Default Demo Balance ($)" name="demoBalanceDefault" rules={[{ required: true }]}> 
            <InputNumber min={100} step={100} addonBefore="$" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="KYC Required for Withdrawals" name="kycRequired" valuePropName="checked"> 
            <Switch />
          </Form.Item>
          <Form.Item label="Cooldown After Deposit (hours)" name="withdrawCooldownHoursAfterDeposit" rules={[{ required: true }]}> 
            <InputNumber min={0} step={1} addonAfter="hours" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Minimum Trades Before Withdrawal" name="withdrawMinTrades" rules={[{ required: true }]}> 
            <InputNumber min={0} step={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Minimum Trading Volume ($)" name="withdrawMinVolumeUsd" rules={[{ required: true }]}> 
            <InputNumber min={0} step={10} addonBefore="$" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Max Withdrawal Requests Per Day" name="withdrawMaxRequestsPerDay" rules={[{ required: true }]}> 
            <InputNumber min={1} step={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Processing ETA Text" name="withdrawProcessingETA" rules={[{ required: true }]}> 
            <Input placeholder="e.g., 24-48 hours" />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={saving}>Save</Button>
            <Button htmlType="button" onClick={async()=>{
              const s = await getSettingsOnce();
              form.setFieldsValue(s)
            }}>Reset</Button>
          </Space>
        </Form>
      </Card>
    </div>
  )
}
