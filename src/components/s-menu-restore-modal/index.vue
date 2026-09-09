<template>
    <a-modal :visible="visible" :title="title" width="750px" :footer="false" :mask-closable="false"
        @update:visible="(v: boolean) => emit('update:visible', v)">
        <div class="restore-content">
            <a-alert type="warning" style="margin-bottom: 16px;">
                完全恢复将清空当前全部菜单，并从所选备份文件完整重建（角色的菜单授权会自动重新挂载）{{ showReloginTip ? "。建议恢复后重新登录以刷新路由" : "" }}。
            </a-alert>
            <div style="margin-bottom: 8px; text-align: right;">
                <a-button size="mini" type="outline" :loading="backupLoading" @click="loadBackupList">刷新备份列表</a-button>
            </div>
            <a-table :data="backupList" :loading="backupLoading" :pagination="false" size="small"
                :bordered="{ cell: true }" row-key="filename" v-model:selectedKeys="restoreSelectedKeys"
                :row-selection="{ type: 'radio' }">
                <template #columns>
                    <a-table-column title="备份文件" data-index="filename" tooltip ellipsis></a-table-column>
                    <a-table-column title="大小" align="center" :width="90">
                        <template #cell="{ record }">
                            {{ formatFileSize(record.size) }}
                        </template>
                    </a-table-column>
                    <a-table-column title="备份时间" align="center" :width="200">
                        <template #cell="{ record }">
                            {{ formatBackupTime(record.modTime) }}
                        </template>
                    </a-table-column>
                    <a-table-column title="操作" align="center" :width="80">
                        <template #cell="{ record }">
                            <a-tooltip :content="backupList.length <= 1 ? '至少需要保留一个备份文件，不能删除' : '删除该备份文件'">
                                <a-button type="text" size="mini" status="danger" v-hasPerm="['system:menu:deleteBackup']"
                                    :disabled="backupList.length <= 1"
                                    @click="onDeleteBackup(record.filename)">删除</a-button>
                            </a-tooltip>
                        </template>
                    </a-table-column>
                </template>
                <template #empty>
                    <a-empty description="服务器备份目录下暂无备份文件。全新部署请将 menu_backup_*.json 备份文件放入服务器 resource/database/menu_backup 目录后点击刷新；已有系统请先在菜单管理中备份。"></a-empty>
                </template>
            </a-table>
            <div style="text-align: right; margin-top: 16px;">
                <a-space>
                    <a-button @click="emit('update:visible', false)">取消</a-button>
                    <a-button type="primary" status="danger" :disabled="!selectedBackupFilename"
                        :loading="restoring" @click="onRestoreConfirm">恢复</a-button>
                </a-space>
            </div>
        </div>
    </a-modal>
</template>

<script setup lang="ts">
import { Modal } from '@arco-design/web-vue';
import { getMenuBackupListAPI, restoreMenuAPI, deleteMenuBackupAPI, type MenuBackupFile, type MenuRestoreResult } from "@/api/menu";

// 菜单恢复弹窗（菜单管理与全新部署初始化引导页共用）
const props = withDefaults(defineProps<{
    visible: boolean;      // 弹窗显隐
    title?: string;        // 弹窗标题
    showReloginTip?: boolean; // 恢复成功后是否提示重新登录（初始化引导页会自动刷新路由，无需提示）
}>(), {
    title: "菜单恢复",
    showReloginTip: true
});

const emit = defineEmits<{
    (e: "update:visible", v: boolean): void;
    (e: "success", result: MenuRestoreResult): void;
}>();

const backupList = ref<MenuBackupFile[]>([]);
const backupLoading = ref(false);
const restoring = ref(false);
const restoreSelectedKeys = ref<string[]>([]);

// 当前选中的备份文件名
const selectedBackupFilename = computed(() => restoreSelectedKeys.value[0] || "");

// 加载服务器备份文件列表
const loadBackupList = async () => {
    try {
        backupLoading.value = true;
        const { data } = await getMenuBackupListAPI();
        backupList.value = data || [];
    } finally {
        backupLoading.value = false;
    }
};

// 弹窗打开时重置选择并加载备份文件列表
watch(
    () => props.visible,
    visible => {
        if (!visible) return;
        restoreSelectedKeys.value = [];
        loadBackupList();
    },
    { immediate: true }
);

// 文件大小格式化
const formatFileSize = (size: number) => {
    if (size == null) return "-";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(2)} MB`;
};

// 备份时间格式化（去掉毫秒和时区后缀）
const formatBackupTime = (time: string) => {
    if (!time) return "-";
    return time.replace("T", " ").replace(/(\.\d+)?([+\-]\d{2}:\d{2}|Z)$/, "");
};

// 删除备份文件（至少保留一个备份，仅剩一个时按钮禁用且后端同样拦截）
const onDeleteBackup = (filename: string) => {
    Modal.confirm({
        title: "确认删除备份",
        content: `确定删除备份文件 ${filename} 吗？删除后不可恢复。`,
        okText: "确认删除",
        cancelText: "取消",
        okButtonProps: {
            status: "danger"
        },
        onOk: async () => {
            try {
                const response = await deleteMenuBackupAPI({ filename });
                if (response.code === 0) {
                    // 删除的是当前选中项时清空选择，避免恢复按钮携带已删除的文件名
                    if (selectedBackupFilename.value === filename) {
                        restoreSelectedKeys.value = [];
                    }
                    await loadBackupList();
                }
            } catch (error) {
                console.error(error);
            }
        }
    });
};

// 确认恢复
const onRestoreConfirm = () => {    Modal.confirm({
        title: "确认恢复菜单",
        content: `将清空当前全部菜单，并从备份 ${selectedBackupFilename.value} 完整重建。该操作不可撤销，确定继续吗？`,
        okText: "确认恢复",
        cancelText: "取消",
        okButtonProps: {
            status: "danger"
        },
        onOk: async () => {
            try {
                restoring.value = true;
                const response = await restoreMenuAPI({ filename: selectedBackupFilename.value });
                if (response.code === 0 && response.data) {
                    emit("update:visible", false);
                    Modal.success({
                        title: "恢复成功",
                        content: `共重建 ${response.data.totalMenus} 个菜单、${response.data.totalApis} 个API，重挂 ${response.data.restoredRoleMenus} 条角色授权。${props.showReloginTip ? "建议重新登录以刷新路由。" : ""}`
                    });
                    emit("success", response.data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                restoring.value = false;
            }
        }
    });
};
</script>

<style lang="scss" scoped></style>
