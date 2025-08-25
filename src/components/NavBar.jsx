import React, { useState } from 'react'
import { Menu, Button, Drawer } from 'antd'
import { MenuOutlined } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logout } from '../features/authSlice.js'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase.js'

export default function NavBar() {
  const user = useSelector((s) => s.auth.user)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const onLogout = async () => {
    try {
      await signOut(auth)
    } finally {
      dispatch(logout())
      navigate('/login')
    }
  }

  const menuItems = [
    { key: 'home', label: <Link to="/">Home</Link> },
    { key: 'trade', label: <Link to="/trade">Trade</Link> },
    { key: 'deposit', label: <Link to="/deposit">Deposit</Link> },
    { key: 'withdraw', label: <Link to="/withdraw">Withdraw</Link> },
    { key: 'transfer', label: <Link to="/transfer">Transfer</Link> },
    { key: 'paymentMethods', label: <Link to="/payment-methods">Payment Methods</Link> },
    {
      key: 'p2p',
      label: 'P2P',
      children: [
        { key: 'p2pMarket', label: <Link to="/p2p/market">Market</Link> },
        { key: 'p2pCreate', label: <Link to="/p2p/create-listing">Create Listing</Link> },
        { key: 'p2pMyOrders', label: <Link to="/p2p/my-orders">My Orders</Link> },
      ],
    },
    { key: 'history', label: <Link to="/history">History</Link> },
    { key: 'news', label: <Link to="/news">News</Link> },
    { key: 'instructions', label: <Link to="/instructions">Instructions</Link> },
  ]

  if (user?.role === 'admin') {
    menuItems.push({
      key: 'admin',
      label: 'Admin',
      children: [
        { key: 'admindash', label: <Link to="/admin">Dashboard</Link> },
        { key: 'admindep', label: <Link to="/admin/deposits">Deposits</Link> },
        { key: 'adminwith', label: <Link to="/admin/withdrawals">Withdrawals</Link> },
        { key: 'adminnews', label: <Link to="/admin/news">News</Link> },
      ],
    })
  }

  const userActions = (
    user ? (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ opacity: 0.85 }}>Hi, {user.email || user.phoneNumber}</span>
        <Button onClick={onLogout}>Logout</Button>
      </div>
    ) : (
      <div style={{ display: 'flex', gap: 8 }}>
        <Button type="primary"><Link to="/login">Login</Link></Button>
        <Button><Link to="/signup">Signup</Link></Button>
      </div>
    )
  )

  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', gap: 16, height: 56, borderBottom: '1px solid var(--colorBorder, #1f2329)' }}>
      <div style={{ fontWeight: 800, fontSize: 20, fontFamily: 'Poppins, system-ui' }}><Link to="/">Trading App</Link></div>

      {/* Desktop menu */}
      <div className="nav-desktop" style={{ flex: 1 }}>
        <Menu mode="horizontal" selectable={false} items={menuItems} style={{ borderBottom: 'none' }} />
      </div>

      <div className="nav-actions-desktop">{userActions}</div>

      {/* Mobile toggle */}
      <Button className="nav-toggle" icon={<MenuOutlined />} onClick={() => setOpen(true)} />

      <Drawer
        open={open}
        placement="left"
        onClose={() => setOpen(false)}
        title={<div style={{ fontWeight: 700 }}>Menu</div>}
        bodyStyle={{ padding: 0 }}
      >
        <Menu
          mode="inline"
          selectable={false}
          items={menuItems}
          onClick={() => setOpen(false)}
          style={{ borderInlineEnd: 'none' }}
        />
        <div style={{ padding: 16, borderTop: '1px solid var(--colorBorder, #1f2329)' }}>
          {userActions}
        </div>
      </Drawer>
    </div>
  )
}
