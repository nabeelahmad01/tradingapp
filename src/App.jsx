import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from 'antd'
import NavBar from './components/NavBar.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Deposit from './pages/Deposit.jsx'
import Withdraw from './pages/Withdraw.jsx'
import History from './pages/History.jsx'
import Transfer from './pages/Transfer.jsx'
import PaymentMethods from './pages/PaymentMethods.jsx'
import P2PCreateListing from './pages/p2p/CreateListing.jsx'
import P2PMarket from './pages/p2p/Market.jsx'
import P2PMyOrders from './pages/p2p/MyOrders.jsx'
import News from './pages/News.jsx'
import Instructions from './pages/Instructions.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminDeposits from './pages/admin/AdminDeposits.jsx'
import AdminWithdrawals from './pages/admin/AdminWithdrawals.jsx'
import AdminNews from './pages/admin/AdminNews.jsx'
import AdminLogin from './pages/admin/AdminLogin.jsx'
import AdminUsers from './pages/admin/AdminUsers.jsx'
import AdminSettings from './pages/admin/AdminSettings.jsx'
import ProtectedRoute from './routes/ProtectedRoute.jsx'
import AdminRoute from './routes/AdminRoute.jsx'
import Trading from './pages/Trading.jsx'
import { useDispatch } from 'react-redux'
import { setUser } from './features/authSlice.js'
import { auth, onAuthStateChanged } from './firebase.js'
import { getUserProfile, saveUserProfile } from './services/auth.js'

const { Header, Content, Footer } = Layout

export default function App() {
  const dispatch = useDispatch()

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        dispatch(setUser(null))
        return
      }
      const profile = (await getUserProfile(fbUser.uid)) || (await saveUserProfile(fbUser))
      const mapped = {
        uid: fbUser.uid,
        email: fbUser.email,
        phoneNumber: fbUser.phoneNumber,
        displayName: fbUser.displayName,
        role: profile?.role || 'user',
      }
      dispatch(setUser(mapped))
    })
    return () => unsub()
  }, [dispatch])
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#0b0e11', padding: 0, borderBottom: '1px solid #1f2329' }}>
        <NavBar />
      </Header>
      <Content style={{ padding: '16px' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route path="/trade" element={<Trading />} />
          <Route
            path="/deposit"
            element={
              <ProtectedRoute>
                <Deposit />
              </ProtectedRoute>
            }
          />
          <Route
            path="/withdraw"
            element={
              <ProtectedRoute>
                <Withdraw />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transfer"
            element={
              <ProtectedRoute>
                <Transfer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment-methods"
            element={
              <ProtectedRoute>
                <PaymentMethods />
              </ProtectedRoute>
            }
          />
          <Route
            path="/p2p/create-listing"
            element={
              <ProtectedRoute>
                <P2PCreateListing />
              </ProtectedRoute>
            }
          />
          <Route
            path="/p2p/market"
            element={
              <ProtectedRoute>
                <P2PMarket />
              </ProtectedRoute>
            }
          />
          <Route
            path="/p2p/my-orders"
            element={
              <ProtectedRoute>
                <P2PMyOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            }
          />
          <Route path="/news" element={<News />} />
          <Route path="/instructions" element={<Instructions />} />

          {/* Admin authentication route */}
          <Route path="/admin/auth" element={<AdminLogin />} />

          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/deposits"
            element={
              <AdminRoute>
                <AdminDeposits />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/withdrawals"
            element={
              <AdminRoute>
                <AdminWithdrawals />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <AdminUsers />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/news"
            element={
              <AdminRoute>
                <AdminNews />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <AdminRoute>
                <AdminSettings />
              </AdminRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Content>
      <Footer style={{ textAlign: 'center' }}>Trading App © {new Date().getFullYear()}</Footer>
    </Layout>
  )
}
