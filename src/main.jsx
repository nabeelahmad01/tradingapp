import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { ConfigProvider, App as AntdApp, theme as antdTheme } from 'antd'
import 'antd/dist/reset.css'
import './styles.css'
import App from './App.jsx'
import { store } from './store'

const container = document.getElementById('app')
const root = createRoot(container)
root.render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        algorithm: antdTheme.darkAlgorithm,
        token: {
          colorPrimary: '#16c784',
          colorSuccess: '#16c784',
          colorError: '#ea3943',
          colorBgBase: '#0b0e11',
          colorTextBase: '#d1d4dc',
          colorBgContainer: '#0e1116',
          colorBorder: '#1f2329',
          borderRadius: 8,
        },
      }}
    >
      <AntdApp>
        <Provider store={store}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </Provider>
      </AntdApp>
    </ConfigProvider>
  </React.StrictMode>
)
