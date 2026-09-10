<template>
  <div class="select-department-container">
    <!-- 已选部门标签组 -->
    <div class="selected-tags-wrapper">
      <a-space v-if="selectedDepartments.length > 0" wrap :size="8">
        <a-tooltip v-for="dept in selectedDepartments" :key="dept.id" :content="dept?.name || ''">
          <a-tag
            closable
            :color="multiple ? 'arcoblue' : 'green'"
            @close="handleRemoveDepartment(dept.id)"
          >
            {{ truncateText(dept?.name || '', maxLabelLength) }}
          </a-tag>
        </a-tooltip>
      </a-space>
      <span v-else class="placeholder-text">{{ placeholder }}</span>
    </div>

    <!-- 操作按钮组 -->
    <div class="action-buttons">
      <a-button size="small" :disabled="disabled" @click="openModal">
        <template #icon>
          <icon-home />
        </template>
        <span>选择部门</span>
      </a-button>
      <a-button
        v-if="selectedDepartments.length > 0"
        size="small"
        :disabled="disabled"
        @click="handleClear"
      >
        <template #icon>
          <icon-delete />
        </template>
        <span>清空</span>
      </a-button>
    </div>

    <!-- 部门选择弹窗 -->
    <a-modal
      v-model:visible="modalVisible"
      title="选择部门"
      :width="700"
      :footer="false"
      :unmount-on-close="true"
      @cancel="handleModalCancel"
    >
      <!-- 搜索区域 -->
      <div class="search-area">
        <a-input
          v-model="searchKeyword"
          placeholder="请输入部门名称搜索"
          allow-clear
          @input="handleSearch"
        >
          <template #prefix>
            <icon-search />
          </template>
        </a-input>
      </div>

      <!-- 部门树形列表 -->
      <div class="tree-area">
        <a-tree
          :data="filteredDepartmentTree"
          :loading="loading"
          :checkable="multiple"
          :checked-keys="checkedKeys"
          :selected-keys="selectedKeys"
          :check-strictly="true"
          :field-names="{ key: 'id', title: 'name', children: 'children' }"
          @check="handleTreeCheck"
          @select="handleTreeSelect"
        >
          <template #title="record">
            <div class="tree-node-content" v-if="record">
              <span class="node-name">{{ record?.name || '' }}</span>
              <a-tag
                v-if="record.status === 1"
                bordered
                size="small"
                color="arcoblue"
              >
                启用
              </a-tag>
              <a-tag v-else bordered size="small" color="red">
                禁用
              </a-tag>
            </div>
          </template>
        </a-tree>
      </div>

      <!-- 底部按钮 -->
      <div class="modal-footer">
        <a-space>
          <a-button @click="handleModalCancel">取消</a-button>
          <a-button type="primary" @click="handleModalConfirm">确定</a-button>
        </a-space>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { getDivisionAPI, getDivisionByIdAPI } from '@/api/department';
import type { DivisionItem } from '@/api/department';

// 部门信息接口（用于已选部门）
interface DepartmentInfo {
  id: number;
  name: string;
}

// Props 定义
interface Props {
  /** 绑定值：单选时为数值，多选时为逗号分隔的字符串 */
  modelValue: number | string | undefined;
  /** 是否多选模式 */
  multiple?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 占位符文本 */
  placeholder?: string;
  /** 标签文本最大长度，超出显示省略号 */
  maxLabelLength?: number;
}

// Emits 定义
interface Emits {
  (e: 'update:modelValue', value: number | string | undefined): void;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  multiple: false,
  disabled: false,
  placeholder: '请选择部门',
  maxLabelLength: 10
});

const emit = defineEmits<Emits>();

// 弹窗显示状态
const modalVisible = ref(false);

// 搜索关键字
const searchKeyword = ref('');

// 加载状态
const loading = ref(false);

// 部门树形数据
const departmentTree = ref<DivisionItem[]>([]);

// 已选部门列表（用于显示）
const selectedDepartments = ref<DepartmentInfo[]>([]);

// 临时选中部门ID集合（弹窗中使用）
const tempSelectedIds = ref<Set<number>>(new Set());

// 多选模式下的 checked keys
const checkedKeys = computed(() => Array.from(tempSelectedIds.value));

// 单选模式下的 selected keys
const selectedKeys = computed(() => {
  if (props.multiple) return [];
  return Array.from(tempSelectedIds.value);
});

// 过滤后的部门树
const filteredDepartmentTree = computed(() => {
  if (!searchKeyword.value) {
    return departmentTree.value;
  }
  return filterTree(departmentTree.value, searchKeyword.value);
});

// 过滤树形数据
const filterTree = (tree: DivisionItem[], keyword: string): DivisionItem[] => {
  const result: DivisionItem[] = [];
  for (const node of tree) {
    const matchName = node.name.toLowerCase().includes(keyword.toLowerCase());
    const filteredChildren = node.children ? filterTree(node.children, keyword) : [];
    
    if (matchName || filteredChildren.length > 0) {
      result.push({
        ...node,
        children: filteredChildren.length > 0 ? filteredChildren : node.children
      });
    }
  }
  return result;
};

// 截断文本函数
const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
};

// 监听 modelValue 变化，同步更新 selectedDepartments
watch(
  () => props.modelValue,
  (newValue) => {
    // 处理 undefined 或 null 或空值的情况
    if (newValue === undefined || newValue === null || newValue === '') {
      selectedDepartments.value = [];
      return;
    }

    if (props.multiple) {
      // 多选模式：从逗号分隔的字符串解析部门ID
      const ids = String(newValue)
        .split(',')
        .map((id) => parseInt(id.trim()))
        .filter((id) => !isNaN(id));
      syncSelectedDepartments(ids);
    } else {
      // 单选模式：直接使用数值
      const id = Number(newValue);
      syncSelectedDepartments(id > 0 ? [id] : []);
    }
  },
  { immediate: true }
);

// 同步已选部门信息
const syncSelectedDepartments = async (deptIds: number[]) => {
  if (deptIds.length === 0) {
    selectedDepartments.value = [];
    return;
  }

  try {
    // 获取部门详情信息
    const promises = deptIds.map((id) => getDepartmentInfo(id));
    const results = await Promise.allSettled(promises);
    const departments: DepartmentInfo[] = results
      .filter((r) => r.status === 'fulfilled' && r.value)
      .map((r) => (r as PromiseFulfilledResult<DepartmentInfo>).value);
    // 过滤掉可能存在的 undefined 或无效数据
    selectedDepartments.value = departments.filter((d) => d && d.id && d.name);
  } catch (error) {
    console.error('获取部门信息失败:', error);
    selectedDepartments.value = [];
  }
};

// 获取单个部门信息
const getDepartmentInfo = async (deptId: number): Promise<DepartmentInfo | null> => {
  try {
    const { data } = await getDivisionByIdAPI(deptId);
    return {
      id: data.id,
      name: data.name
    };
  } catch (error) {
    console.error(`获取部门 ${deptId} 信息失败:`, error);
    return null;
  }
};

// 打开弹窗
const openModal = async () => {
  modalVisible.value = true;
  // 初始化临时选中ID集合
  if (props.modelValue === undefined || props.modelValue === null || props.modelValue === '') {
    tempSelectedIds.value = new Set();
  } else if (props.multiple) {
    const ids = String(props.modelValue)
      .split(',')
      .map((id) => parseInt(id.trim()))
      .filter((id) => !isNaN(id));
    tempSelectedIds.value = new Set(ids);
  } else {
    const id = Number(props.modelValue);
    tempSelectedIds.value = id > 0 ? new Set([id]) : new Set();
  }
  // 重置搜索
  searchKeyword.value = '';
  // 加载部门树
  await loadDepartmentTree();
};

// 加载部门树
const loadDepartmentTree = async () => {
  loading.value = true;
  try {
    const { data } = await getDivisionAPI({ status: 1 });
    departmentTree.value = data.list;
  } catch (error) {
    console.error('加载部门树失败:', error);
  } finally {
    loading.value = false;
  }
};

// 搜索处理
const handleSearch = () => {
  // 搜索通过 computed 自动处理
};

// 树形多选处理
const handleTreeCheck = (_checkedKeys: any, { checkedNodes }: { checkedNodes: any[] }) => {
  if (props.multiple) {
    const ids = checkedNodes.map((node) => node.id);
    tempSelectedIds.value = new Set(ids);
  }
};

// 树形单选处理
const handleTreeSelect = (selectedKeys: any[], { node }: { node: any }) => {
  if (!props.multiple && selectedKeys.length > 0) {
    tempSelectedIds.value = new Set([node.id]);
  }
};

// 移除部门
const handleRemoveDepartment = (deptId: number) => {
  if (props.disabled) return;

  if (props.multiple) {
    const currentValue = props.modelValue ?? '';
    const ids = String(currentValue)
      .split(',')
      .map((id) => parseInt(id.trim()))
      .filter((id) => !isNaN(id) && id !== deptId);
    emit('update:modelValue', ids.join(','));
  } else {
    emit('update:modelValue', 0);
  }
};

// 清空所有选中
const handleClear = () => {
  if (props.disabled) return;

  if (props.multiple) {
    emit('update:modelValue', '');
  } else {
    emit('update:modelValue', 0);
  }
};

// 弹窗取消
const handleModalCancel = () => {
  modalVisible.value = false;
};

// 弹窗确定
const handleModalConfirm = () => {
  if (props.multiple) {
    // 多选模式：输出逗号分隔的字符串，空时返回空字符串
    const ids = Array.from(tempSelectedIds.value).join(',');
    emit('update:modelValue', ids || '');
  } else {
    // 单选模式：输出数值，空时返回 0
    const ids = Array.from(tempSelectedIds.value);
    const id = ids.length > 0 ? ids[0] : 0;
    emit('update:modelValue', id);
  }
  modalVisible.value = false;
};
</script>

<style lang="scss" scoped>
.select-department-container {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .selected-tags-wrapper {
    min-height: 32px;
    padding: 4px 8px;
    border: 1px solid var(--color-border-2);
    border-radius: 4px;
    background-color: var(--color-bg-2);
    display: flex;
    align-items: center;
    transition: all 0.2s;

    &:hover {
      border-color: var(--color-border-3);
    }

    .placeholder-text {
      color: var(--color-text-3);
      font-size: 14px;
    }
  }

  .action-buttons {
    display: flex;
    gap: 8px;
  }
}

// 弹窗样式
.search-area {
  margin-bottom: 16px;
}

.tree-area {
  margin-bottom: 16px;
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid var(--color-border-2);
  border-radius: 4px;
  padding: 12px;

  :deep(.arco-tree) {
    .tree-node-content {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;

      .node-name {
        flex: 1;
      }
    }

    .arco-tree-node {
      padding: 4px 0;

      &:hover {
        background-color: var(--color-fill-2);
      }
    }

    .arco-tree-node-selected {
      background-color: var(--color-primary-light-1);
    }

    .arco-tree-node-checked {
      background-color: var(--color-primary-light-1);
    }
  }
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-1);
}
</style>
