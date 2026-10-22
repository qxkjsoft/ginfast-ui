<template>
    <a-drawer :visible="visible" :width="layoutMode.width" @ok="handleClose" @cancel="handleClose" :title="title"
        :hide-cancel="true" ok-text="关闭">
        <div class="api-permission-container">
            <!-- 已分配API操作区 -->
            <a-card class="actions-card">
                <a-row justify="space-between" align="center">
                    <a-col :span="12">
                        <a-space>
                            <span>已分配 <a-tag color="blue">{{ assignedList.length }}</a-tag> 个API</span>
                            <a-popconfirm :content="`确认移除选中的 ${selectedIds.length} 个API权限？`" type="warning"
                                @before-ok="handleBatchRemove">
                                <a-button type="outline" status="danger" size="mini"
                                    :disabled="selectedIds.length === 0">
                                    批量移除
                                </a-button>
                            </a-popconfirm>
                        </a-space>
                    </a-col>
                    <a-col :span="12" style="text-align: right">
                        <a-button type="primary" size="small" @click="openAddModal">
                            <template #icon><icon-plus /></template>
                            添加API权限
                        </a-button>
                    </a-col>
                </a-row>
            </a-card>

            <!-- 已分配API列表 -->
            <a-table row-key="id" :data="assignedList" :loading="tableLoading" :pagination="false" size="small"
                :bordered="{ cell: true }" :scroll="{ y: '400px' }" :row-selection="rowSelection"
                v-model:selected-keys="selectedIds">
                <template #columns>
                    <a-table-column title="ID" data-index="id" :width="80" align="center"></a-table-column>
                    <a-table-column title="API标题" data-index="title" :width="180" ellipsis tooltip></a-table-column>
                    <a-table-column title="请求路径" data-index="path" :width="250" ellipsis tooltip></a-table-column>
                    <a-table-column title="请求方法" data-index="method" :width="90" align="center">
                        <template #cell="{ record }">
                            <a-tag :color="getMethodColor(record.method)" size="small">
                                {{ record.method }}
                            </a-tag>
                        </template>
                    </a-table-column>
                    <a-table-column title="API分组" data-index="apiGroup" :width="130" ellipsis tooltip></a-table-column>
                    <a-table-column title="创建时间" data-index="createdAt" :width="110">
                        <template #cell="{ record }">
                            {{ formatTime(record.createdAt, "YYYY-MM-DD") }}
                        </template>
                    </a-table-column>
                    <a-table-column title="操作" :width="80" align="center">
                        <template #cell="{ record }">
                            <a-popconfirm content="确认移除该API权限？" type="warning" @before-ok="handleRemove(record)">
                                <a-link status="danger" :loading="removingId === record.id">移除</a-link>
                            </a-popconfirm>
                        </template>
                    </a-table-column>
                </template>
            </a-table>

            <!-- 添加API权限弹窗 -->
            <s-api-select-modal v-model:visible="addModalVisible" :menu-id="menuIdRef" :menu-name="menuName"
                @success="onAddSuccess" />
        </div>
    </a-drawer>
</template>

<script setup lang="ts">
import { getSysApiListAPI, setMenuApisAPI, type SysApiItem } from "@/api/sysapi";
import { useDevicesSize } from "@/hooks/useDevicesSize";
import { formatTime } from "@/globals";
import SApiSelectModal from "@/components/s-api-select-modal/index.vue";

const { isMobile } = useDevicesSize();
const layoutMode = computed(() => {
  let info = {
    mobile: {
      width: "95%"
    },
    desktop: {
      width: "65%"
    }
  };
  return isMobile.value ? info.mobile : info.desktop;
});
interface Props {
    visible: boolean;
    menuId?: number;
    menuName?: string;
}

interface Emits {
    (e: "update:visible", value: boolean): void;
    (e: "success"): void;
}

const props = withDefaults(defineProps<Props>(), {
    visible: false,
    menuId: 0,
    menuName: ""
});

const emit = defineEmits<Emits>();

// 抽屉标题
const title = computed(() => {
    return props.menuName ? `分配API权限 - ${props.menuName}` : "分配API权限";
});

// 表格加载状态
const tableLoading = ref(false);

// 移除中的API ID
const removingId = ref(0);

// 抽屉打开时固化的菜单ID，避免父组件刷新列表后清空 record 导致后续操作丢失ID
const menuIdRef = ref(0);

// 已分配API列表（全量，不分页）
const assignedList = ref<SysApiItem[]>([]);

// 已勾选的API ID（用于批量移除）
const selectedIds = ref<number[]>([]);

// 表格行选择配置
const rowSelection = ref({
    type: "checkbox",
    showCheckedAll: true,
    onlyCurrent: false
});

// 添加弹窗显示状态
const addModalVisible = ref(false);

// 加载已分配API列表（不传分页参数，后端返回全量）
const loadAssignedList = async () => {
    if (!menuIdRef.value) return;
    try {
        tableLoading.value = true;
        const res = await getSysApiListAPI({ menuId: menuIdRef.value, order: "id ASC" });
        assignedList.value = res.data.list;
    } catch (error) {
        console.error("获取已分配API列表失败:", error);
        arcoMessage("error", "获取已分配API列表失败");
    } finally {
        tableLoading.value = false;
    }
};

// 打开添加弹窗
const openAddModal = () => {
    if (!menuIdRef.value) {
        arcoMessage("error", "菜单ID不能为空");
        return;
    }
    addModalVisible.value = true;
};

// 添加成功：刷新已分配列表并通知父组件
const onAddSuccess = () => {
    emit("success");
    loadAssignedList();
};

// 批量移除勾选的API：从当前ID集合中剔除后全量保存
const handleBatchRemove = async (): Promise<boolean> => {
    if (!menuIdRef.value) {
        arcoMessage("error", "菜单ID不能为空");
        return false;
    }
    if (selectedIds.value.length === 0) {
        arcoMessage("warning", "请选择要移除的API");
        return false;
    }

    try {
        const selectedSet = new Set(selectedIds.value);
        const apiIds = assignedList.value.map(item => item.id).filter(id => !selectedSet.has(id));
        await setMenuApisAPI({
            menuId: menuIdRef.value,
            apiIds
        });

        arcoMessage("success", `已移除 ${selectedIds.value.length} 个API权限`);
        emit("success");
        selectedIds.value = [];
        await loadAssignedList();
        return true;
    } catch (error) {
        console.error("批量移除API权限失败:", error);
        arcoMessage("error", "批量移除API权限失败");
        return false;
    }
};

// 移除单个已分配API：从当前ID集合中剔除后全量保存
const handleRemove = async (record: SysApiItem): Promise<boolean> => {
    if (!menuIdRef.value) {
        arcoMessage("error", "菜单ID不能为空");
        return false;
    }

    try {
        removingId.value = record.id;
        const apiIds = assignedList.value.map(item => item.id).filter(id => id !== record.id);
        await setMenuApisAPI({
            menuId: menuIdRef.value,
            apiIds
        });

        arcoMessage("success", "移除成功");
        emit("success");
        selectedIds.value = selectedIds.value.filter(id => id !== record.id);
        await loadAssignedList();
        return true;
    } catch (error) {
        console.error("移除API权限失败:", error);
        arcoMessage("error", "移除API权限失败");
        return false;
    } finally {
        removingId.value = 0;
    }
};

// 关闭抽屉
const handleClose = () => {
    emit("update:visible", false);
};

// 获取请求方法标签颜色
const getMethodColor = (method: string): string => {
    const colors: Record<string, string> = {
        GET: "blue",
        POST: "green",
        PUT: "orange",
        DELETE: "red",
        PATCH: "purple"
    };
    return colors[method] || "gray";
};

// 监听抽屉显示状态
watch(
    () => props.visible,
    newVal => {
        if (newVal) {
            menuIdRef.value = props.menuId;
            assignedList.value = [];
            selectedIds.value = [];
            addModalVisible.value = false;
            loadAssignedList();
        }
    }
);
</script>

<style lang="scss" scoped>
.api-permission-container {
    .actions-card {
        margin-bottom: 16px;

        :deep(.arco-card-body) {
            padding: 12px 20px;
        }
    }
}
</style>
