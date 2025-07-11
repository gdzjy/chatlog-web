const express = require('express')
const cors = require('cors')
const path = require('path')

const app = express()
const PORT = 5030

// 启用CORS
app.use(cors())
app.use(express.json())

// Mock数据
const mockData = {
  // 模拟聊天记录数据
  chatLogs: [
    {
      senderName: "张三",
      senderId: "user001",
      time: "2024-01-15 09:30:00",
      content: "早上好！今天天气不错",
      timestamp: 1705282200000
    },
    {
      senderName: "李四",
      senderId: "user002", 
      time: "2024-01-15 09:35:00",
      content: "是的，阳光很好",
      timestamp: 1705282500000
    },
    {
      senderName: "王五",
      senderId: "user003",
      time: "2024-01-15 10:00:00",
      content: "今天有什么安排吗？",
      timestamp: 1705284000000
    },
    {
      senderName: "张三",
      senderId: "user001",
      time: "2024-01-15 10:05:00", 
      content: "准备去开会",
      timestamp: 1705284300000
    },
    {
      senderName: "小组群",
      senderId: "group001",
      time: "2024-01-15 10:30:00",
      content: "大家记得参加下午的会议",
      timestamp: 1705285800000
    }
  ],

  // 模拟联系人数据
  contacts: [
    { name: "张三", wxid: "user001", remark: "同事", phone: "13800138001" },
    { name: "李四", wxid: "user002", remark: "朋友", phone: "13800138002" },
    { name: "王五", wxid: "user003", remark: "同学", phone: "13800138003" },
    { name: "赵六", wxid: "user004", remark: "同事", phone: "13800138004" }
  ],

  // 模拟群聊数据
  chatrooms: [
    { name: "工作群", roomid: "group001", member_count: "15", owner: "张三" },
    { name: "同学群", roomid: "group002", member_count: "30", owner: "李四" },
    { name: "家人群", roomid: "group003", member_count: "8", owner: "王五" }
  ],

  // 模拟会话数据
  sessions: [
    { name: "张三", id: "user001", lastMessageTime: "2024-01-15 10:05:00", displayName: "张三" },
    { name: "工作群", id: "group001", lastMessageTime: "2024-01-15 10:30:00", displayName: "工作群" },
    { name: "李四", id: "user002", lastMessageTime: "2024-01-15 09:35:00", displayName: "李四" },
    { name: "同学群", id: "group002", lastMessageTime: "2024-01-15 08:00:00", displayName: "同学群" }
  ]
}

// API 路由

// 聊天记录查询
app.get('/api/v1/chatlog', (req, res) => {
  console.log('API请求 - 聊天记录查询:', req.query)
  
  let { time, talker, keyword, format = 'json', limit = 20, offset = 0 } = req.query
  limit = parseInt(limit)
  offset = parseInt(offset)
  
  let filteredLogs = [...mockData.chatLogs]
  
  // 时间范围过滤
  if (time) {
    const [startDate, endDate] = time.split('~')
    if (startDate && endDate) {
      const start = new Date(startDate).getTime()
      const end = new Date(endDate + ' 23:59:59').getTime()
      filteredLogs = filteredLogs.filter(log => {
        const logTime = new Date(log.time).getTime()
        return logTime >= start && logTime <= end
      })
    }
  }
  
  // 聊天对象过滤
  if (talker) {
    const talkers = talker.split(',')
    filteredLogs = filteredLogs.filter(log => 
      talkers.some(t => log.senderName.includes(t) || log.senderId.includes(t))
    )
  }
  
  // 关键词过滤
  if (keyword) {
    const keywords = keyword.split(/[,|]/)
    filteredLogs = filteredLogs.filter(log =>
      keywords.some(k => log.content.includes(k.trim()))
    )
  }
  
  // 分页
  const total = filteredLogs.length
  const pagedLogs = filteredLogs.slice(offset, offset + limit)
  
  // 设置总数头部
  res.set('X-Total-Count', total.toString())
  
  if (format === 'csv') {
    // 返回CSV格式
    const csv = 'senderName,senderId,time,content\n' + 
      pagedLogs.map(log => `"${log.senderName}","${log.senderId}","${log.time}","${log.content}"`).join('\n')
    res.type('text/csv').send(csv)
  } else {
    // 返回JSON格式的原始文本数据（模拟实际API行为）
    const textData = pagedLogs.map(log => 
      `${log.senderName}(${log.senderId}) ${log.time}\n${log.content}`
    ).join('\n\n')
    res.type('text/plain').send(textData)
  }
})

// 联系人列表
app.get('/api/v1/contact', (req, res) => {
  console.log('API请求 - 联系人列表')
  
  const csv = 'name,wxid,remark,phone\n' + 
    mockData.contacts.map(c => `"${c.name}","${c.wxid}","${c.remark}","${c.phone}"`).join('\n')
  res.type('text/csv').send(csv)
})

// 群聊列表  
app.get('/api/v1/chatroom', (req, res) => {
  console.log('API请求 - 群聊列表')
  
  const csv = 'name,roomid,member_count,owner\n' +
    mockData.chatrooms.map(c => `"${c.name}","${c.roomid}","${c.member_count}","${c.owner}"`).join('\n')
  res.type('text/csv').send(csv)
})

// 会话列表
app.get('/api/v1/session', (req, res) => {
  console.log('API请求 - 会话列表')
  
  const textData = mockData.sessions.map(s => 
    `${s.name}(${s.id}) ${s.lastMessageTime}`
  ).join('\n')
  res.type('text/plain').send(textData)
})

// 多媒体文件路由（返回占位符）
app.get('/image/:id', (req, res) => {
  res.redirect('https://via.placeholder.com/200x200/409eff/ffffff?text=Image')
})

app.get('/video/:id', (req, res) => {
  res.status(404).send('Video not found')
})

app.get('/voice/:id', (req, res) => {
  res.status(404).send('Voice not found')
})

app.get('/file/:id', (req, res) => {
  res.status(404).send('File not found')
})

app.get('/data/:path', (req, res) => {
  res.status(404).send('Data not found')
})

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mock server is running' })
})

// 启动服务器
app.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 Mock API 服务器已启动`)
  console.log(`📡 监听地址: http://127.0.0.1:${PORT}`)
  console.log(`✅ 可用接口:`)
  console.log(`   - GET /api/v1/chatlog - 聊天记录查询`)
  console.log(`   - GET /api/v1/contact - 联系人列表`)
  console.log(`   - GET /api/v1/chatroom - 群聊列表`)  
  console.log(`   - GET /api/v1/session - 会话列表`)
  console.log(`   - GET /health - 健康检查`)
  console.log(``)
  console.log(`💡 提示: 这是一个模拟服务器，提供演示数据`)
  console.log(`🔧 如需真实数据，请安装并启动 chatlog 后端服务`)
})

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('🛑 正在关闭Mock服务器...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭Mock服务器...')
  process.exit(0)
})