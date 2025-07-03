<template>
  <div class="chatlog-page">
    <!-- 搜索表单 -->
    <div class="search-form">
      <el-form 
        ref="searchForm" 
        :model="searchParams" 
        label-width="100px"
        @submit.prevent="handleSearch"
      >
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="时间范围">
              <el-date-picker
                v-model="dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="聊天对象">
              <el-input
                v-model="searchParams.talker"
                placeholder="输入微信ID、群聊ID、备注名、昵称等"
                clearable
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="关键词">
              <el-input
                v-model="searchParams.keyword"
                placeholder="搜索消息内容"
                clearable
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="数据格式">
              <el-select v-model="searchParams.format" style="width: 100%">
                <el-option label="JSON" value="json" />
                <el-option label="CSV" value="csv" />
                <el-option label="纯文本" value="text" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="每页数量">
              <el-select v-model="searchParams.limit" style="width: 100%">
                <el-option label="20条" :value="20" />
                <el-option label="50条" :value="50" />
                <el-option label="100条" :value="100" />
                <el-option label="200条" :value="200" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item>
              <el-button type="primary" @click="handleSearch" :loading="loading">
                <el-icon><Search /></el-icon>
                搜索
              </el-button>
              <el-button @click="handleReset">
                <el-icon><Refresh /></el-icon>
                重置
              </el-button>
              <el-button 
                type="success" 
                @click="handleExport"
                :disabled="!chatLogs.length"
              >
                <el-icon><Download /></el-icon>
                导出
              </el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </div>

    <!-- 聊天记录列表 -->
    <div class="card">
      <div class="card-header">
        <h3>聊天记录 ({{ total }} 条)</h3>
      </div>
      <div class="card-body">
        <div v-if="loading" class="loading">
          <el-skeleton :rows="10" animated />
        </div>
        <div v-else-if="!chatLogs.length" class="empty-state">
          <el-empty description="暂无聊天记录" />
        </div>
        <div v-else class="chat-messages">
          <div 
            v-for="(message, index) in chatLogs" 
            :key="index"
            class="chat-message"
          >
            <div class="message-header">
              <div class="message-sender">
                <el-avatar :size="32" class="sender-avatar">
                  {{ getSenderInitial(message.senderName) }}
                </el-avatar>
                <span class="sender-name">{{ message.senderName || '未知' }}</span>
                <el-tag 
                  v-if="message.senderId" 
                  size="small" 
                  type="info"
                  class="talker-tag"
                >
                  {{ message.senderId }}
                </el-tag>
              </div>
              <div class="message-time">
                {{ formatTime(message.time) }}
              </div>
            </div>
            <div class="message-content">
              <!-- 解析消息内容中的多媒体格式 -->
              <div v-if="message.content && message.content.includes('![图片]')" class="text-message">
                <div v-html="parseMediaContent(message.content)"></div>
              </div>
              <div v-else-if="message.content && message.content.includes('![视频]')" class="text-message">
                <div v-html="parseMediaContent(message.content)"></div>
              </div>
              <div v-else-if="message.content && message.content.includes('![语音]')" class="text-message">
                <div v-html="parseMediaContent(message.content)"></div>
              </div>
              <div v-else-if="message.content && message.content.includes('![文件]')" class="text-message">
                <div v-html="parseMediaContent(message.content)"></div>
              </div>
              <div v-else class="text-message">
                {{ message.content || '空消息' }}
              </div>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="chatLogs.length" class="pagination">
          <el-pagination
            v-model:current-page="currentPage"
            :page-size="searchParams.limit"
            :page-sizes="[20, 50, 100, 200]"
            :total="total"
            layout="total, sizes, prev, pager, next, jumper"
            @current-change="handlePageChange"
            @size-change="handleSizeChange"
          />
        </div>
      </div>
    </div>

    <!-- 图片预览对话框 -->
    <el-dialog
      v-model="imagePreviewVisible"
      title="图片预览"
      width="50%"
    >
      <img 
        :src="previewImageUrl"
        style="width: 100%; max-height: 500px; object-fit: contain;"
        alt="预览图片"
      />
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import { saveAs } from 'file-saver'
import api from '@/api'

export default {
  name: 'ChatLog',
  setup() {
    const store = useStore()
    const loading = ref(false)
    const dateRange = ref(['', ''])
    const searchParams = reactive({
      time: '',
      talker: '',
      keyword: '',
      format: 'json',
      limit: 20,
      offset: 0
    })
    const currentPage = ref(1)
    const total = ref(0)
    const chatLogs = ref([])
    const imagePreviewVisible = ref(false)
    const previewImageUrl = ref('')

    // 搜索聊天记录
    const handleSearch = async () => {
      loading.value = true
      try {
        // 构建时间参数
        let timeParam = ''
        if (dateRange.value[0] && dateRange.value[1]) {
          timeParam = `${dateRange.value[0]}~${dateRange.value[1]}`
        }

        const params = {
          ...searchParams,
          time: timeParam,
          offset: (currentPage.value - 1) * searchParams.limit
        }

        // 移除空参数
        Object.keys(params).forEach(key => {
          if (!params[key] && params[key] !== 0) {
            delete params[key]
          }
        })

        console.log('查询参数:', params)

        const response = await api.getChatLogs(params)
        chatLogs.value = response.data || []
        
        // 修复分页：如果API没有返回总数，则估算总数
        const responseTotal = response.headers['x-total-count'] || response.headers['X-Total-Count']
        if (responseTotal) {
          total.value = parseInt(responseTotal)
        } else {
          // 如果没有总数信息，根据返回的数据估算
          if (chatLogs.value.length === searchParams.limit) {
            // 如果返回的数据等于limit，说明可能还有更多数据
            total.value = (currentPage.value - 1) * searchParams.limit + chatLogs.value.length + 1
          } else {
            // 如果返回的数据少于limit，说明这是最后一页
            total.value = (currentPage.value - 1) * searchParams.limit + chatLogs.value.length
          }
        }
        
        console.log('查询结果:', chatLogs.value.length, '条记录，总数:', total.value)
        
        if (chatLogs.value.length === 0) {
          ElMessage.info('未找到匹配的聊天记录')
        } else {
          ElMessage.success(`找到 ${chatLogs.value.length} 条记录`)
        }
      } catch (error) {
        console.error('查询聊天记录失败:', error)
        ElMessage.error('查询聊天记录失败: ' + error.message)
      } finally {
        loading.value = false
      }
    }

    // 重置搜索条件
    const handleReset = () => {
      dateRange.value = ['', '']
      searchParams.time = ''
      searchParams.talker = ''
      searchParams.keyword = ''
      searchParams.format = 'json'
      searchParams.limit = 20
      currentPage.value = 1
      chatLogs.value = []
      total.value = 0
    }

    // 导出聊天记录
    const handleExport = async () => {
      try {
        console.log('开始导出聊天记录...')
        
        // 构建时间参数
        let timeParam = ''
        if (dateRange.value[0] && dateRange.value[1]) {
          timeParam = `${dateRange.value[0]}~${dateRange.value[1]}`
        }

        const params = {
          time: timeParam,
          talker: searchParams.talker,
          keyword: searchParams.keyword,
          format: 'csv',
          limit: 5000 // 导出时增加限制，避免数据过大
        }

        // 移除空参数
        Object.keys(params).forEach(key => {
          if (!params[key] && params[key] !== 0) {
            delete params[key]
          }
        })

        console.log('导出参数:', params)

        // 使用原始API调用，不进行解析
        const response = await api.getChatLogsRaw(params)
        console.log('导出响应:', response.data)
        
        // 处理响应数据
        let csvData = response.data
        if (typeof csvData === 'object') {
          // 如果返回的是对象，转换为CSV格式
          csvData = convertToCsv(csvData)
        } else if (typeof csvData !== 'string') {
          csvData = String(csvData)
        }
        
        // 创建Blob并下载
        const blob = new Blob([csvData], { 
          type: 'text/csv;charset=utf-8' 
        })
        const filename = `聊天记录_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.csv`
        saveAs(blob, filename)
        ElMessage.success('导出成功')
      } catch (error) {
        console.error('导出失败:', error)
        ElMessage.error('导出失败: ' + error.message)
      }
    }

    // 将对象数组转换为CSV格式
    const convertToCsv = (data) => {
      if (!Array.isArray(data) || data.length === 0) {
        return '发送者,时间,内容\n'
      }
      
      const headers = ['发送者', '时间', '内容']
      const csvHeaders = headers.join(',') + '\n'
      
      const csvRows = data.map(item => {
        const sender = item.senderName || item.sender || '未知'
        const time = item.time || item.timestamp || ''
        const content = (item.content || '').replace(/"/g, '""').replace(/,/g, '，')
        return `"${sender}","${time}","${content}"`
      }).join('\n')
      
      return csvHeaders + csvRows
    }

    // 解析消息内容中的多媒体格式
    const parseMediaContent = (content) => {
      if (!content) return ''
      
      let parsedContent = content
      
      // 解析图片 ![图片](url)
      parsedContent = parsedContent.replace(/!\[图片\]\((.*?)\)/g, (match, url) => {
        return `<img src="${url}" style="max-width: 200px; max-height: 200px; cursor: pointer; border-radius: 4px;" onclick="window.open('${url}', '_blank')" alt="图片" />`
      })
      
      // 解析视频 ![视频](url)
      parsedContent = parsedContent.replace(/!\[视频\]\((.*?)\)/g, (match, url) => {
        return `<video src="${url}" controls style="max-width: 300px; max-height: 200px; border-radius: 4px;" /></video>`
      })
      
      // 解析语音 ![语音](url)
      parsedContent = parsedContent.replace(/!\[语音\]\((.*?)\)/g, (match, url) => {
        return `<audio src="${url}" controls style="max-width: 300px;" /></audio>`
      })
      
      // 解析文件 ![文件](url)
      parsedContent = parsedContent.replace(/!\[文件\]\((.*?)\)/g, (match, url) => {
        const fileName = url.split('/').pop() || '文件'
        return `<a href="${url}" target="_blank" style="color: #409eff; text-decoration: none;">📁 ${fileName}</a>`
      })
      
      // 解析HTTP链接
      parsedContent = parsedContent.replace(/(https?:\/\/[^\s]+)/g, (match, url) => {
        return `<a href="${url}" target="_blank" style="color: #409eff; text-decoration: none;">${url}</a>`
      })
      
      return parsedContent
    }

    // 分页处理
    const handlePageChange = (page) => {
      currentPage.value = page
      handleSearch()
    }

    // 页面大小改变处理
    const handleSizeChange = (size) => {
      searchParams.limit = size
      currentPage.value = 1
      handleSearch()
    }

    // 获取多媒体URL
    const getMediaUrl = (type, id) => {
      switch (type) {
        case 'image':
          return api.getImageUrl(id)
        case 'video':
          return api.getVideoUrl(id)
        case 'voice':
          return api.getVoiceUrl(id)
        case 'file':
          return api.getFileUrl(id)
        default:
          return ''
      }
    }

    // 图片预览
    const previewImage = (imageId) => {
      previewImageUrl.value = api.getImageUrl(imageId)
      imagePreviewVisible.value = true
    }

    // 下载文件
    const downloadFile = (fileId) => {
      const url = api.getFileUrl(fileId)
      window.open(url, '_blank')
    }

    // 获取发送者首字母
    const getSenderInitial = (sender) => {
      if (!sender) return '?'
      return sender.charAt(0).toUpperCase()
    }

    // 格式化时间
    const formatTime = (time) => {
      return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
    }

    return {
      loading,
      dateRange,
      searchParams,
      currentPage,
      total,
      chatLogs,
      imagePreviewVisible,
      previewImageUrl,
      handleSearch,
      handleReset,
      handleExport,
      handlePageChange,
      getMediaUrl,
      previewImage,
      downloadFile,
      getSenderInitial,
      formatTime,
      parseMediaContent
    }
  }
}
</script>

<style scoped>
.chatlog-page {
  padding: 20px;
}

.chat-messages {
  max-height: 600px;
  overflow-y: auto;
}

.chat-message {
  padding: 15px;
  border-bottom: 1px solid #e4e7ed;
  transition: background-color 0.3s;
}

.chat-message:hover {
  background-color: #f8f9fa;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.message-sender {
  display: flex;
  align-items: center;
}

.sender-avatar {
  margin-right: 10px;
}

.sender-name {
  font-weight: 600;
  color: #409eff;
  margin-right: 10px;
}

.talker-tag {
  margin-left: 10px;
}

.message-time {
  color: #909399;
  font-size: 12px;
}

.message-content {
  line-height: 1.6;
}

.text-message {
  word-wrap: break-word;
}

.message-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s;
}

.message-image:hover {
  transform: scale(1.05);
}

.message-video {
  max-width: 300px;
  max-height: 200px;
  border-radius: 8px;
}

.message-audio {
  width: 100%;
  max-width: 300px;
}

.file-message {
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 4px;
  display: inline-block;
}

.other-message {
  padding: 10px;
  background-color: #fff3cd;
  border-radius: 4px;
  border-left: 4px solid #ffc107;
}

.pagination {
  margin-top: 20px;
  text-align: center;
}

.empty-state {
  text-align: center;
  padding: 50px;
}

.loading {
  padding: 20px;
}

@media (max-width: 768px) {
  .message-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .message-sender {
    margin-bottom: 5px;
  }
  
  .message-image,
  .message-video {
    max-width: 100%;
  }
}
</style> 