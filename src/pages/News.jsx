import React from 'react'
import { Card, List, Typography } from 'antd'

export default function News() {
  // TODO: Replace with Firestore query ordered by createdAt desc
  const news = [
    { id: '1', title: 'Welcome', body: 'Daily updates will appear here', createdAt: new Date().toISOString() },
  ]
  return (
    <div className="container">
      <Card>
        <Typography.Title level={3}>News</Typography.Title>
        <List
          itemLayout="vertical"
          dataSource={news}
          renderItem={(item) => (
            <List.Item key={item.id}>
              <List.Item.Meta title={item.title} description={new Date(item.createdAt).toLocaleString()} />
              <div>{item.body}</div>
            </List.Item>
          )}
        />
      </Card>
    </div>
  )
}
