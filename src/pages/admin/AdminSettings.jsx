import React, { useEffect, useState } from 'react'
import { Card, Form, InputNumber, Switch, Button, Space, message, Input, Select, Alert } from 'antd'
import AdminHeader from '../../components/admin/AdminHeader.jsx'
import { getSettingsOnce, onSettings, saveSettings } from '../../services/settings.js'

export default function AdminSettings() {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const unsub = onSettings((s) => {
      form.setFieldsValue({
        payoutPct: Number(s.payoutPct || 0),
        withdrawMin: Number(s.withdrawMin || 0),
        withdrawMaxPerDay: Number(s.withdrawMaxPerDay || 0),
        demoBalanceDefault: Number(s.demoBalanceDefault || 10000),
        kycRequired: !!s.kycRequired,
        withdrawCooldownHoursAfterDeposit: Number(s.withdrawCooldownHoursAfterDeposit || 0),
        withdrawMinTrades: Number(s.withdrawMinTrades || 0),
        withdrawMinVolumeUsd: Number(s.withdrawMinVolumeUsd || 0),
        withdrawMaxRequestsPerDay: Number(s.withdrawMaxRequestsPerDay || 0),
        withdrawProcessingETA: s.withdrawProcessingETA || '24-48 hours',
        defaultExchange: (s.defaultExchange || 'binance').toLowerCase(),
        paymentsProvider: (s.paymentsProvider || 'nowpayments'),
        supportedAssets: s.supportedAssets || [],
        flatWithdrawFeeUsd: Number(s.flatWithdrawFeeUsd || 0),
        cashAppEnabled: !!s.cashAppEnabled,
        cashAppCashtag: s.cashAppCashtag || '',
        cashAppNote: s.cashAppNote || 'Include your registered email in the Cash App note. Upload a screenshot after sending.',
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
          <Form.Item label="Default Exchange" name="defaultExchange" rules={[{ required: true }]}> 
            <Select
              options={[
                { label: 'Binance', value: 'binance' },
                { label: 'MEXC', value: 'mexc' },
              ]}
            />
          </Form.Item>
          <Form.Item label="Payments Provider" name="paymentsProvider" rules={[{ required: true }]} >
            <Select
              options={[
                { label: 'NOWPayments', value: 'nowpayments' },
                { label: 'Coinbase Commerce', value: 'coinbase_commerce' },
                { label: 'Manual - Cash App', value: 'manual_cashapp' },
              ]}
            />
          </Form.Item>
          <Alert style={{ marginBottom: 12 }} type="info" showIcon message="Manual Cash App is a screenshot-based flow. You must verify and approve deposits in Admin Deposits." />
          <Form.Item label="Enable Cash App" name="cashAppEnabled" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Cash App Cashtag (e.g., $YourTag)" name="cashAppCashtag">
            <Input placeholder="$YourTag" />
          </Form.Item>
          <Form.Item label="Cash App Instructions Shown To Users" name="cashAppNote">
            <Input.TextArea rows={3} placeholder="Instruction text shown on Deposit page" />
          </Form.Item>
          <Form.Item label="Supported Assets" name="supportedAssets" rules={[{ required: true }]} >
            <Select mode="tags" tokenSeparators={[',']}
              placeholder="Add assets e.g. USDT-TRC20, BTC" />
          </Form.Item>
          <Form.Item label="Payout % (user win payout)" name="payoutPct" rules={[{ required: true }]}> 
            <InputNumber min={50} max={98} step={0.5} addonAfter="%" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Flat Withdrawal Fee ($)" name="flatWithdrawFeeUsd" rules={[{ required: true }]}> 
            <InputNumber min={0} step={0.5} addonBefore="$" style={{ width: '100%' }} />
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
