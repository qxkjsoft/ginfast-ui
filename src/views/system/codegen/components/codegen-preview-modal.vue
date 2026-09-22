<template>
    <a-modal v-model:visible="modalVisible" :title="previewTitle" width="100%" :body-style="{ padding: '0px', height: '600px', display: 'flex', flexDirection: 'column' }">
        <div class="preview-modal-container">
            <!-- 加载状态 -->
            <div v-if="previewLoading" class="preview-loading">
                <a-spin tip="正在加载代码预览..." />
            </div>
            
            <!-- 空状态 -->
            <div v-else-if="!hasPreviewData" class="preview-empty">
                <icon-file class="empty-icon" />
                <div class="empty-text">暂无代码预览数据</div>
            </div>
            
            <!-- 代码预览内容 -->
            <div v-else class="preview-content">
                <!-- 左侧目录树 -->
                <div class="preview-tree-sidebar">
                    <div class="tree-header">
                        <icon-folder class="header-icon" />
                        <span class="header-title">文件目录</span>
                    </div>
                    <a-scrollbar style="height: 550px; overflow: auto;">
                        <a-tree
                            :data="fileTreeData"
                            :show-line="true"
                            :default-expand-all="true"
                            :selected-keys="[selectedFileKey]"
                            :field-names="{ title: 'name', children: 'children', key: 'path' }"
                            @select="handleFileSelect"
                        >
                            <template #title="nodeData">
                                <span class="tree-node-title">
                                    <icon-folder v-if="nodeData.type === 'directory'" />
                                    <span>{{ nodeData.name }}</span>
                                </span>
                            </template>
                        </a-tree>
                    </a-scrollbar>
                </div>
                
                <!-- 右侧代码展示区 -->
                <div class="preview-content-body">
                    <div v-if="activeTab === 'model' && previewData.model" class="code-wrapper">
                        <div class="code-header">
                            <a-button type="primary" size="small" @click="copyCode('model')">
                                <template #icon><icon-copy /></template>
                                <span>复制代码</span>
                            </a-button>
                            <div class="code-info">Go Model 文件</div>
                        </div>
                        <a-scrollbar style="height: 500px; overflow: auto;">
                            <div class="code-container">
                                <s-code-view :code-json="previewData.model" type="javascript" />
                            </div>
                        </a-scrollbar>
                    </div>
                    
                    <div v-if="activeTab === 'modelparam' && previewData.modelparam" class="code-wrapper">
                        <div class="code-header">
                            <a-button type="primary" size="small" @click="copyCode('modelparam')">
                                <template #icon><icon-copy /></template>
                                <span>复制代码</span>
                            </a-button>
                            <div class="code-info">Go 参数结构体</div>
                        </div>
                        <a-scrollbar style="height: 500px; overflow: auto;">
                            <div class="code-container">
                                <s-code-view :code-json="previewData.modelparam" type="javascript" />
                            </div>
                        </a-scrollbar>
                    </div>
                    
                    <div v-if="activeTab === 'controller' && previewData.controller" class="code-wrapper">
                        <div class="code-header">
                            <a-button type="primary" size="small" @click="copyCode('controller')">
                                <template #icon><icon-copy /></template>
                                <span>复制代码</span>
                            </a-button>
                            <div class="code-info">Go 控制器</div>
                        </div>
                        <a-scrollbar style="height: 500px; overflow: auto;">
                            <div class="code-container">
                                <s-code-view :code-json="previewData.controller" type="javascript" />
                            </div>
                        </a-scrollbar>
                    </div>
                    
                    <div v-if="activeTab === 'service' && previewData.service" class="code-wrapper">
                        <div class="code-header">
                            <a-button type="primary" size="small" @click="copyCode('service')">
                                <template #icon><icon-copy /></template>
                                <span>复制代码</span>
                            </a-button>
                            <div class="code-info">Go 服务层</div>
                        </div>
                        <a-scrollbar style="height: 500px; overflow: auto;">
                            <div class="code-container">
                                <s-code-view :code-json="previewData.service" type="javascript" />
                            </div>
                        </a-scrollbar>
                    </div>
                    
                    <div v-if="activeTab === 'routes' && previewData.routes" class="code-wrapper">
                        <div class="code-header">
                            <a-button type="primary" size="small" @click="copyCode('routes')">
                                <template #icon><icon-copy /></template>
                                <span>复制代码</span>
                            </a-button>
                            <div class="code-info">路由配置</div>
                        </div>
                        <a-scrollbar style="height: 500px; overflow: auto;">
                            <div class="code-container">
                                <s-code-view :code-json="previewData.routes" type="javascript" />
                            </div>
                        </a-scrollbar>
                    </div>
                    
                    <div v-if="activeTab === 'init' && previewData.init" class="code-wrapper">
                        <div class="code-header">
                            <a-button type="primary" size="small" @click="copyCode('init')">
                                <template #icon><icon-copy /></template>
                                <span>复制代码</span>
                            </a-button>
                            <div class="code-info">初始化文件</div>
                        </div>
                        <a-scrollbar style="height: 500px; overflow: auto;">
                            <div class="code-container">
                                <s-code-view :code-json="previewData.init" type="javascript" />
                            </div>
                        </a-scrollbar>
                    </div>
                    
                    <div v-if="activeTab === 'frontendApi' && previewData.frontendApi" class="code-wrapper">
                        <div class="code-header">
                            <a-button type="primary" size="small" @click="copyCode('frontendApi')">
                                <template #icon><icon-copy /></template>
                                <span>复制代码</span>
                            </a-button>
                            <div class="code-info">前端 API 文件</div>
                        </div>
                        <a-scrollbar style="height: 500px; overflow: auto;">
                            <div class="code-container">
                                <s-code-view :code-json="previewData.frontendApi" type="javascript" />
                            </div>
                        </a-scrollbar>
                    </div>
                    
                    <div v-if="activeTab === 'frontendHooks' && previewData.frontendHooks" class="code-wrapper">
                        <div class="code-header">
                            <a-button type="primary" size="small" @click="copyCode('frontendHooks')">
                                <template #icon><icon-copy /></template>
                                <span>复制代码</span>
                            </a-button>
                            <div class="code-info">前端 Hooks 文件</div>
                        </div>
                        <a-scrollbar style="height: 500px; overflow: auto;">
                            <div class="code-container">
                                <s-code-view :code-json="previewData.frontendHooks" type="javascript" />
                            </div>
                        </a-scrollbar>
                    </div>
                    
                    <div v-if="activeTab === 'frontendStore' && previewData.frontendStore" class="code-wrapper">
                        <div class="code-header">
                            <a-button type="primary" size="small" @click="copyCode('frontendStore')">
                                <template #icon><icon-copy /></template>
                                <span>复制代码</span>
                            </a-button>
                            <div class="code-info">前端 Store 文件</div>
                        </div>
                        <a-scrollbar style="height: 500px; overflow: auto;">
                            <div class="code-container">
                                <s-code-view :code-json="previewData.frontendStore" type="javascript" />
                            </div>
                        </a-scrollbar>
                    </div>
                    
                    <div v-if="activeTab === 'frontendView' && previewData.frontendView" class="code-wrapper">
                        <div class="code-header">
                            <a-button type="primary" size="small" @click="copyCode('frontendView')">
                                <template #icon><icon-copy /></template>
                                <span>复制代码</span>
                            </a-button>
                            <div class="code-info">前端页面文件</div>
                        </div>
                        <a-scrollbar style="height: 500px; overflow: auto;">
                            <div class="code-container">
                                <s-code-view :code-json="previewData.frontendView" type="javascript" />
                            </div>
                        </a-scrollbar>
                    </div>
                </div>
            </div>
        </div>
        
        <template #footer>
            <a-space>
                <a-button @click="closePreviewModal">退出</a-button>
                <a-button type="primary" v-hasPerm="['system:codegen:insertmenuandapi']" @click="generateMenuAndApi">生成菜单</a-button>
            </a-space>
        </template>
    </a-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { previewCode, insertmenuandapi, type FileTreeNode } from "@/api/syscodegen";
import type { SysGenItem } from "@/api/sysgen";
import { arcoMessage } from "@/globals";
import SCodeView from "@/components/s-code-view/index.vue";

interface Props {
    visible: boolean;
    recordId?: number;
    record?: SysGenItem | null;
}

interface Emits {
    (e: "update:visible", value: boolean): void;
    (e: "success"): void;
}

const props = withDefaults(defineProps<Props>(), {
    visible: false,
    recordId: 0,
    record: null
});

const emit = defineEmits<Emits>();

// 模态框可见性
const modalVisible = ref(false);

// 预览标题
const previewTitle = ref("");

// 加载状态
const previewLoading = ref(false);

// 当前激活的标签
const activeTab = ref("controller");

// 预览数据
const previewData = ref<{
    model?: string,
    modelparam?: string,
    controller?: string,
    service?: string,
    routes?: string,
    init?: string,
    frontendApi?: string,
    frontendStore?: string,
    frontendHooks?: string,
    frontendView?: string
}>({
    model: "",
    modelparam: "",
    controller: "",
    service: "",
    routes: "",
    init: "",
    frontendApi: "",
    frontendStore: "",
    frontendHooks: "",
    frontendView: ""
});

// 文件树数据
const fileTreeData = ref<FileTreeNode[]>([]);

// 选中的文件key
const selectedFileKey = ref("");

// 当前预览的记录
const previewRecord = ref<SysGenItem | null>(null);

// 监听可见性变化
watch(
    () => props.visible,
    async (newVal) => {
        modalVisible.value = newVal;
        if (newVal && props.record) {
            await loadPreviewData(props.record);
        }
    }
);

// 监听模态框关闭
watch(modalVisible, (newVal) => {
    if (!newVal) {
        emit("update:visible", false);
    }
});

// 只保留字符串中的英文字母和下划线，并且全部转换为小写
// 与后端 common.KeepLettersOnly 对齐（保留下划线）：
const keepLettersOnly = (s: string): string => {
    if (!s) return '';
    return s.replace(/[^a-zA-Z_]/g, '').toLowerCase();
};

// 处理文件选择
const handleFileSelect = (selectedKeys: string[], node: any) => {
    if (selectedKeys.length > 0) {
        selectedFileKey.value = selectedKeys[0];
        const selectedNode = node.node;
        
        // 只处理文件节点
        if (selectedNode.type === 'file') {
            const codeType = getCodeTypeByPath(selectedNode.path);
            if (codeType && previewData.value[codeType as keyof typeof previewData.value]) {
                activeTab.value = codeType;
            }
        }
    }
};

// 根据路径查找代码类型
const getCodeTypeByPath = (path: string): string | null => {
    if (!previewRecord.value) return null;
    
    const fileName = keepLettersOnly(previewRecord.value.fileName || '');
    
    // 根据路径匹配代码类型
    if (path.includes('controller.go')) return 'controller';
    if (path.includes(`${fileName}.go`) && !path.includes('param')) return 'model';
    if (path.includes(`${fileName}param.go`)) return 'modelparam';
    if (path.includes('service.go')) return 'service';
    if (path.includes('routes.go')) return 'routes';
    if (path.includes('init.go')) return 'init';
    if (path.includes('api/') && path.endsWith('.ts')) return 'frontendApi';
    if (path.includes('hooks/') && path.endsWith('.ts')) return 'frontendHooks';
    if (path.includes('views/') && path.endsWith('.vue')) return 'frontendView';
    
    return null;
};

// 检查是否有预览数据
const hasPreviewData = computed(() => {
    return Object.values(previewData.value).some(value => value && value.trim() !== '');
});

// 处理代码字符串中的特殊字符
const formatCode = (code: string | undefined) => {
    if (!code) return '';
    // 处理 \r\n\t 等特殊字符
    return code
        .replace(/\r\n/g, '\n')  // Windows换行符转Unix换行符
        .replace(/\r/g, '\n')    // Mac换行符转Unix换行符
        .replace(/\t/g, '    '); // 制表符转4个空格
};

// 查找文件树中的节点
const findNodeByPath = (nodes: FileTreeNode[], name: string): FileTreeNode | null => {
    for (const node of nodes) {
        if (node.name === name) {
            return node;
        }
        if (node.children && node.children.length > 0) {
            const found = findNodeByPath(node.children, name);
            if (found) return found;
        }
    }
    return null;
};

// 加载预览数据
const loadPreviewData = async (record: SysGenItem) => {
    previewTitle.value = `${record.name} - 代码预览`;
    previewRecord.value = record;
    previewLoading.value = true;
    activeTab.value = "controller";
    selectedFileKey.value = "";
    // 重置预览数据
    previewData.value = {
        model: "",
        modelparam: "",
        controller: "",
        service: "",
        routes: "",
        init: "",
        frontendApi: "",
        frontendStore: "",
        frontendHooks: "",
        frontendView: ""
    };
    try {
        const res = await previewCode(record.id);
        if (res.data) {
            // 处理新的数据结构
            const { tree, code } = res.data;
            
            // 设置文件树数据
            fileTreeData.value = tree || [];
            
            // 查找并选中 controller 节点
            if (tree && tree.length > 0) {
                const fileName = keepLettersOnly(previewRecord.value.fileName || '');
                const controllerNode = findNodeByPath(tree, `${fileName}controller.go`);
                if (controllerNode) {
                    selectedFileKey.value = controllerNode.path;
                }
            }
            
            // 格式化代码
            if (code) {
                previewData.value = {
                    model: formatCode(code.model),
                    modelparam: formatCode(code.modelparam),
                    controller: formatCode(code.controller),
                    service: formatCode(code.service),
                    routes: formatCode(code.routes),
                    init: formatCode(code.init),
                    frontendApi: formatCode(code.frontendApi),
                    frontendStore: formatCode(code.frontendStore),
                    frontendHooks: formatCode(code.frontendHooks),
                    frontendView: formatCode(code.frontendView)
                };
            }
        }
    } catch (error) {
        console.error("预览代码失败:", error);
        arcoMessage("error", "预览代码失败");
    } finally {
        previewLoading.value = false;
    }
};

// 复制代码
const copyCode = (key: string) => {
    const code = previewData.value[key as keyof typeof previewData.value];
    if (code) {
        navigator.clipboard.writeText(code).then(() => {
            arcoMessage("success", "代码已复制到剪贴板");
        }).catch(() => {
            arcoMessage("error", "复制失败，请手动复制");
        });
    }
};

// 退出预览模态框
const closePreviewModal = () => {
    modalVisible.value = false;
    previewRecord.value = null;
};

// 生成菜单
const generateMenuAndApi = async () => {
    if (!previewRecord.value) {
        arcoMessage("warning", "找不到所选表配置");
        return;
    }
    try {
        await insertmenuandapi(previewRecord.value.id);
        arcoMessage("success", "菜单生成成功");
        modalVisible.value = false;
        emit("success");
    } catch (error) {
        console.error("菜单生成失败:", error);
        arcoMessage("error", "菜单生成失败");
    }
};

// 暴露方法给父组件
defineExpose({
    loadPreviewData
});
</script>

<style lang="scss" scoped>
.preview-modal-container {
  display: flex;
  flex-direction: column;
}

.preview-content {
  flex: 1;
  display: flex;
  flex-direction: row;
  overflow: hidden;
}

.preview-tree-sidebar {
  width: 280px;
  min-width: 280px;
  border-right: 1px solid var(--color-border-2);
  display: flex;
  flex-direction: column;
  background: var(--color-fill-1);
  overflow: hidden;
  
  .tree-header {
    padding: 12px 16px;
    border-bottom: 1px solid var(--color-border-2);
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
    color: var(--color-text-1);
    flex-shrink: 0;
    
    .header-icon {
      font-size: 18px;
      color: var(--color-text-3);
    }
    
    .header-title {
      font-size: 14px;
    }
  }
  
  :deep(.arco-scrollbar) {
    .arco-scrollbar-container {
      overflow: auto;
    }
  }
  
  :deep(.arco-tree) {
    padding: 8px 0;
    background: transparent;
    
    .arco-tree-node {
      padding: 4px 12px;
      
      &:hover {
        background: var(--color-fill-2);
      }
      
      &.arco-tree-node-selected {
        background: var(--color-fill-3);
      }
    }
    
    .arco-tree-node-title {
      font-size: 13px;
    }
  }
  
  .tree-node-title {
    display: flex;
    align-items: center;
    gap: 6px;
    
    .arco-icon {
      font-size: 14px;
    }
  }
}

.preview-content-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-tabs-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border-2);
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  position: sticky;
  top: 0;
  background: white;
  z-index: 10;
}

.preview-loading,
.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 16px;
}

.preview-empty {
  .empty-icon {
    font-size: 48px;
    color: var(--color-text-3);
  }
  
  .empty-text {
    color: var(--color-text-3);
    font-size: 14px;
  }
}

.code-wrapper {
  padding: 16px;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  
  .code-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    gap: 12px;
    flex-shrink: 0;
  }
  
  
}
</style>
