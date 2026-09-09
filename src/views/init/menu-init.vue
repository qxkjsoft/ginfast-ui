<template>
    <div class="menu-init-page">
        <a-card class="menu-init-card" :bordered="false">
            <div class="init-header">
                <icon-apps :size="28" class="init-icon" />
                <span class="init-title">系统菜单初始化</span>
            </div>
            <a-alert type="info" style="margin: 16px 0;">
                当前系统菜单为空（全新部署）。首次部署后端已按 config.yml 的 server.initadmin 配置自动创建超管账号，
                请使用超管账号登录后，从服务器备份文件中选择一份菜单备份进行恢复，恢复完成将自动进入系统。
            </a-alert>
            <a-space :size="12">
                <a-button type="primary" @click="restoreVisible = true">
                    <template #icon>
                        <icon-undo />
                    </template>
                    从备份恢复菜单
                </a-button>
                <a-button :loading="retrying" @click="onRetry">
                    <template #icon>
                        <icon-refresh />
                    </template>
                    重新加载路由
                </a-button>
                <a-button status="danger" type="outline" @click="onLogout">
                    <template #icon>
                        <icon-export />
                    </template>
                    退出登录
                </a-button>
            </a-space>
        </a-card>

        <!-- 菜单恢复弹窗（恢复成功后自动刷新路由进入系统） -->
        <s-menu-restore-modal v-model:visible="restoreVisible" title="菜单初始化 - 从备份恢复" :show-relogin-tip="false"
            @success="onRestored" />
    </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { Message } from "@arco-design/web-vue";
import { HOME_PATH } from "@/config/index";
import { useRouteConfigStore } from "@/store/modules/route-config";
import { useSysConfigStore } from "@/store/modules/sys-config";
import { useUserStoreHook } from "@/store/modules/user";

const router = useRouter();
const routeStore = useRouteConfigStore();
const restoreVisible = ref(false);
const retrying = ref(false);

// 恢复成功后重新初始化路由，直接进入系统
const onRestored = async () => {
    Message.success("菜单恢复成功，正在进入系统...");
    await retryInit();
};

// 重新拉取路由并进入后台
const retryInit = async () => {
    try {
        retrying.value = true;
        await routeStore.initSetRouter();
        if (routeStore.routeTree.length) {
            router.replace(HOME_PATH);
        } else {
            Message.warning("路由仍为空，请确认菜单已恢复成功");
        }
    } catch (error) {
        console.error("初始化路由失败:", error);
        Message.error("初始化路由失败，请重试");
    } finally {
        retrying.value = false;
    }
};

const onRetry = () => retryInit();

// 退出登录返回登录页
const onLogout = () => {
    useUserStoreHook().logOut();
};

// 已完成初始化（菜单非空）时访问本页，直接进入系统
const initGuard = async () => {
    try {
        await useSysConfigStore().getConfig();
    } catch {
        // 配置拉取失败不阻塞，按菜单为空处理
    }
    if (!useSysConfigStore().menuEmpty) {
        router.replace(HOME_PATH);
    }
};
initGuard();
</script>

<style lang="scss" scoped>
.menu-init-page {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    padding: 16px;
    overflow: hidden;

    .menu-init-card {
        width: 560px;
        max-width: 92vw;
    }

    .init-header {
        display: flex;
        align-items: center;
        gap: 10px;

        .init-icon {
            color: rgb(var(--primary-6));
        }

        .init-title {
            font-size: 20px;
            font-weight: 600;
            color: var(--color-text-1);
        }
    }
}
</style>
