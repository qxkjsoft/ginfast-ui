<template>
    <a-modal v-model:visible="visibleModel" :title="title" :width="modalWidth" :mask-closable="false" draggable
        @before-ok="handleOk">
        <div class="api-select-modal-container">
            <!-- 搜索区域 -->
            <a-form layout="inline" :model="searchForm" auto-label-width>
                <a-form-item field="title" label="API标题">
                    <a-input v-model="searchForm.title" placeholder="请输入API标题" allow-clear style="width: 180px"
                        @keyup.enter="handleSearch" />
                </a-form-item>
                <a-form-item field="path" label="API路径">
                    <a-input v-model="searchForm.path" placeholder="请输入API路径" allow-clear style="width: 200px"
                        @keyup.enter="handleSearch" />
                </a-form-item>
                <a-form-item field="method" label="请求方法">
                    <a-select v-model="searchForm.method" placeholder="请求方法" allow-clear style="width: 120px">
                        <a-option value="GET">GET</a-option>
                        <a-option value="POST">POST</a-option>
                        <a-option value="PUT">PUT</a-option>
                        <a-option value="DELETE">DELETE</a-option>
                        <a-option value="PATCH">PATCH</a-option>
                    </a-select>
                </a-form-item>
                <a-form-item field="apiGroup" label="API分组">
                    <a-input v-model="searchForm.apiGroup" placeholder="API分组" allow-clear style="width: 150px"
                        @keyup.enter="handleSearch" />
                </a-form-item>
                <a-form-item>
                    <a-space>
                        <a-button type="primary" @click="handleSearch">
                            <template #icon><icon-search /></template>
                            查询
                        </a-button>
                        <a-button @click="handleReset">
                            <template #icon><icon-refresh /></template>
                            重置
                        </a-button>
                    </a-space>
                </a-form-item>
            </a-form>

            <!-- 选择状态 -->
            <div class="select-actions">
                <a-space>
                    <a-checkbox v-model="selectAllCurrent" @change="toggleSelectAll" :indeterminate="indeterminate">
                        全选当前页
                    </a-checkbox>
                </a-space>
                <a-space>
                    <span>已选择 <a-tag color="blue">{{ selectedApiIds.length }}</a-tag> 个API</span>
                    <a-button type="outline" size="mini" @click="clearSelection">清空选择</a-button>
                </a-space>
            </div>

            <!-- 待选API列表（不含已分配） -->
            <a-table row-key="id" :data="apiList" :loading="tableLoading" :pagination="pagination"
                :row-selection="rowSelection" v-model:selected-keys="selectedApiIds" @page-change="handlePageChange"
                @page-size-change="handlePageSizeChange" size="small" :bordered="{ cell: true }"
                :scroll="{ y: '300px' }">
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
                </template>
            </a-table>
        </div>
    </a-modal>
</template>

<script setup lang="ts">
import { getSysApiListAPI, getMenuApisAPI, setMenuApisAPI, type SysApiItem, type SysApiListParams } from "@/api/sysapi";
import { useDevicesSize } from "@/hooks/useDevicesSize";
import { formatTime } from "@/globals";

interface Props {
    visible: boolean;
    /** 菜单ID：查询时排除该菜单已分配的API，保存时合并写入 */
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

const { isMobile } = useDevicesSize();
const modalWidth = computed(() => (isMobile.value ? "95%" : "65%"));

const visibleModel = computed({
    get: () => props.visible,
    set: (value: boolean) => emit("update:visible", value)
});

// 弹窗标题
const title = computed(() => {
    return props.menuName ? `添加API权限 - ${props.menuName}` : "添加API权限";
});

// 加载状态
const tableLoading = ref(false);

// 已选择的API ID列表（跨页保留）
const selectedApiIds = ref<number[]>([]);

// 当前菜单已分配的API ID集合（打开时从服务端获取，用于合并保存）
const assignedIds = ref<number[]>([]);

// 待选API列表（已排除当前菜单已分配的API）
const apiList = ref<SysApiItem[]>([]);

// 搜索表单
const searchForm = ref<SysApiListParams>({
    title: "",
    path: "",
    method: "",
    apiGroup: "",
    order: "id DESC"
});

// 分页配置
const pagination = ref({
    current: 1,
    pageSize: 10,
    total: 0,
    showPageSize: true,
    showTotal: true,
    pageSizeOptions: ["10", "20", "50", "100"]
});

// 全选状态
const selectAllCurrent = ref(false);
const indeterminate = ref(false);

// 表格行选择配置
const rowSelection = ref({
    type: "checkbox",
    showCheckedAll: true,
    onlyCurrent: false
});

// 加载当前菜单已分配的API ID
const loadAssignedIds = async () => {
    if (!props.menuId) {
        assignedIds.value = [];
        return;
    }
    try {
        const res = await getMenuApisAPI(props.menuId);
        assignedIds.value = Array.isArray(res.data) ? res.data : [];
    } catch (error) {
        console.error("获取菜单API失败:", error);
        assignedIds.value = [];
    }
};

// 加载待选API列表（排除已分配的API）
const loadApiList = async () => {
    try {
        tableLoading.value = true;
        const res = await getSysApiListAPI({
            ...searchForm.value,
            pageNum: pagination.value.current,
            pageSize: pagination.value.pageSize,
            excludeMenuId: props.menuId || undefined
        });
        apiList.value = res.data.list;
        pagination.value.total = res.data.total;

        updateSelectAllState();
    } catch (error) {
        console.error("获取API列表失败:", error);
        arcoMessage("error", "获取API列表失败");
    } finally {
        tableLoading.value = false;
    }
};

// 搜索API
const handleSearch = () => {
    pagination.value.current = 1;
    loadApiList();
};

// 重置搜索
const handleReset = () => {
    resetSearchForm();
    handleSearch();
};

const resetSearchForm = () => {
    searchForm.value = {
        title: "",
        path: "",
        method: "",
        apiGroup: "",
        order: "id DESC"
    };
};

// 处理分页变化
const handlePageChange = (page: number) => {
    pagination.value.current = page;
    loadApiList();
};

const handlePageSizeChange = (pageSize: number) => {
    pagination.value.pageSize = pageSize;
    pagination.value.current = 1;
    loadApiList();
};

// 全选/取消全选当前页
const toggleSelectAll = (checked: boolean) => {
    const currentPageIds = apiList.value.map(api => api.id);
    if (checked) {
        // 添加当前页所有API到选中列表
        const newSelectedIds = [...new Set([...selectedApiIds.value, ...currentPageIds])];
        selectedApiIds.value = newSelectedIds;
    } else {
        // 从选中列表移除当前页所有API
        selectedApiIds.value = selectedApiIds.value.filter(id => !currentPageIds.includes(id));
    }
    updateSelectAllState();
};

// 更新全选状态
const updateSelectAllState = () => {
    const currentPageIds = apiList.value.map(api => api.id);
    const selectedCurrentPageIds = selectedApiIds.value.filter(id => currentPageIds.includes(id));

    if (selectedCurrentPageIds.length === 0) {
        selectAllCurrent.value = false;
        indeterminate.value = false;
    } else if (selectedCurrentPageIds.length === currentPageIds.length && currentPageIds.length > 0) {
        selectAllCurrent.value = true;
        indeterminate.value = false;
    } else {
        selectAllCurrent.value = false;
        indeterminate.value = true;
    }
};

// 清空选择
const clearSelection = () => {
    selectedApiIds.value = [];
    selectAllCurrent.value = false;
    indeterminate.value = false;
};

// 确认添加：将勾选的API与已分配API合并后全量保存
const handleOk = async (): Promise<boolean> => {
    if (!props.menuId) {
        arcoMessage("error", "菜单ID不能为空");
        return false;
    }
    if (selectedApiIds.value.length === 0) {
        arcoMessage("warning", "请选择要添加的API");
        return false;
    }

    try {
        const apiIds = [...new Set([...assignedIds.value, ...selectedApiIds.value])];
        await setMenuApisAPI({
            menuId: props.menuId,
            apiIds
        });

        arcoMessage("success", "API权限添加成功");
        emit("success");
        visibleModel.value = false;
        return true;
    } catch (error) {
        console.error("添加API权限失败:", error);
        arcoMessage("error", "添加API权限失败");
        return false;
    }
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

// 监听选中的API变化，更新全选状态
watch(
    selectedApiIds,
    () => {
        updateSelectAllState();
    },
    { deep: true }
);

// 监听弹窗状态：打开时重置并加载数据，关闭时清空勾选
watch(
    () => props.visible,
    newVal => {
        if (newVal) {
            resetSearchForm();
            pagination.value.current = 1;
            clearSelection();
            loadAssignedIds();
            loadApiList();
        } else {
            clearSelection();
        }
    }
);
</script>

<style lang="scss" scoped>
.api-select-modal-container {
    .select-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 12px 0;
    }
}
</style>
