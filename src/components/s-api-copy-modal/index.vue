<template>
    <a-modal v-model:visible="visibleModel" :title="title" :width="modalWidth" :mask-closable="false" draggable
        @before-ok="handleOk">
        <div class="api-copy-modal-container">
            <a-form :model="form" auto-label-width>
                <a-form-item field="sourceMenuId" label="来源菜单">
                    <a-tree-select v-model="form.sourceMenuId" :data="menuTree" :field-names="fieldNames"
                        :tree-props="{ defaultExpandAll: true }" placeholder="请选择来源菜单" allow-clear allow-search
                        @change="loadSourceCount" />
                </a-form-item>
            </a-form>

            <a-alert v-if="form.sourceMenuId && sourceApiCount > 0" type="info">
                「{{ sourceMenuTitle }}」已分配 {{ sourceApiCount }} 个API权限，导入后将与当前菜单的API权限合并（重复的自动去重），来源菜单的权限保持不变。
            </a-alert>
            <a-alert v-else-if="form.sourceMenuId" type="warning">
                该菜单尚未分配任何API权限，无法导入。
            </a-alert>
        </div>
    </a-modal>
</template>

<script setup lang="ts">
import { getMenuApisAPI, setMenuApisAPI } from "@/api/sysapi";
import { getMenuListAPI, type MenuItem } from "@/api/menu";
import { useDevicesSize } from "@/hooks/useDevicesSize";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

interface Props {
    visible: boolean;
    /** 目标菜单ID：导入的API权限将合并进该菜单 */
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
const modalWidth = computed(() => (isMobile.value ? "95%" : "480px"));

const visibleModel = computed({
    get: () => props.visible,
    set: (value: boolean) => emit("update:visible", value)
});

// 弹窗标题
const title = computed(() => {
    return props.menuName ? `从其他菜单导入API权限 - ${props.menuName}` : "从其他菜单导入API权限";
});

interface MenuNode {
    id: number;
    title: string;
    children: MenuNode[] | null;
}

// 来源菜单选择
const form = ref({ sourceMenuId: 0 });
const menuTree = ref<MenuNode[]>([]);
const fieldNames = { key: "id", title: "title", children: "children" };

// 来源菜单已分配的API数量
const sourceApiCount = ref(0);

// 来源菜单标题（用于提示文案）
const sourceMenuTitle = computed(() => {
    const findTitle = (items: MenuNode[]): string => {
        for (const item of items) {
            if (item.id === form.value.sourceMenuId) return item.title;
            if (item.children) {
                const found = findTitle(item.children);
                if (found) return found;
            }
        }
        return "";
    };
    return findTitle(menuTree.value);
});

// 菜单树转换为选择器数据，排除目标菜单自身；标题走 i18n 翻译（无翻译时回退原标题），与侧边栏等处显示一致
const toTreeData = (items: MenuItem[]): MenuNode[] => {
    return items
        .filter(item => item.id !== props.menuId)
        .map(item => ({
            id: item.id,
            title: t(`menu.${item.title}`),
            children: item.children ? toTreeData(item.children) : null
        }));
};

// 加载菜单树
const loadMenuTree = async () => {
    try {
        const res = await getMenuListAPI();
        const list = Array.isArray(res.data) ? res.data : [];
        menuTree.value = toTreeData(list);
    } catch (error) {
        console.error("获取菜单列表失败:", error);
        menuTree.value = [];
        arcoMessage("error", "获取菜单列表失败");
    }
};

// 加载来源菜单已分配的API数量
const loadSourceCount = async () => {
    sourceApiCount.value = 0;
    if (!form.value.sourceMenuId) return;
    try {
        const res = await getMenuApisAPI(form.value.sourceMenuId);
        sourceApiCount.value = Array.isArray(res.data) ? res.data.length : 0;
    } catch (error) {
        console.error("获取菜单API失败:", error);
    }
};

// 确认导入：仅写目标菜单——目标现有权限与来源菜单权限合并去重后全量保存，来源菜单不做任何修改
const handleOk = async (): Promise<boolean> => {
    if (!props.menuId) {
        arcoMessage("error", "菜单ID不能为空");
        return false;
    }
    if (!form.value.sourceMenuId) {
        arcoMessage("warning", "请选择来源菜单");
        return false;
    }
    if (sourceApiCount.value === 0) {
        arcoMessage("warning", "该菜单尚未分配任何API权限");
        return false;
    }

    try {
        const [currentRes, sourceRes] = await Promise.all([
            getMenuApisAPI(props.menuId),
            getMenuApisAPI(form.value.sourceMenuId)
        ]);
        const currentIds = Array.isArray(currentRes.data) ? currentRes.data : [];
        const sourceIds = Array.isArray(sourceRes.data) ? sourceRes.data : [];
        if (sourceIds.length === 0) {
            arcoMessage("warning", "该菜单尚未分配任何API权限");
            return false;
        }

        const apiIds = [...new Set([...currentIds, ...sourceIds])];
        await setMenuApisAPI({
            menuId: props.menuId,
            apiIds
        });

        arcoMessage("success", `已导入 ${apiIds.length - currentIds.length} 个API权限`);
        emit("success");
        visibleModel.value = false;
        return true;
    } catch (error) {
        console.error("导入API权限失败:", error);
        arcoMessage("error", "导入API权限失败");
        return false;
    }
};

// 监听弹窗状态：打开时重置并加载菜单树
watch(
    () => props.visible,
    newVal => {
        if (newVal) {
            form.value.sourceMenuId = 0;
            sourceApiCount.value = 0;
            loadMenuTree();
        }
    }
);
</script>

<style lang="scss" scoped>
.api-copy-modal-container {
    padding-top: 8px;
}
</style>
