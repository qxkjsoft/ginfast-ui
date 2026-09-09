<template>
    <a-modal width="80%" v-model:visible="modalVisible" :on-before-ok="onConfirmSync" @cancel="onSyncClose"
        :ok-text="'确认同步'" :ok-loading="syncLoading" :mask-closable="false" draggable>
        <template #title>
            <a-space>
                <icon-sync />
                <span>路由同步预览</span>
                <a-popover position="bottom" title="统计说明" content-class="sync-help-content"
                    :content-style="{ maxWidth: '380px' }">
                    <icon-question-circle class="sync-help-icon" />
                    <template #content>
                        <p><b>总计</b>：实际参与对比的候选路由数（已存在于库中的不同步、不在明细中展示）</p>
                        <p><b>新增</b>：代码中有、数据库中无（含恢复曾被软删除的行），同步时写入</p>
                        <p>明细中的中文名/分组可直接编辑，同步以编辑后的值为准；重新预览会恢复推导值</p>
                        <p><b>孤儿</b>：数据库有、代码中已不存在，可手动删除，仅提示不自动清理</p>
                    </template>
                </a-popover>
            </a-space>
        </template>
        <div class="sync-modal-body">
            <!-- 顶部统计 -->
            <a-space wrap class="sync-stats">
                <a-tag color="arcoblue">总计 {{ syncResult.total }}</a-tag>
                <a-tag color="green">新增 {{ syncResult.inserted }}</a-tag>
                <a-tag v-if="syncResult.orphanList && syncResult.orphanList.length" color="red">
                    孤儿 {{ syncResult.orphanList.length }}
                </a-tag>
                <a-tag v-if="syncSelectedKeys.length" color="purple">
                    已选 {{ syncSelectedKeys.length }}
                </a-tag>
            </a-space>

            <!-- 搜索框 -->
            <div class="sync-search">
                <a-input v-model="syncSearchKey" placeholder="搜索API路径" allow-clear style="width: 280px">
                    <template #prefix><icon-search /></template>
                </a-input>
            </div>

            <!-- 明细表格 -->
            <a-table row-key="syncKey" :data="syncTableData" :bordered="{ cell: true }"
                :loading="syncPreviewLoading" :pagination="{ pageSize: 10, showTotal: true }"
                :scroll="{ y: '360px' }" v-model:selectedKeys="syncSelectedKeys"
                :row-selection="{ type: 'checkbox', showCheckedAll: true }">
                <template #columns>
                    <a-table-column title="API路径" data-index="path" :width="240" ellipsis tooltip></a-table-column>
                    <a-table-column title="方法" :width="90" align="center">
                        <template #cell="{ record }">
                            <a-tag :color="getMethodColor(record.method)">{{ record.method }}</a-tag>
                        </template>
                    </a-table-column>
                    <a-table-column title="中文名" :width="180">
                        <template #cell="{ record }">
                            <a-input :model-value="record.title" size="small" placeholder="中文名"
                                @update:model-value="onEditDetail(record, 'title', $event)" />
                        </template>
                    </a-table-column>
                    <a-table-column title="分组" :width="160">
                        <template #cell="{ record }">
                            <a-input :model-value="record.apiGroup" size="small" placeholder="分组"
                                @update:model-value="onEditDetail(record, 'apiGroup', $event)" />
                        </template>
                    </a-table-column>
                </template>
            </a-table>

            <!-- 孤儿路由（DB 有但代码无） -->
            <a-collapse v-if="syncResult.orphanList && syncResult.orphanList.length" :default-active-key="[]"
                class="sync-orphan">
                <a-collapse-item key="orphan"
                    :header="`⚠️ 数据库中已不存在的路由 (${syncResult.orphanList.length} 条，仅提示不删除)`">
                    <a-table row-key="syncKey" :data="orphanTableData" :bordered="{ cell: true }"
                        :pagination="{ pageSize: 5 }">
                        <template #columns>
                            <a-table-column title="API路径" data-index="path" :width="240" ellipsis tooltip></a-table-column>
                            <a-table-column title="方法" :width="90" align="center">
                                <template #cell="{ record }">
                                    <a-tag :color="getMethodColor(record.method)">{{ record.method }}</a-tag>
                                </template>
                            </a-table-column>
                            <a-table-column title="中文名" data-index="title" :width="160" ellipsis tooltip></a-table-column>
                            <a-table-column title="分组" data-index="apiGroup" :width="140" ellipsis tooltip></a-table-column>
                            <a-table-column title="操作" :width="80" align="center">
                                <template #cell="{ record }">
                                    <a-popconfirm content="确定删除该孤儿路由吗？删除后将同时清理角色对该接口的权限。"
                                        type="warning" @ok="onDeleteOrphan(record)">
                                        <a-button type="text" status="danger" size="mini">
                                            <template #icon><icon-delete /></template>
                                        </a-button>
                                    </a-popconfirm>
                                </template>
                            </a-table-column>
                        </template>
                    </a-table>
                </a-collapse-item>
            </a-collapse>
        </div>
    </a-modal>
</template>

<script setup lang="ts">
import {
    deleteSysApiAPI,
    previewSysApiRoutesAPI,
    syncSysApiRoutesAPI,
    type SyncItem,
    type SyncPreviewResult
} from "@/api/sysapi";
import { Message } from "@arco-design/web-vue";

interface Props {
    visible: boolean;
}

interface Emits {
    (e: "update:visible", value: boolean): void;
    (e: "success"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 模态框可见性（与 props.visible 双向同步）
const modalVisible = ref(false);
watch(
    () => props.visible,
    (val) => {
        modalVisible.value = val;
        if (val) {
            loadSyncPreview();
        }
    }
);
watch(modalVisible, (val) => {
    if (!val) {
        emit("update:visible", false);
    }
});

const syncPreviewLoading = ref(false);
const syncLoading = ref(false);
// 预览结果
const syncResult = ref<SyncPreviewResult>({
    total: 0,
    inserted: 0,
    skipped: 0,
    filtered: 0,
    details: [],
    orphanList: []
});
// 搜索关键词（仅匹配路径，不区分大小写）
const syncSearchKey = ref("");
// 用户勾选的行 key 列表（格式 "path|method"）
const syncSelectedKeys = ref<string[]>([]);

// 表格显示的明细（跳过行=已存在于库中，不展示；叠加搜索关键词过滤）
const filteredSyncDetails = computed<SyncItem[]>(() => {
    let list = syncResult.value.details.filter((item) => item.action !== "skip");
    const kw = syncSearchKey.value.trim().toLowerCase();
    if (kw) {
        list = list.filter((item) => item.path.toLowerCase().includes(kw));
    }
    return list;
});

// 主表格实际渲染的数据：注入合成字段 syncKey（path|method）作为 row-key
// Arco Design 的 row-key 仅接受字符串字段名，不支持函数，因此需在数据层预计算
const syncTableData = computed(() => {
    return filteredSyncDetails.value.map((item) => ({
        ...item,
        syncKey: item.path + "|" + item.method
    }));
});

// 内联编辑回写：直接修改 syncResult.details 中对应项（按 path|method 定位），
// 搜索过滤重建行时编辑不丢失，同步时随 items 提交最终值
const onEditDetail = (record: SyncItem, field: "title" | "apiGroup", value: string) => {
    const target = syncResult.value.details.find(
        (item) => item.path === record.path && item.method === record.method
    );
    if (target) {
        target[field] = value;
    }
};

// 删除孤儿路由：复用 API 管理的删除接口（后端会连带清理 Casbin 权限与菜单关联）
const onDeleteOrphan = async (record: SyncItem) => {
    if (!record.id) return;
    try {
        await deleteSysApiAPI({ id: record.id });
        syncResult.value.orphanList = (syncResult.value.orphanList || []).filter(
            (item) => !(item.path === record.path && item.method === record.method)
        );
        Message.success(`已删除孤儿路由：${record.path}`);
        emit("success");
    } catch (error) {
        console.error("删除孤儿路由失败", error);
        Message.error("删除孤儿路由失败");
    }
};

// 孤儿表格也注入 syncKey（与主表一致，避免 row-key 冲突警告）
const orphanTableData = computed(() => {
    return (syncResult.value.orphanList || []).map((item) => ({
        ...item,
        syncKey: item.path + "|" + item.method
    }));
});

// 获取请求方法对应的颜色（组件内自包含的纯函数副本）
const getMethodColor = (method: string) => {
    const colorMap: Record<string, string> = {
        GET: "green",
        POST: "blue",
        PUT: "orange",
        DELETE: "red",
        PATCH: "purple"
    };
    return colorMap[method] || "gray";
};

// 加载预览数据
const loadSyncPreview = async () => {
    syncPreviewLoading.value = true;
    try {
        const { data } = await previewSysApiRoutesAPI();
        syncResult.value = data;
        // 预览刷新后清空勾选（默认全不选，用户手动勾选）
        syncSelectedKeys.value = [];
    } catch (error) {
        console.error("预览路由同步失败", error);
        Message.error("预览路由同步失败");
    } finally {
        syncPreviewLoading.value = false;
    }
};

// 关闭弹窗
const onSyncClose = () => {
    syncResult.value = {
        total: 0,
        inserted: 0,
        skipped: 0,
        filtered: 0,
        details: [],
        orphanList: []
    };
    syncSelectedKeys.value = [];
    syncSearchKey.value = "";
};

// 确认同步
const onConfirmSync = async () => {
    // 必须勾选至少一条路由
    if (syncSelectedKeys.value.length === 0) {
        Message.warning("请勾选要同步的路由");
        return false;
    }
    // 取勾选行的最终值（含内联编辑），中文名/分组为空则阻止提交
    const selected = syncResult.value.details.filter((item) =>
        syncSelectedKeys.value.includes(item.path + "|" + item.method)
    );
    if (selected.some((item) => !item.title.trim() || !item.apiGroup.trim())) {
        Message.warning("勾选路由的中文名与分组不能为空");
        return false;
    }
    syncLoading.value = true;
    try {
        const { data } = await syncSysApiRoutesAPI({
            selectedKeys: syncSelectedKeys.value,
            items: selected.map(({ path, method, title, apiGroup }) => ({
                path,
                method,
                title,
                apiGroup
            }))
        });
        Message.success(`同步成功：新增 ${data.inserted} 条`);
        emit("success");
        return true;
    } catch (error) {
        console.error("路由同步失败", error);
        Message.error("路由同步失败");
        return false;
    } finally {
        syncLoading.value = false;
    }
};
</script>

<style lang="scss" scoped>
// 标题问号图标（悬浮气泡触发器）
.sync-help-icon {
    color: var(--color-text-3);
    cursor: help;
}

.sync-modal-body {
    .sync-stats {
        margin-bottom: 12px;
    }

    .sync-search {
        margin-bottom: 12px;
    }

    .sync-orphan {
        margin-top: 12px;
    }
}
</style>

<style lang="scss">
// 气泡内容挂载在 body 下，scoped 样式无法命中，需全局样式
.sync-help-content {
    p {
        margin: 4px 0;
        line-height: 1.6;
    }
}
</style>
