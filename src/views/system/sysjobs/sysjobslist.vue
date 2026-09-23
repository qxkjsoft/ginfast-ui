<template>
 <div class="snow-page">
    <div class="snow-inner">
        <a-card :loading="loading" :bordered="false">
            <a-space wrap>
                <!-- 查询表单-->
                <!-- 任务ID精确查询 -->
                <a-input v-model="searchForm.id" placeholder="请输入任务ID" style="width: 240px;" />

                <!-- 任务分组名称模糊查询 -->
                <a-input-search v-model="searchForm.group" placeholder="请输入任务分组名称搜索" style="width: 240px;" @search="handleSearch" allow-clear />

                <!-- 任务名称模糊查询（仅非数值类型支持） -->
                <a-input-search v-model="searchForm.name" placeholder="请输入任务名称搜索" style="width: 240px;" @search="handleSearch" allow-clear />
                <!-- 执行器名称选择框查询（radio/select/checkbox统一使用select） -->
                <a-select v-model="searchForm.executorName" placeholder="请选择执行器名称" style="width: 240px;" allow-clear>
                    <a-option v-for="executor in executorList" :key="executor" :value="executor">{{ executor }}</a-option>
                </a-select>
                <!-- 执行策略选择框查询（radio/select/checkbox统一使用select） -->
                <a-select v-model="searchForm.executionPolicy" placeholder="请选择执行策略" style="width: 240px;" allow-clear>
                    <a-option :value="0">单次执行</a-option>
                    <a-option :value="1">重复执行</a-option>
                </a-select>
                <!-- 任务状态选择框查询（radio/select/checkbox统一使用select） -->
                <a-select v-model="searchForm.status" placeholder="请选择任务状态" style="width: 240px;" allow-clear>
                    <a-option :value="1">启用</a-option>
                    <a-option :value="0">禁用</a-option>
                </a-select>
                <a-button type="primary" @click="handleSearch">查询</a-button>
                <a-button @click="handleReset">重置</a-button>
                <a-button type="primary" @click="handleCreate" v-hasPerm="['system:sysjobs:add']">
                    <template #icon>
                        <icon-plus />
                    </template>
                    <span>新增数据</span>
                </a-button>
            </a-space>

            <a-table :data="dataList" :loading="loading" :pagination="paginationConfig"
                :bordered="{ wrapper: true, cell: true }" :scroll="{ x: '120%' }" @page-change="handlePageChange"
                @page-size-change="handlePageSizeChange">
                <template #columns>
                    <a-table-column title="任务ID" data-index="id"  :width="150"  ellipsis tooltip/>
                    <a-table-column title="任务分组名称" data-index="group"  :width="150"  ellipsis tooltip/>
                    <a-table-column title="任务名称" data-index="name"  :width="150"  ellipsis tooltip/>
                    <a-table-column title="执行器名称" data-index="executorName"  :width="150"  ellipsis tooltip/>
                    <a-table-column title="执行策略" data-index="executionPolicy"  :width="150"  ellipsis tooltip>
                        <template #cell="{ record }">
                            {{ formatExecutionPolicy(record['executionPolicy']) }}
                        </template>
                    </a-table-column>
                    <a-table-column title="任务状态" data-index="status"  :width="150"  ellipsis tooltip>
                        <template #cell="{ record }">
                            <a-switch
                                v-model="record.status"
                                :checked-value="1"
                                :unchecked-value="0"
                                :loading="statusLoading[record.id]"
                                @change="(value: number | boolean) => handleStatusChange(record, value)"
                                :checked-text="'启用'"
                                :unchecked-text="'禁用'"
                            />
                        </template>
                    </a-table-column>
                    <a-table-column title="Cron表达式" data-index="cronExpression"  :width="150"  ellipsis tooltip/>
                    <a-table-column title="阻塞策略" data-index="blockingPolicy"  :width="150"  ellipsis tooltip>
                        <template #cell="{ record }">
                            {{ formatBlockingPolicy(record['blockingPolicy']) }}
                        </template>
                    </a-table-column>
                    <a-table-column title="创建时间" data-index="createdAt"  :width="150"  ellipsis tooltip>
                        <template #cell="{ record }">
                            {{ record['createdAt'] ? formatTime(record['createdAt']) : "" }}
                        </template>
                    </a-table-column>
                    <a-table-column title="操作" :width="320" :fixed="isMobile ? '' : 'right'">
                        <template #cell="{ record }">
                            <a-space>
                                <a-button size="small" type="outline" @click="handleExecuteNow(record)" v-hasPerm="['system:sysjobs:executeNow']">
                                    执行一次
                                </a-button>
                                <a-button size="small" @click="handleViewLogs(record)">
                                    日志
                                </a-button>
                                <a-button size="small" @click="handleEdit(record)" v-hasPerm="['system:sysjobs:edit']">
                                    编辑
                                </a-button>
                                <a-popconfirm content="确定要删除这条数据吗？" @ok="handleDelete(record.id)">
                                    <a-button size="small" status="danger" v-hasPerm="['system:sysjobs:delete']">
                                        删除
                                    </a-button>
                                </a-popconfirm>
                            </a-space>
                        </template>
                    </a-table-column>
                </template>
            </a-table>

        </a-card>

        <!-- 编辑/创建弹窗 -->
        <a-modal v-model:visible="modalVisible" :title="editingData.id ? '编辑数据' : '新增数据'" :on-before-ok="handleSave"
            @cancel="handleCancel" :width="layoutMode.width">
            <a-form :model="editingData" :rules="rules" ref="formRef" :layout="layoutMode.layout" auto-label-width>
                <a-form-item field="group" label="任务分组名称">
                    <a-input v-model="editingData.group" placeholder="请输入任务分组名称" allow-clear />
                </a-form-item>
                <a-form-item field="name" label="任务名称">
                    <a-input v-model="editingData.name" placeholder="请输入任务名称" />
                </a-form-item>
                <a-form-item field="description" label="任务描述">
                    <a-textarea v-model="editingData.description" placeholder="请输入任务描述" />
                </a-form-item>
                <a-form-item field="executorName" label="执行器名称">
                    <a-select v-model="editingData.executorName" placeholder="请选择执行器名称">
                        <a-option v-for="executor in executorList" :key="executor" :value="executor">{{ executor }}</a-option>
                    </a-select>
                </a-form-item>
                <a-form-item field="executionPolicy" label="执行策略">
                    <a-select v-model="editingData.executionPolicy" placeholder="请选择执行策略">
                        <a-option  :value="0">单次执行</a-option>
                        <a-option  :value="1">重复执行</a-option>
                    </a-select>
                    <template #extra v-if="editingData.executionPolicy === 0">   
                        单次执行：仅执行一次任务。执行成功后任务状态将自动变更为停用。
                    </template>
                </a-form-item>
                <a-form-item field="status" label="任务状态">
                    <a-radio-group v-model="editingData.status">
                        <a-radio :value="1">启用</a-radio>
                        <a-radio :value="0">停用</a-radio>
                    </a-radio-group>
                </a-form-item>
                <a-form-item field="cronExpression" label="Cron表达式">
                    <a-input v-model="editingData.cronExpression" placeholder="请输入Cron表达式" />
                    <template #extra>
                        <div style="margin-top: 8px;">
                            <div style="font-weight: 500; margin-bottom: 4px;">常用示例：</div>
                            <a-space direction="vertical" size="small" :style="{ width: '100%' }">
                                <a-space>
                                    <a-tag color="arcoblue" @click="editingData.cronExpression = '*/5 * * * * ?'">*/5 * * * * ?</a-tag>
                                    <span>每5秒</span>
                                </a-space>
                                <a-space>
                                    <a-tag color="arcoblue" @click="editingData.cronExpression = '0 0 0 * * ?'">0 0 0 * * ?</a-tag>
                                    <span>每天零点</span>
                                </a-space>
                                <a-space>
                                    <a-tag color="arcoblue" @click="editingData.cronExpression = '0 0 */1 * * ?'">0 0 */1 * * ?</a-tag>
                                    <span>每小时</span>
                                </a-space>
                                <a-space>
                                    <a-tag color="arcoblue" @click="editingData.cronExpression = '0 */5 * * * ?'">0 */5 * * * ?</a-tag>
                                    <span>每5分钟</span>
                                </a-space>
                                <a-space>
                                    <a-tag color="arcoblue" @click="editingData.cronExpression = '0 0 2 * * ?'">0 0 2 * * ?</a-tag>
                                    <span>每天凌晨2点</span>
                                </a-space>
                                <a-space>
                                    <a-tag color="arcoblue" @click="editingData.cronExpression = '0 0 0 1 * ?'">0 0 0 1 * ?</a-tag>
                                    <span>每月1号零点</span>
                                </a-space>
                                <a-space>
                                    <a-tag color="arcoblue" @click="editingData.cronExpression = '0 0 0 ? * MON'">0 0 0 ? * MON</a-tag>
                                    <span>每周一零点</span>
                                </a-space>
                            </a-space>
                            <div style="margin-top: 8px; font-size: 12px; color: var(--color-text-3);">
                                <div>格式：秒 分 时 日 月 周 [年]</div>
                                <div>秒: 0-59，分: 0-59，时: 0-23，日: 1-31，月: 1-12，周: 1-7(1=周日)</div>
                                <div>特殊字符：*任意，?不指定，-范围，/间隔，,列表，L最后，W工作日，#第n周</div>
                            </div>
                        </div>
                    </template>
                </a-form-item>
                <a-form-item field="parameters" label="任务参数">
                    <a-textarea v-model="editingData.parameters" placeholder="请输入任务参数" />
                     <template #extra>  
                        JSON格式, 例如: {"param1": "value1", "param2": "value2"}
                     </template>
                </a-form-item>
                <a-form-item field="blockingPolicy" label="阻塞策略">
                    <a-select v-model="editingData.blockingPolicy" placeholder="请选择阻塞策略">
                        <a-option  :value="0">丢弃</a-option>
                        <a-option  :value="1">并行</a-option>
                    </a-select>
                </a-form-item>
                <a-form-item field="parallelNum" label="并行数" v-if="editingData.blockingPolicy === 1">
                    <a-input-number v-model="editingData.parallelNum" placeholder="请输入并行数" />
                    <template #extra>
                        阻塞策略并行时生效，0表示不限制并行数，超过并行数的任务会被丢弃
                    </template>
                </a-form-item>
                <a-form-item field="timeout" label="超时时间(秒)">
                    <a-input-number v-model="editingData.timeout" placeholder="请输入超时时间(秒)" />
                    <template #extra>
                        任务执行超时时间的秒数，设置在执行器的Context参数中，请设置一个大于零的合理时间
                    </template>
                </a-form-item>
                <a-form-item field="maxRetry" label="最大重试次数">
                    <a-input-number v-model="editingData.maxRetry" placeholder="请输入最大重试次数" />
                    <template #extra>
                        任务失败最大重试次数，0表示不重试
                    </template>
                </a-form-item>
                <a-form-item field="retryInterval" label="重试间隔(秒)">
                    <a-input-number v-model="editingData.retryInterval" placeholder="请输入重试间隔(秒)" />
                    <template #extra>   
                        任务失败重试时间隔的秒数
                    </template>
                </a-form-item>

            </a-form>
        </a-modal>
    </div>
</div>  
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSysJobsPluginHook } from '@/hooks/useSysJobs';
import type { SysJobsData } from '@/api/sysjobs';
import { getExecutorsList, setSysJobsStatus, executeSysJobsNow } from '@/api/sysjobs';
import { formatTime } from '@/globals';
import { Message } from '@arco-design/web-vue';
import { useDevicesSize } from '@/hooks/useDevicesSize';

const router = useRouter();
const { isMobile } = useDevicesSize();
const layoutMode = computed(() => {
    const info = {
        mobile: {
            width: '95%',
            layout: 'vertical' as const
        },
        desktop: {
            width: '600px',
            layout: 'horizontal' as const
        }
    };
    return isMobile.value ? info.mobile : info.desktop;
});
const {
    dataList,
    loading,
    total,
    currentPage,
    pageSize,
    fetchDataList,
    createData,
    updateData,
    deleteData,
    getDetail,
    resetSearchParams
} = useSysJobsPluginHook();

const modalVisible = ref(false);
const formRef = ref();
// 分组改为手动输入后暂不使用硬编码分组列表，保留备用
// const groupList = ref<{ key: string; name: string; }[]>([
//     { key: 'default', name: '默认' },
// ]);
const executorList = ref<string[]>([]);
// 搜索表单
const searchForm = reactive({
    id: '',
    group: '',
    name: '',
    executorName: '',
    executionPolicy: undefined,
    status: undefined,
});

const editingData = reactive<Partial<SysJobsData>>({
    id: undefined,
    group: 'default',
    name: undefined,
    description: undefined,
    executorName: undefined,
    executionPolicy: undefined,
    status: 0,
    cronExpression: undefined,
    parameters: undefined,
    blockingPolicy: undefined,
    timeout: 60,
    maxRetry: 3,
    retryInterval: 10,
    parallelNum: 0,
    runningCount: undefined,
});

const rules = {
    group: [{ required: true, message: '任务分组名称不能为空' }],
    name: [{ required: true, message: '任务名称不能为空' }],
    executorName: [{ required: true, message: '执行器名称不能为空' }],
    executionPolicy: [{ required: true, message: '执行策略不能为空' }],
    cronExpression: [{ required: true, message: 'Cron表达式不能为空' }],
    // 任务参数可留空；非空时必须是JSON对象（调度器参数为map类型）
    parameters: [{
        validator: (value: string, cb: (error?: string) => void) => {
            const str = typeof value === 'string' ? value.trim() : '';
            if (str === '') return cb();
            try {
                const parsed = JSON.parse(str);
                if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) return cb();
            } catch {
                // 非法JSON，统一走下方提示
            }
            cb('任务参数必须是JSON对象格式，例如 {"param1": "value1"}');
        }
    }],
};

// 分页配置
const paginationConfig = computed(() => ({
    total: total.value,
    current: currentPage.value,
    pageSize: pageSize.value,
    showTotal: true,
    showJumper: true,
    showPageSize: true,
    pageSizeOptions: [10, 20, 30, 50],
}));

// 获取数据列表
const loadData = async (pageNum: number = currentPage.value, pageSizeVal: number = pageSize.value) => {
    const params: any = {
        pageNum,
        pageSize: pageSizeVal,
    };
    if (searchForm.id) {
        params.id = searchForm.id;
    }
    if (searchForm.group) {
        params.group = searchForm.group;
    }
    if (searchForm.name) {
        params.name = searchForm.name;
    }
    if (searchForm.executorName) {
        params.executorName = searchForm.executorName;
    }
    if (searchForm.executionPolicy !== undefined && searchForm.executionPolicy !== null) {
        params.executionPolicy = searchForm.executionPolicy;
    }
    if (searchForm.status !== undefined && searchForm.status !== null) {
        params.status = searchForm.status;
    }
    await fetchDataList(params);
};

// 处理分页变化
const handlePageChange = (page: number) => {
    loadData(page, pageSize.value);
};

// 处理页面大小变化
const handlePageSizeChange = (size: number) => {
    loadData(1, size); // 页码重置为1
};

// 搜索处理
const handleSearch = () => {
    loadData(1); // 搜索时重置到第一页
};

// 重置搜索
const handleReset = () => {
    searchForm.id = '';
    searchForm.group = '';
    searchForm.name = '';
    searchForm.executorName = '';
    searchForm.executionPolicy = undefined;
    searchForm.status = undefined;
    resetSearchParams();
    loadData(1);
};

// 新增数据
const handleCreate = () => {
    // 重置表单数据
    Object.assign(editingData, {
        id: undefined,
        group: 'default',
        name: undefined,
        description: undefined,
        executorName: undefined,
        executionPolicy: undefined,
        status: 0,
        cronExpression: undefined,
        parameters: undefined,
        blockingPolicy: undefined,
        timeout: 60,
        maxRetry: 3,
        retryInterval: 10,
        parallelNum: 0,
        runningCount: undefined,
    });
    modalVisible.value = true;
};

// 编辑数据
const handleEdit = async (record: SysJobsData) => {
    //console.log(record)
    // 获取详情
    const detail = await getDetail(record.id);
    // 赋值给编辑数据
    Object.assign(editingData, detail.data);
    // 将纳秒转换为秒（1秒 = 1,000,000,000纳秒）
    if (editingData.timeout !== undefined && editingData.timeout !== null) {
        editingData.timeout = editingData.timeout / 1000000000;
    }
    if (editingData.retryInterval !== undefined && editingData.retryInterval !== null) {
        editingData.retryInterval = editingData.retryInterval / 1000000000;
    }
    modalVisible.value = true;
};

// 删除数据
const handleDelete = async (id: string) => {
    try {
        await deleteData(id);
        // 重新加载当前页数据
        await loadData();
        // 显示删除成功消息
        // 这里可以使用项目的消息提示机制
    } catch (error) {
        // 显示删除失败消息
        console.error('删除失败:', error);
    }
};

// 保存数据
const handleSave = async () => {
    const isValid = await formRef.value?.validate();
    if (isValid) return false;
    try {
        const dataToSave = JSON.parse(JSON.stringify(editingData));
        // 将秒转换为纳秒（1秒 = 1,000,000,000纳秒）
        if (dataToSave.timeout !== undefined && dataToSave.timeout !== null) {
            dataToSave.timeout = dataToSave.timeout * 1000000000;
        }
        if (dataToSave.retryInterval !== undefined && dataToSave.retryInterval !== null) {
            dataToSave.retryInterval = dataToSave.retryInterval * 1000000000;
        }
        if (editingData.id) {
            // 更新数据
            await updateData(dataToSave);
        } else {
            // 创建数据
            await createData(dataToSave);
        }
        // 重新加载数据
        await loadData();
    } catch (error) {
        console.error('保存失败:', error);
        return false;
    }
    return true;
};

// 取消操作
const handleCancel = () => {
    modalVisible.value = false;
};

// 获取执行器列表
const loadExecutorList = async () => {
    try {
        const response = await getExecutorsList();
        executorList.value = response.data.list || [];
    } catch (error) {
        console.error('获取执行器列表失败:', error);
        executorList.value = [];
    }
};

// 格式化执行策略
const formatExecutionPolicy = (value: number) => {
    const policyMap: Record<number, string> = {
        0: '单次执行',
        1: '重复执行'
    };
    return policyMap[value] || '-';
};


// 格式化阻塞策略
const formatBlockingPolicy = (value: number) => {
    const policyMap: Record<number, string> = {
        0: '丢弃',
        1: '并行'
    };
    return policyMap[value] || '-';
};

// 状态切换loading状态
const statusLoading = reactive<Record<string, boolean>>({});

// 处理状态切换
const handleStatusChange = async (record: SysJobsData, value: number | boolean) => {
    statusLoading[record.id] = true;
    try {
        await setSysJobsStatus(record.id, Number(value));
        Message.success(value === 1 ? '任务已启用' : '任务已禁用');
    } catch (error) {
        // 切换失败时恢复原状态
        record.status = value === 1 ? 0 : 1;
        Message.error('状态切换失败');
        console.error('状态切换失败:', error);
    } finally {
        statusLoading[record.id] = false;
    }
};

// 立即执行任务
const handleExecuteNow = async (record: SysJobsData) => {
    try {
        await executeSysJobsNow(record.id);
        Message.success('任务已提交执行');
    } catch (error) {
        Message.error('执行任务失败');
        console.error('执行任务失败:', error);
    }
};

// 查看日志
const handleViewLogs = (record: SysJobsData) => {
    router.push({
        path: '/system/joblog',
        query: { jobId: record.id }
    });
};

onMounted(async () => {
    // 初始化加载数据
    await loadData();
    // 加载执行器列表
    await loadExecutorList();
})

</script>

<style scoped lang="scss">

</style>