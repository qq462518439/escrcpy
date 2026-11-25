<template>
  <el-config-provider :locale="locale" :size="size">
    <Layouts />
  </el-config-provider>
</template>

<script setup>
import Layouts from './layouts/index.vue'
import { openFloatControl } from '$/utils/device/index.js'

const router = useRouter()

const { locale, size } = useWindowStateSync()

const deviceStore = useDeviceStore()
const preferenceStore = usePreferenceStore()

watch(() => deviceStore.list, (list) => {
  const snapshot = (list || [])
    .filter(device => ['device', 'emulator'].includes(device.status))
    .map(({ id, remark, name, status, wifi, serialNo }) => ({
      id,
      remark,
      name,
      status,
      wifi,
      serialNo,
    }))

  window.$preload.ipcRenderer.send('tray:devices-sync', snapshot)
}, { immediate: true, deep: true })

window.$preload.ipcRenderer.on('quit-before', async () => {
  ElLoading.service({
    lock: true,
    text: window.t('appClose.quit.loading'),
  })
})

const startApp = useStartApp()

window.$preload.ipcRenderer.on('execute-arguments-change', async (event, params) => {
  startApp.open(params)
})

window.$preload.ipcRenderer.on('navigate-to-route', (event, route) => {
  router.push(route)
})

window.$preload.ipcRenderer.on('tray:mirror-device', async (_event, deviceId) => {
  if (!deviceId) {
    return
  }

  await deviceStore.getList().catch(() => {})

  const row = deviceStore.list.find(item => item.id === deviceId)
  const args = preferenceStore.scrcpyParameter(deviceId)

  const mirroring = window.$preload.scrcpy.mirror(deviceId, {
    title: deviceStore.getLabel(deviceId, 'mirror'),
    args,
    resolveOnReady: true,
  })

  try {
    await mirroring

    if (row) {
      openFloatControl(toRaw(row))
    }
  }
  catch (error) {
    console.error('tray.mirror.error', error)

    if (error?.message) {
      ElMessage.warning(error.message)
    }
  }
})

onMounted(() => {
  showTips()
  startApp.open()
})

async function showTips() {
  const { getScrcpy } = window.$preload.configs || {}

  const scrcpyPath = getScrcpy?.({ store: window.$preload.store })

  if (scrcpyPath) {
    return false
  }

  ElMessageBox.alert(
    `<div>
      ${window.t('dependencies.lack.content', {
        name: '<a class="hover:underline text-primary-500" href="https://github.com/Genymobile/scrcpy" target="_blank">scrcpy</a>',
      })}
    <div>`,
    window.t('dependencies.lack.title'),
    {
      dangerouslyUseHTMLString: true,
    },
  )
}
</script>

<style lang="postcss">
</style>
