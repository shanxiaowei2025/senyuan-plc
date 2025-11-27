const { app, BrowserWindow, Menu, shell, dialog, Tray, nativeImage } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const fs = require('fs')

// 设置正确的模块路径（禁用asar后不需要特殊处理）
if (app.isPackaged) {
  // 禁用asar后，所有文件都在 resources/app 目录下
  const appPath = path.join(process.resourcesPath, 'app')
  process.env.NODE_PATH = path.join(appPath, 'node_modules')
  require('module').globalPaths.push(process.env.NODE_PATH)
}

let mainWindow
let serverProcess
let nextApp
let tray

const isDev = process.env.NODE_ENV === 'development'
const port = process.env.PORT || 3001

async function startNextServer() {
  try {
    console.log('🚀 正在启动Next.js服务器...')
    
    // 确定正确的应用目录（禁用asar后路径更简单）
    const appDir = app.isPackaged 
      ? path.join(process.resourcesPath, 'app')
      : __dirname
    
    console.log('应用目录:', appDir)
    console.log('是否打包:', app.isPackaged)
    console.log('资源路径:', process.resourcesPath)
    
    nextApp = next({ 
      dev: false, 
      hostname: 'localhost', 
      port,
      dir: appDir
    })
    
    const handle = nextApp.getRequestHandler()
    
    await nextApp.prepare()
    
    const server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true)
        await handle(req, res, parsedUrl)
      } catch (err) {
        console.error('处理请求时出错:', err)
        res.statusCode = 500
        res.end('服务器内部错误')
      }
    })
    
    server.listen(port, () => {
      console.log(`✅ 服务器已启动在端口 ${port}`)
      createWindow()
      createTray()
    })
    
    return server
  } catch (error) {
    console.error('启动服务器失败:', error)
    dialog.showErrorBox('启动失败', `服务器启动失败: ${error.message}\n\n详细信息:\n${error.stack}`)
    app.quit()
  }
}

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    },
    icon: path.join(__dirname, 'public', 'favicon.ico'),
    title: '森源管理系统',
    show: false, // 先不显示，等加载完成后再显示
    titleBarStyle: 'default'
  })

  // 设置菜单
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '刷新',
          accelerator: 'F5',
          click: () => {
            mainWindow.reload()
          }
        },
        {
          label: '开发者工具',
          accelerator: 'F12',
          click: () => {
            mainWindow.webContents.openDevTools()
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit()
          }
        }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于森源管理系统',
              message: '森源管理系统',
              detail: 'Version 1.0.0\n基于 Next.js + Electron 构建',
              buttons: ['确定']
            })
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  // 加载应用
  mainWindow.loadURL(`http://localhost:${port}`)

  // 窗口加载完成后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    
    // 如果是开发模式，打开开发者工具
    if (isDev) {
      mainWindow.webContents.openDevTools()
    }
  })

  // 处理窗口关闭 - 最小化到托盘而不是完全关闭
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault()
      mainWindow.hide()
      
      // 显示托盘提示
      if (tray) {
        tray.displayBalloon({
          iconType: 'info',
          title: '森源管理系统',
          content: '应用已最小化到系统托盘，双击托盘图标可重新打开'
        })
      }
    }
    return false
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // 阻止导航到外部URL
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)
    
    if (parsedUrl.origin !== `http://localhost:${port}`) {
      event.preventDefault()
      shell.openExternal(navigationUrl)
    }
  })
}

// 创建系统托盘
function createTray() {
  // 创建托盘图标
  const iconPath = path.join(__dirname, 'public', 'favicon.ico')
  let trayIcon
  
  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath)
    // 调整图标大小适配托盘
    trayIcon = trayIcon.resize({ width: 16, height: 16 })
  } else {
    // 如果没有图标文件，创建一个简单的图标
    trayIcon = nativeImage.createEmpty()
  }
  
  tray = new Tray(trayIcon)
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    {
      label: '重新加载',
      click: () => {
        if (mainWindow) {
          mainWindow.reload()
        }
      }
    },
    {
      label: '开发者工具',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.openDevTools()
        }
      }
    },
    { type: 'separator' },
    {
      label: '关于',
      click: () => {
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: '关于森源管理系统',
          message: '森源管理系统',
          detail: 'Version 1.0.0\n基于 Next.js + Electron 构建\n\n双击托盘图标显示/隐藏窗口\n右键托盘图标显示菜单',
          buttons: ['确定']
        })
      }
    },
    {
      label: '退出应用',
      click: () => {
        app.isQuiting = true
        app.quit()
      }
    }
  ])
  
  tray.setContextMenu(contextMenu)
  tray.setToolTip('森源管理系统 - 双击显示/隐藏窗口')
  
  // 双击托盘图标显示/隐藏窗口
  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })
}

// 当 Electron 完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(() => {
  startNextServer()
})

// 当所有窗口都关闭时不退出应用（因为有系统托盘）
app.on('window-all-closed', () => {
  // 在 Windows 上，保持应用运行在系统托盘中
  // 在 macOS 上，应用和其菜单栏通常会保持活跃状态，直到用户使用 Cmd + Q 明确退出
  if (process.platform === 'darwin') {
    app.quit()
  }
  // Windows 和 Linux 保持运行在托盘中
})

app.on('activate', () => {
  // 在 macOS 上，当单击 dock 图标并且没有其他窗口打开时，通常在应用中重新创建一个窗口
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// 应用退出时清理
app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill()
  }
  if (nextApp) {
    // Next.js 应用清理
  }
})

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error)
  dialog.showErrorBox('系统错误', `发生未预期的错误: ${error.message}`)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason)
  dialog.showErrorBox('系统错误', `发生未预期的错误: ${reason}`)
}) 