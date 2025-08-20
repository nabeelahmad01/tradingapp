import React from 'react'
import { Card, Row, Col, Statistic } from 'antd'
import AdminHeader from '../../components/admin/AdminHeader.jsx'
import { db } from '../../firebase.js'
import { collection, onSnapshot, query, where } from 'firebase/firestore'

export default function AdminDashboard() {
  const [pendingDeposits, setPendingDeposits] = React.useState(0)
  const [pendingWithdrawals, setPendingWithdrawals] = React.useState(0)
  const [usersCount, setUsersCount] = React.useState(0)

  React.useEffect(() => {
    const unsubDeps = onSnapshot(query(collection(db, 'deposits'), where('status', '==', 'pending')), (snap) => setPendingDeposits(snap.size))
    const unsubWdrs = onSnapshot(query(collection(db, 'withdrawals'), where('status', '==', 'pending')), (snap) => setPendingWithdrawals(snap.size))
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => setUsersCount(snap.size))
    return () => { unsubDeps(); unsubWdrs(); unsubUsers() }
  }, [])

  return (
    <div className="container">
      <AdminHeader />
      <Row gutter={[16,16]}>
        <Col xs={24} md={8}><Card><Statistic title="Pending Deposits" value={pendingDeposits} /></Card></Col>
        <Col xs={24} md={8}><Card><Statistic title="Pending Withdrawals" value={pendingWithdrawals} /></Card></Col>
        <Col xs={24} md={8}><Card><Statistic title="Users" value={usersCount} /></Card></Col>
      </Row>
    </div>
  )
}
