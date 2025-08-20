import React from 'react'
import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import { auth } from '../firebase.js'

export default function AdminRoute({ children }) {
  const user = useSelector((s) => s.auth.user)
  const adminSession = typeof window !== 'undefined' ? localStorage.getItem('adminSession') === '1' : false
  const isReduxAdmin = !!user && user.role === 'admin'

  const fbUser = auth.currentUser
  if (!fbUser && !adminSession && !isReduxAdmin) {
    return <Navigate to="/admin/auth" replace />
  }
  // If Firebase user exists but Redux user hasn't loaded yet, show spinner
  if (fbUser && user === null && !adminSession) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <Spin tip="Loading admin..." />
      </div>
    )
  }
  // If Redux user loaded and not admin, block access
  if (user && !isReduxAdmin && !adminSession) {
    return <Navigate to="/" replace />
  }
  return children
}
