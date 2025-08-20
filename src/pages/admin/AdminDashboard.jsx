import React from 'react';
import { Card, Row, Col, Statistic, Typography, Space, Progress } from 'antd';
import { 
  ArrowUpOutlined, 
  ArrowDownOutlined, 
  UserOutlined,
  DollarOutlined,
  WalletOutlined,
  ArrowRightOutlined,
  RiseOutlined,
  FallOutlined,
  TeamOutlined
} from '@ant-design/icons';
import AdminHeader from '../../components/admin/AdminHeader.jsx'
import { db } from '../../firebase.js'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import './AdminDashboard.css'

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

  const stats = [
    {
      title: 'Pending Deposits',
      value: pendingDeposits,
      icon: <DollarOutlined style={{ color: '#1890ff' }} />,
      color: '#1890ff',
      prefix: '$',
      suffix: null,
      trend: 12.5,
      trendDirection: 'up'
    },
    {
      title: 'Pending Withdrawals',
      value: pendingWithdrawals,
      icon: <WalletOutlined style={{ color: '#52c41a' }} />,
      color: '#52c41a',
      prefix: '$',
      suffix: null,
      trend: 8.3,
      trendDirection: 'down'
    },
    {
      title: 'Total Users',
      value: usersCount,
      icon: <TeamOutlined style={{ color: '#722ed1' }} />,
      color: '#722ed1',
      prefix: null,
      suffix: null,
      trend: 5.2,
      trendDirection: 'up'
    }
  ]

  return (
    <div className="admin-dashboard">
      <AdminHeader />
      <div className="dashboard-content">
        <div className="dashboard-header">
          <Typography.Title level={3} className="dashboard-title">Dashboard Overview</Typography.Title>
          <div className="dashboard-actions">
            <span className="last-updated">Last updated: Just now</span>
          </div>
        </div>
        
        <Row gutter={[24, 24]} className="stats-row">
          {stats.map((stat, index) => (
            <Col key={index} xs={24} sm={12} lg={8}>
              <Card className="stat-card" hoverable>
                <div className="stat-icon" style={{ backgroundColor: `${stat.color}15` }}>
                  {stat.icon}
                </div>
                <div className="stat-content">
                  <div className="stat-title">
                    <span>{stat.title}</span>
                    {stat.trend && (
                      <span className={`trend ${stat.trendDirection}`}>
                        {stat.trendDirection === 'up' ? <RiseOutlined /> : <FallOutlined />}
                        {stat.trend}%
                      </span>
                    )}
                  </div>
                  <div className="stat-value" style={{ color: stat.color }}>
                    {stat.prefix}{stat.value.toLocaleString()}{stat.suffix}
                  </div>
                  <Progress 
                    percent={Math.min(stat.value * 2, 100)} 
                    showInfo={false} 
                    strokeColor={stat.color}
                    strokeWidth={3}
                    trailColor="#f0f0f0"
                  />
                </div>
              </Card>
            </Col>
          ))}
        </Row>
        
        {/* Recent Activity Section */}
        <Card 
          className="recent-activity"
          title={
            <Space align="center">
              <WalletOutlined style={{ fontSize: '16px' }} />
              <span style={{ fontSize: '16px' }}>Recent Activity</span>
            </Space>
          }
          headStyle={{ padding: '0 16px' }}
          bodyStyle={{ padding: '16px' }}
        >
          <div className="activity-placeholder">
            <Typography.Text type="secondary" style={{ fontSize: '14px' }}>
              Recent transactions and activities will appear here
            </Typography.Text>
          </div>
        </Card>
      </div>
    </div>
  )
}
