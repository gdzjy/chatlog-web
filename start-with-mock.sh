#!/bin/bash

echo "🚀 启动 Chatlog Web (带 Mock 服务器)"
echo "===================================="

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js (版本 >= 14.0)"
    exit 1
fi

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 正在安装依赖..."
    npm install
fi

# 检查Mock服务器依赖
if ! npm list express &> /dev/null || ! npm list cors &> /dev/null; then
    echo "📦 正在安装 Mock 服务器依赖..."
    npm install express cors
fi

echo ""
echo "🔧 启动 Mock API 服务器..."

# 检查端口5030是否被占用
if lsof -Pi :5030 -sTCP:LISTEN -t > /dev/null; then
    echo "⚠️  端口 5030 已被占用，正在尝试关闭现有服务..."
    pkill -f "node mock-server.js" 2>/dev/null || true
    sleep 2
fi

# 启动Mock服务器 (后台运行)
nohup node mock-server.js > mock-server.log 2>&1 &
MOCK_PID=$!

echo "✅ Mock API 服务器已启动 (PID: $MOCK_PID)"
echo "📡 API 地址: http://127.0.0.1:5030"

# 等待服务器启动
echo "⏳ 等待服务器启动..."
sleep 3

# 验证服务器状态
if curl -f -s http://127.0.0.1:5030/health > /dev/null; then
    echo "✅ Mock 服务器运行正常"
else
    echo "❌ Mock 服务器启动失败，请检查日志: cat mock-server.log"
    exit 1
fi

echo ""
echo "🌐 启动前端开发服务器..."
echo "📍 访问地址: http://localhost:8080"
echo ""
echo "💡 提示:"
echo "   - Mock 服务器日志: tail -f mock-server.log"
echo "   - 停止 Mock 服务器: kill $MOCK_PID"
echo "   - 如需真实数据，请安装并启动 chatlog 后端服务"
echo ""

# 启动前端开发服务器
npm run serve