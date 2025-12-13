<template>
  <a-modal v-model:visible="visible" :width="width" :mask-closable="false" @close="handleClose">
    <template #title>导入插件</template>
    <div class="import-container">
      <!-- 拖拽上传区域 -->
      <div 
        class="upload-area" 
        @drop="handleDrop" 
        @dragover="handleDragover" 
        @dragleave="handleDragleave"
        :class="{ 'dragging': isDragging }"
      >
        <div style="text-align: center;">
          <icon-cloud-download style="font-size: 48px; color: #1890ff;" />
          <p style="margin-top: 16px; font-size: 14px; color: #666;">
            拖拽压缩包到此区域或
            <a href="javascript:void(0);" @click="selectFile">选择文件</a>
          </p>
        </div>
        <input 
          ref="fileInput" 
          type="file" 
          accept=".zip" 
          style="display: none" 
          @change="handleFileSelect"
        />
      </div>

      <!-- 文件信息 -->
      <div v-if="selectedFile" style="margin-top: 24px;">
        <a-space direction="vertical" fill>
          <div class="file-info">
            <icon-file style="margin-right: 8px;" />
            <span>{{ selectedFile.name }}</span>
            <span style="color: #999;">{{ formatFileSize(selectedFile.size) }}</span>
          </div>
        </a-space>
      </div>

      <!-- 导入参数设置 -->
      <a-divider v-if="selectedFile" />
      <div v-if="selectedFile" style="margin-top: 16px;">
        <a-space direction="vertical" fill>
          <div>
            <a-checkbox v-model="importParams.checkExist">
              <span style="margin-left: 8px;">检查文件及数据库是否已存在，依赖是否正确</span>
            </a-checkbox>
            <p style="color: #999; margin-left: 24px; font-size: 12px; margin-top: 4px;">
              勾选后将检查文件和数据库表是否已存在，依赖是否正确，检查通过后才会导入否则会提示错误信息
            </p>
          </div>
          <div>
            <a-checkbox v-model="importParams.overwriteFiles">
              <span style="margin-left: 8px;">导入并覆盖现有文件</span>
            </a-checkbox>
            <p style="color: #999; margin-left: 24px; font-size: 12px; margin-top: 4px;">
              勾选后将覆盖已存在的源代码文件
            </p>
          </div>
          <div>
            <a-checkbox v-model="importParams.overwriteDB">
              <span style="margin-left: 8px;">导入并覆盖数据库</span>
            </a-checkbox>
            <p style="color: #999; margin-left: 24px; font-size: 12px; margin-top: 4px;">
              勾选后将导入并覆盖相关数据库表数据
            </p>
          </div>
          <div>
            <a-checkbox v-model="importParams.importMenu">
              <span style="margin-left: 8px;">导入菜单</span>
            </a-checkbox>
            <p style="color: #999; margin-left: 24px; font-size: 12px; margin-top: 4px;">
              勾选后将导入插件的菜单配置
            </p>
          </div>
        </a-space>
      </div>
    </div>

    <template #footer>
      <a-space>
        <a-button @click="handleClose">取消</a-button>
        <a-button type="primary" :loading="importLoading" :disabled="!selectedFile" @click="confirmImport">
          <template #icon><icon-upload /></template>
          <span>导入</span>
        </a-button>
      </a-space>
    </template>
  </a-modal>
</template>

<script setup lang='ts'>
import { ref, computed, h } from 'vue'
import { Modal } from '@arco-design/web-vue'
import { importPluginAPI, type PluginImportRequest } from '@/api/pluginsmanager'
import useGlobalProperties from '@/hooks/useGlobalProperties'
import { useDevicesSize } from '@/hooks/useDevicesSize'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'success': []
}>()

const { isMobile } = useDevicesSize()
const proxy = useGlobalProperties()

// 弹窗宽度
const width = computed(() => isMobile.value ? "95%" : "60%")

// 弹窗显示状态
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 文件输入
const fileInput = ref<HTMLInputElement>()
const selectedFile = ref<File>()
const isDragging = ref(false)

// 导入参数
const importLoading = ref(false)
const importParams = ref<PluginImportRequest>({
  checkExist: true,
  overwriteFiles: true,
  overwriteDB: true,
  importMenu: true
})

// 格式化文件大小
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

// 关闭弹窗
const handleClose = () => {
  emit('update:modelValue', false)
  resetForm()
}

// 重置表单
const resetForm = () => {
  selectedFile.value = undefined
  isDragging.value = false
  importLoading.value = false
  importParams.value = {
    checkExist: true,
    overwriteFiles: true,
    overwriteDB: true,
    importMenu: true
  }
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// 选择文件
const selectFile = () => {
  fileInput.value?.click()
}

// 处理文件选择
const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  const files = target.files
  if (files && files.length > 0) {
    const file = files[0]
    if (!file.name.endsWith('.zip')) {
      proxy.$message.error('只能上传 .zip 格式的压缩包')
      return
    }
    selectedFile.value = file
  }
}

// 处理拖拽进入
const handleDragover = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = true
}

// 处理拖拽离开
const handleDragleave = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false
}

// 处理拖拽释放
const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false
  
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    const file = files[0]
    if (!file.name.endsWith('.zip')) {
      proxy.$message.error('只能上传 .zip 格式的压缩包')
      return
    }
    selectedFile.value = file
  }
}

// 显示存在的项目详情
const showExistingItems = (data: any) => {
  const contentVNode = h('div', { style: { textAlign: 'left' } }, [
    data.existingPaths && data.existingPaths.length > 0 && h('div', { style: { marginBottom: '12px' } }, [
      h('strong', '已存在的文件或目录：'),
      h('div', { style: { marginTop: '8px', paddingLeft: '12px', color: '#666' } }, 
        data.existingPaths.map((path: string, index: number) => 
          h('div', { key: index }, path)
        )
      )
    ]),
    data.existingTables && data.existingTables.length > 0 && h('div', [
      h('strong', '已存在的数据库表：'),
      h('div', { style: { marginTop: '8px', paddingLeft: '12px', color: '#666' } }, 
        data.existingTables.map((table: string, index: number) => 
          h('div', { key: index }, table)
        )
      )
    ])
  ])

  Modal.info({
    title: '以下项已存在',
    content: () => contentVNode,
    okText: '确定'
  })
}

// 确认导入
const confirmImport = async () => {
  if (!selectedFile.value) {
    proxy.$message.error('请选择文件')
    return
  }

  try {
    importLoading.value = true
    const response = await importPluginAPI(selectedFile.value, importParams.value)
    if (response.code === 0) {
        proxy.$message.success('插件导入成功')
        emit('success')
        handleClose()
    } else {
        // 显示存在的项目列表
        proxy.$message.warning(response.message)
        if (response.data && response.data.isWarning) {
          showExistingItems(response.data)
        }
    }
  } catch (error: any) {
    console.error(error)
    proxy.$message.error(error?.message || '插件导入失败')
  } finally {
    importLoading.value = false
  }
}
</script>

<style lang='scss' scoped>
.import-container {
  padding: 16px;
}

.upload-area {
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  padding: 32px;
  text-align: center;
  transition: all 0.3s;
  cursor: pointer;
  background-color: #fafafa;

  &:hover {
    border-color: #1890ff;
    background-color: #f5f7ff;
  }

  &.dragging {
    border-color: #1890ff;
    background-color: #e6f7ff;
  }
}

.file-info {
  display: flex;
  align-items: center;
  padding: 12px;
  background-color: #f5f5f5;
  border-radius: 4px;
  
  span {
    margin-right: 8px;
    
    &:last-child {
      margin-left: auto;
      color: #999;
      font-size: 12px;
    }
  }
}
</style>
