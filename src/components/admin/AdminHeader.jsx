import React, { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Dropdown, Menu, Space, Typography } from 'antd'
import { BellOutlined, LogoutOutlined, DashboardOutlined, DollarOutlined, SwapOutlined, TeamOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { db, auth } from '../../firebase.js'
import { signOut } from 'firebase/auth'
import { collection, onSnapshot, query, where } from 'firebase/firestore'

export default function AdminHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const [pendingDeposits, setPendingDeposits] = useState([])
  const [pendingWithdrawals, setPendingWithdrawals] = useState([])

  useEffect(() => {
    const unsub1 = onSnapshot(
      query(collection(db, 'deposits'), where('status', '==', 'pending')),
      (snap) => setPendingDeposits(snap.docs.map((d) => ({ id: d.id, type: 'deposit', ...d.data() })))
    )
    const unsub2 = onSnapshot(
      query(collection(db, 'withdrawals'), where('status', '==', 'pending')),
      (snap) => setPendingWithdrawals(snap.docs.map((d) => ({ id: d.id, type: 'withdrawal', ...d.data() })))
    )
    return () => { unsub1(); unsub2() }
  }, [])

  // localStorage-based read/unread tracking for admin session
  const storageKey = 'admin_read_items'
  const [readSet, setReadSet] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(storageKey) || '[]')) } catch { return new Set() }
  })
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(Array.from(readSet)))
  }, [readSet])

  const notifications = useMemo(() => [...pendingDeposits, ...pendingWithdrawals].sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0)), [pendingDeposits, pendingWithdrawals])
  const unreadCount = notifications.filter(n => !readSet.has(`${n.type}:${n.id}`)).length

  const markAsRead = (n) => setReadSet((prev) => new Set(prev).add(`${n.type}:${n.id}`))
  const markAllRead = () => setReadSet((prev) => {
    const next = new Set(prev)
    notifications.forEach(n => next.add(`${n.type}:${n.id}`))
    return next
  })

  const menu = (
    <Menu
      items={[
        {
          key: 'header',
          label: (
            <Space style={{ display: 'flex', justifyContent: 'space-between', width: 280 }}>
              <Typography.Text strong>Notifications</Typography.Text>
              <Button size="small" type="link" onClick={markAllRead}>Mark all read</Button>
            </Space>
          )
        },
        ...notifications.map((n) => ({
          key: `${n.type}-${n.id}`,
          label: (
            <div onClick={() => markAsRead(n)}>
              <Space>
                <Badge status={readSet.has(`${n.type}:${n.id}`) ? 'default' : 'processing'} />
                <span>{n.type === 'deposit' ? 'Deposit' : 'Withdrawal'} • ${n.amount} • {n.email || n.uid?.slice(0,6)}</span>
              </Space>
            </div>
          )
        }))
      ]}
    />
  )

  const isActive = (path) => location.pathname === path

  const logout = async () => {
    try { await signOut(auth) } catch {}
    localStorage.removeItem('adminSession')
    navigate('/admin/auth', { replace: true })
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', gap: 12, flexWrap: 'wrap' }}>
      <Space wrap>
        <Typography.Title level={4} style={{ margin: 0 }}>Admin Panel</Typography.Title>
        <Button type={isActive('/admin') ? 'primary' : 'default'} icon={<DashboardOutlined />} onClick={() => navigate('/admin')}>Dashboard</Button>
        <Button type={isActive('/admin/deposits') ? 'primary' : 'default'} icon={<DollarOutlined />} onClick={() => navigate('/admin/deposits')}>Deposits</Button>
        <Button type={isActive('/admin/withdrawals') ? 'primary' : 'default'} icon={<SwapOutlined />} onClick={() => navigate('/admin/withdrawals')}>Withdrawals</Button>
        <Button type={isActive('/admin/users') ? 'primary' : 'default'} icon={<TeamOutlined />} onClick={() => navigate('/admin/users')}>Users</Button>
      </Space>
      <Space>
        <Dropdown overlay={menu} trigger={['click']} placement="bottomRight">
          <Badge count={unreadCount} size="small">
            <Button icon={<BellOutlined />}>
              Notifications
            </Button>
          </Badge>
        </Dropdown>
        <Button danger icon={<LogoutOutlined />} onClick={logout}>Logout</Button>
      </Space>
    </div>
  )
}
