<template>
  <div class="snow-page">
    <div class="snow-inner">
      <s-layout-tools>
        <template #left>
          <a-space wrap>
            <a-input v-model="form.keyword" placeholder="请输入插件名称或作者" allow-clear />
            <a-button type="primary" @click="search">
              <template #icon><icon-search /></template>
              <span>查询</span>
            </a-button>
            <a-button @click="reset">
              <template #icon><icon-refresh /></template>
              <span>重置</span>
            </a-button>
          </a-space>
        </template>
        <template #right>
          <a-button type="primary" @click="showImportModal" v-hasPerm="['system:pluginsmanager:import']">
            <template #icon><icon-upload /></template>
            <span>导入插件</span>
          </a-button>
        </template>
      </s-layout-tools>

      <a-row :gutter="16" style="padding: 16px 0">
        <a-col :xs="24" :sm="12" :md="8" :lg="6" v-for="plugin in filteredPlugins" :key="plugin.folderName">
          <a-card hoverable @click="viewDetail(plugin)">
            <template #cover>
              <div style="height: 180px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 48px; color: white;">📦</span>
              </div>
            </template>
            <template #title>
              <div class="plugin-title">{{ plugin.name }}</div>
            </template>
            <a-descriptions :column="1" size="small" :bordered="false">
              <a-descriptions-item label="版本">{{ plugin.version }}</a-descriptions-item>
              <a-descriptions-item label="作者">{{ plugin.author }}</a-descriptions-item>
              <a-descriptions-item label="描述">
               {{ truncateString(plugin.description, 18) }}
              </a-descriptions-item>
            </a-descriptions>
          </a-card>
        </a-col>
      </a-row>

      <a-empty v-if="pluginsList.length === 0 && !loading" description="暂无插件数据" />
    </div>

    <!-- 详情弹窗 -->
    <a-modal v-model:visible="detailVisible" :width="layoutMode.width" :footer="false" @close="detailVisible = false">
      <template #title>插件详情 - {{ currentPlugin.name }}</template>
      <a-descriptions :column="1" bordered size="medium">
        <a-descriptions-item label="插件名称">{{ currentPlugin.name }}</a-descriptions-item>
        <a-descriptions-item label="版本">{{ currentPlugin.version }}</a-descriptions-item>
        <a-descriptions-item label="描述">{{ currentPlugin.description }}</a-descriptions-item>
        <a-descriptions-item label="作者">{{ currentPlugin.author }}</a-descriptions-item>
        <a-descriptions-item label="邮箱">{{ currentPlugin.email }}</a-descriptions-item>
        <a-descriptions-item label="官网">
          <a-link v-if="currentPlugin.url" :href="currentPlugin.url" target="_blank">{{ currentPlugin.url }}</a-link>
        </a-descriptions-item>
        <a-descriptions-item label="文件夹名称">{{ currentPlugin.folderName }}</a-descriptions-item>
        <a-descriptions-item label="导出目录" v-if="currentPlugin.exportDirs && currentPlugin.exportDirs.length > 0">
            <a-space wrap>
                <a-tag v-for="dir in currentPlugin.exportDirs" :key="dir">{{ dir }}</a-tag>
            </a-space> 
        </a-descriptions-item>
        <a-descriptions-item label="数据库表" v-if="currentPlugin.databaseTable && currentPlugin.databaseTable.length > 0">
             <a-space wrap>
                <a-tag v-for="table in currentPlugin.databaseTable" :key="table" color="blue">{{ table }}</a-tag>
             </a-space>
        </a-descriptions-item>
        <a-descriptions-item label="菜单项" v-if="currentPlugin.menus && currentPlugin.menus.length > 0">
          <a-table :data="currentPlugin.menus" :pagination="false" :bordered="false" size="small">
            <template #columns>
              <a-table-column title="路径" data-index="path"></a-table-column>
              <a-table-column title="类型" data-index="type">
                <template #cell="{ record }">
                  <a-tag v-if="record.type === 1" color="green">目录</a-tag>
                  <a-tag v-if="record.type === 2" color="blue">菜单</a-tag>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-descriptions-item>
        <a-descriptions-item label="依赖" v-if="currentPlugin.dependencies && Object.keys(currentPlugin.dependencies).length > 0">
          <div v-for="(version, name) in currentPlugin.dependencies" :key="name" style="margin-bottom: 4px">
            <span>{{ name }}: {{ version }}</span>
          </div>
        </a-descriptions-item>
      </a-descriptions>
      <div style="margin-top: 24px; text-align: right;">
        <a-space>
          <a-button type="primary" @click="exportPlugin(currentPlugin)" v-hasPerm="['system:pluginsmanager:export']">
            <template #icon><icon-download /></template>
            <span>导出插件</span>
          </a-button>
          <a-popconfirm title="确定要卸载此插件吗？" content="卸载后将删除插件的所有文件和数据库表。" type="warning" @ok="handleDeletePlugin">
            <a-button type="primary" status="danger" v-hasPerm="['system:pluginsmanager:uninstall']">
              <template #icon><icon-delete /></template>
              <span>卸载插件</span>
            </a-button>
          </a-popconfirm>
          <a-button @click="detailVisible = false">
            <template #icon><icon-close /></template>
            <span>退出</span>
          </a-button>
        </a-space>
      </div>
    </a-modal>

    <!-- 导入插件弹窗组件 -->
    <PluginImportModal v-model="importModalVisible" @success="handleImportSuccess" />
  </div>
</template>

<script setup lang='ts'>
import { ref,  onMounted, computed } from 'vue'
import { getPluginsExportAPI, exportPluginAPI, deletePluginAPI, type PluginExport } from '@/api/pluginsmanager'
import useGlobalProperties from '@/hooks/useGlobalProperties'
import { useDevicesSize } from '@/hooks/useDevicesSize'
import { truncateString } from '@/utils/common-tools'
import PluginImportModal from './components/PluginImportModal.vue'

const { isMobile } = useDevicesSize()
const layoutMode = computed(() => {
  let info = {
    mobile: {
      width: "95%",
      layout: "vertical"
    },
    desktop: {
      width: "60%",
      layout: "horizontal"
    }
  };
  return isMobile.value ? info.mobile : info.desktop;
});

const proxy = useGlobalProperties()

// 表单数据
const form = ref({
  keyword: ""
})

// 表格相关
const pluginsList = ref<PluginExport[]>([])
const loading = ref(false)

// 详情弹窗
const detailVisible = ref(false)
const currentPlugin = ref<PluginExport>({} as PluginExport)

// 导入弹窗
const importModalVisible = ref(false)

// 过滤后的插件列表
const filteredPlugins = computed(() => {
  if (!form.value.keyword) {
    return pluginsList.value
  }
  const keyword = form.value.keyword.toLowerCase()
  return pluginsList.value.filter(plugin => 
    plugin.name.toLowerCase().includes(keyword) || 
    plugin.author.toLowerCase().includes(keyword)
  )
})

// 获取插件列表
const getPluginsList = async () => {
  try {
    loading.value = true
    const res = await getPluginsExportAPI()
    pluginsList.value = res.data.list || []
  } catch (error) {
    console.error(error)
    proxy.$message.error('获取插件列表失败')
  } finally {
    loading.value = false
  }
}

// 导出插件
const exportPlugin = async (plugin: PluginExport) => {
  try {
    proxy.$message.loading('插件导出中...')
    const response = await exportPluginAPI(plugin.folderName)
    
    // 获取blob并下载
    const blob = new Blob([response], { type: 'application/zip' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${plugin.folderName}_${plugin.version}.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    proxy.$message.success('插件导出成功')
  } catch (error) {
    console.error(error)

  }
}

// 查询
const search = () => {
  // 本地过滤，无需重新请求
}

// 重置
const reset = () => {
  form.value = {
    keyword: ""
  }
}

// 查看详情
const viewDetail = (plugin: PluginExport) => {
  currentPlugin.value = { ...plugin }
  detailVisible.value = true
}

// 显示导入弹窗
const showImportModal = () => {
  importModalVisible.value = true
}

// 导入成功回调
const handleImportSuccess = async () => {
  // 刷新插件列表
  await getPluginsList()
}

// 删除插件
const handleDeletePlugin = async () => {
  try {
    proxy.$message.loading('插件卸载中...')
    await deletePluginAPI(currentPlugin.value.folderName)
    proxy.$message.success('插件卸载成功')
    detailVisible.value = false
    // 刷新插件列表
    await getPluginsList()
  } catch (error) {
    console.error(error)
    proxy.$message.error('插件卸载失败')
  }
}

// 初始化
onMounted(() => {
  getPluginsList()
})
</script>

<style lang='scss' scoped>
.plugin-title {
  font-weight: 600;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}


:deep(.arco-card) {
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  }
}
</style>