import { ref } from "vue";

// 跨页面一次性菜单定位：接口管理跳转前写入，菜单管理页消费后即清空（刷新自然失效）
const pendingMenuId = ref<number | null>(null);

export const useMenuLocate = () => {
    const setPendingMenuId = (id: number) => {
        pendingMenuId.value = id;
    };
    const consumePendingMenuId = () => {
        const id = pendingMenuId.value;
        pendingMenuId.value = null;
        return id;
    };
    return { setPendingMenuId, consumePendingMenuId };
};
