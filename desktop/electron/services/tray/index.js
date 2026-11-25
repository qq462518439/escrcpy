import { app, dialog, Menu, Tray } from 'electron'
import { trayPath } from '$electron/configs/index.js'
import electronStore from '$electron/helpers/store/index.js'
import { globalEventEmitter } from '$electron/helpers/emitter/index.js'
import { sleep } from '$/utils'
import { resolveMainWindow } from '@escrcpy/electron-setup/main'
import { t } from '$electron/helpers/i18n/index.js'

export default {
  name: 'service:tray',
  async apply(mainApp) {
    let tray = null

    globalEventEmitter.on('tray:destroy', () => {
      destroyTray()
    })

    globalEventEmitter.on('tray:create', () => {
      createTray()
    })

    globalEventEmitter.on('show:app', () => {
      showApp()
    })

    globalEventEmitter.on('hide:app', () => {
      hideApp()
    })

    registerWindowCloseHandler()

    // 每次启动即驻留托盘图标，不隐藏主窗口
    createTray()

    async function registerWindowCloseHandler() {
      const mainWindow = await resolveMainWindow(mainApp)

      mainWindow?.on?.('close', async (event) => {
        if (app.isQuitting) {
          return true
        }

        event.preventDefault()

        let appCloseCode = electronStore.get('common.appCloseCode')

        if (![0, 1].includes(appCloseCode)) {
          const { response } = await dialog.showMessageBox({
            type: 'question',
            cancelId: 2,
            buttons: [
              t('appClose.quit'),
              t('appClose.minimize'),
              t('appClose.quit.cancel'),
            ],
            title: t('common.tips'),
            message: t('appClose.message'),
          })

          appCloseCode = response
        }

        closeApp(appCloseCode)
      })
    }

    function showApp() {
      if (process.platform === 'darwin') {
        app.dock.show()
      }

      const mainWindow = mainApp.getMainWindow()

      mainWindow?.show?.()
      mainWindow?.focus?.()

      return true
    }

    function hideApp() {
      if (process.platform === 'darwin') {
        app.dock.hide()
      }

      const mainWindow = mainApp.getMainWindow()

      mainWindow?.hide?.()

      return true
    }

    function toggleApp() {
      const mainWindow = mainApp.getMainWindow()

      if (!mainWindow || mainWindow.isDestroyed()) {
        showApp()
        return
      }

      if (mainWindow.isMinimized()) {
        mainWindow.restore()
        mainWindow.focus()
      }
      else if (!mainWindow.isVisible()) {
        showApp()
      }
      else {
        hideApp()
      }
    }

    async function quitApp() {
      const mainWindow = mainApp.getMainWindow()
      mainWindow?.webContents?.send?.('quit-before')

      await sleep(1 * 1000)

      globalEventEmitter.emit('app:quit')

      return true
    }

    function closeApp(response) {
      if (response === 0) {
        quitApp()
        return true
      }
      else if (response === 1) {
        hideApp()
        createTray()
        return true
      }

      return false
    }

    function destroyTray() {
      tray?.destroy?.()
      tray = null
    }

    function createTray() {
      if (tray) {
        return
      }

      tray = new Tray(trayPath)

      tray.setToolTip('escrcpy')

      tray.on('click', () => {
        toggleApp()
      })

      const contextMenu = Menu.buildFromTemplate([
        {
          label: t('common.open'),
          click: () => {
            showApp()
          },
        },
        {
          label: t('common.restart'),
          click: () => {
            app.relaunch()
            quitApp()
          },
        },
        {
          label: t('appClose.quit'),
          click: () => {
            quitApp()
          },
        },
      ])

      tray.setContextMenu(contextMenu)
    }
  },
}
