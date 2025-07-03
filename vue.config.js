const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
  
  // 开发服务器配置
  devServer: {
    port: 8080,
    host: '0.0.0.0',
    https: false,
    open: true,
    proxy: {
      // API请求代理
      '/api': {
        target: 'http://127.0.0.1:5030',
        changeOrigin: true,
        ws: true,
        pathRewrite: {
          '^/api': '/api'
        }
      },
      // 图片文件代理
      '/image': {
        target: 'http://127.0.0.1:5030',
        changeOrigin: true,
        pathRewrite: {
          '^/image': '/image'
        }
      },
      // 视频文件代理
      '/video': {
        target: 'http://127.0.0.1:5030',
        changeOrigin: true,
        pathRewrite: {
          '^/video': '/video'
        }
      },
      // 语音文件代理
      '/voice': {
        target: 'http://127.0.0.1:5030',
        changeOrigin: true,
        pathRewrite: {
          '^/voice': '/voice'
        }
      },
      // 普通文件代理
      '/file': {
        target: 'http://127.0.0.1:5030',
        changeOrigin: true,
        pathRewrite: {
          '^/file': '/file'
        }
      },
      // 数据文件代理
      '/data': {
        target: 'http://127.0.0.1:5030',
        changeOrigin: true,
        pathRewrite: {
          '^/data': '/data'
        }
      }
    }
  },
  
  // 生产环境配置
  publicPath: process.env.NODE_ENV === 'production' ? './' : '/',
  outputDir: 'dist',
  assetsDir: 'static',
  
  // 链式操作配置
  chainWebpack: config => {
    // 设置页面标题
    config.plugin('html').tap(args => {
      args[0].title = '聊天记录管理系统'
      return args
    })
    
    // 优化分包
    config.optimization.splitChunks({
      chunks: 'all',
      cacheGroups: {
        vendor: {
          name: 'vendor',
          test: /[\\/]node_modules[\\/]/,
          priority: 10,
          chunks: 'all'
        },
        elementPlus: {
          name: 'element-plus',
          test: /[\\/]node_modules[\\/]element-plus[\\/]/,
          priority: 20,
          chunks: 'all'
        }
      }
    })
  },
  
  // CSS 配置
  css: {
    extract: process.env.NODE_ENV === 'production',
    sourceMap: false,
    loaderOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    }
  },
  
  // PWA 配置（可选）
  pwa: {
    name: '聊天记录管理系统',
    themeColor: '#409eff',
    msTileColor: '#409eff',
    manifestOptions: {
      background_color: '#409eff'
    }
  },
  
  // 性能优化
  configureWebpack: {
    optimization: {
      minimize: process.env.NODE_ENV === 'production'
    }
  }
}) 