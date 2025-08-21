import React, { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Dropdown, Menu, Space, Typography, Drawer, Layout } from 'antd'
import { 
  MenuOutlined, 
  BellOutlined, 
  LogoutOutlined, 
  DashboardOutlined, 
  DollarOutlined, 
  SwapOutlined, 
  TeamOutlined,
  UserOutlined
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { db, auth } from '../../firebase.js'
import { signOut } from 'firebase/auth'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import './AdminHeader.css'

export default function AdminHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const [pendingDeposits, setPendingDeposits] = useState([])
  const [pendingWithdrawals, setPendingWithdrawals] = useState([])
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false)
  const { Header } = Layout
  
  const menuItems = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard', path: '/admin' },
    { key: 'deposits', icon: <DollarOutlined />, label: 'Deposits', path: '/admin/deposits' },
    { key: 'withdrawals', icon: <SwapOutlined />, label: 'Withdrawals', path: '/admin/withdrawals' },
    { key: 'users', icon: <TeamOutlined />, label: 'Users', path: '/admin/users' },
    { key: 'settings', icon: <UserOutlined />, label: 'Settings', path: '/admin/settings' },
  ]

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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/admin/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <Header className="admin-header">
      <div className="admin-header-container">
        <div className="logo">
          <Button 
            type="text" 
            icon={<MenuOutlined />} 
            className="menu-trigger"
            onClick={() => setMobileMenuVisible(true)}
          />
          <Typography.Title level={4} className="title">Admin Panel</Typography.Title>
        </div>
        
        <Space className="desktop-nav">
          {menuItems.map(item => (
            <Button 
              key={item.key}
              type={location.pathname === item.path ? 'primary' : 'text'}
              icon={item.icon}
              onClick={() => navigate(item.path)}
              className="nav-button"
            >
              {item.label}
            </Button>
          ))}
        </Space>

        <Space className="header-actions">
          <Dropdown overlay={menu} trigger={['click']} overlayStyle={{ width: 320 }}>
            <Badge count={unreadCount} size="small">
              <Button type="text" className="action-button" icon={<BellOutlined />} />
            </Badge>
          </Dropdown>
          <Button 
            type="text" 
            className="action-button"
            icon={<LogoutOutlined />} 
            onClick={handleLogout} 
          />
        </Space>
      </div>

      {/* Mobile Drawer Navigation */}
      <Drawer
        title="Admin Menu"
        placement="left"
        closable={true}
        onClose={() => setMobileMenuVisible(false)}
        open={mobileMenuVisible}
        width={250}
        className="mobile-drawer"
      >
        <div className="mobile-menu">
          {menuItems.map(item => (
            <Button 
              key={item.key}
              type={location.pathname === item.path ? 'primary' : 'text'}
              icon={item.icon}
              onClick={() => {
                navigate(item.path)
                setMobileMenuVisible(false)
              }}
              block
              className="mobile-menu-item"
            >
              {item.label}
            </Button>
          ))}
          <div className="mobile-user-info">
            <UserOutlined />
            <span>{auth.currentUser?.email || 'Admin'}</span>
          </div>
        </div>
      </Drawer>
    </Header>
  )
}
