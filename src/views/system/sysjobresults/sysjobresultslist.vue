<template>
 <div class="snow-page">
    <div class="snow-inner">
        <a-card :loading="loading" :bordered="false">
            <a-space wrap>
                <!-- 查询表单-->
                <!-- 任务ID精确查询 -->
                <a-input v-model="searchForm.jobId" placeholder="请输入任务ID" style="width: 240px;" />
                <!-- 执行状态下拉选择 -->
                <a-select v-model="searchForm.status" placeholder="请选择执行状态" style="width: 240px;" allow-clear>
                    <a-option value="SUCCESS">SUCCESS</a-option>
                    <a-option value="FAILED">FAILED</a-option>
                    <a-option value="PANIC">PANIC</a-option>
                </a-select>
                <!-- 开始时间范围查询 -->
                <a-range-picker v-model="searchForm.startTimeRange" show-time format="YYYY-MM-DD HH:mm:ss"
                    style="width: 400px;" :placeholder="['开始时间', '结束时间']" />
                <a-button type="primary" @click="handleSearch">查询</a-button>
                <a-button @click="handleReset">重置</a-button>
            </a-space>

            <a-table :data="dataList" :loading="loading" :pagination="paginationConfig"
                :bordered="{ wrapper: true, cell: true }" :scroll="{ x: '120%' }" @page-change="handlePageChange"
                @page-size-change="handlePageSizeChange">
                <template #columns>
                    <a-table-column title="ID" data-index="id"  :width="80"  ellipsis tooltip/>
                    <a-table-column title="任务ID" data-index="jobId"  :width="150"  ellipsis tooltip/>
                    <a-table-column title="执行状态" data-index="status"  :width="150"  ellipsis tooltip/>
                    <a-table-column title="错误信息" data-index="error"  :width="150"  ellipsis tooltip/>
                    <a-table-column title="开始时间" data-index="startTime"  :width="150"  ellipsis tooltip>
                        <template #cell="{ record }">
                            {{ record['startTime'] ? formatTime(record['startTime']) : "" }}
                        </template>
                    </a-table-column>
                    <a-table-column title="结束时间" data-index="endTime"  :width="150"  ellipsis tooltip>
                        <template #cell="{ record }">
                            {{ record['endTime'] ? formatTime(record['endTime']) : "" }}
                        </template>
                    </a-table-column>
                    <a-table-column title="执行时长(秒)" data-index="duration"  :width="150"  ellipsis tooltip>
                        <template #cell="{ record }">
                            {{ record['duration'] ? (record['duration'] / 1000000000).toFixed(4) : "" }}
                        </template>
                    </a-table-column>
                    <a-table-column title="重试次数" data-index="retryCount"  :width="150"  ellipsis tooltip/>
                    <a-table-column title="操作" :width="150" :fixed="isMobile ? '' : 'right'">
                        <template #cell="{ record }">
                            <a-popconfirm content="确定要删除这条数据吗？" @ok="handleDelete(record.id)">
                                <a-button size="small" status="danger" v-hasPerm="['system:sysjobresults:delete']">
                                    删除
                                </a-button>
                            </a-popconfirm>
                        </template>
                    </a-table-column>
                </template>
            </a-table>

        </a-card>
    </div>
</div>  
</template>

<script setup lang="ts">
import { reactive, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useSysJobResultsPluginHook } from '@/hooks/useSysJobResults';
import { formatTime } from '@/globals';
import { useDevicesSize } from '@/hooks/useDevicesSize';

const route = useRoute();
const { isMobile } = useDevicesSize();
const {
    dataList,
    loading,
    total,
    currentPage,
    pageSize,
    fetchDataList,
    deleteData,
    resetSearchParams
} = useSysJobResultsPluginHook();

// 搜索表单
const searchForm = reactive({
    jobId: '',
    status: '',
    startTimeRange: [],
});


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
    if (searchForm.jobId) {
        params.jobId = searchForm.jobId;
    }
    if (searchForm.status) {
        params.status = searchForm.status;
    }
    if (searchForm.startTimeRange && searchForm.startTimeRange.length === 2) {
        params.startTimeStart = searchForm.startTimeRange[0];
        params.startTimeEnd = searchForm.startTimeRange[1];
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
    searchForm.jobId = '';
    searchForm.status = '';
    searchForm.startTimeRange = [];
    resetSearchParams();
    loadData(1);
};

// 删除数据
const handleDelete = async (id: number) => {
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

// 监听路由参数变化，自动执行查询
watch(
    () => route.query.jobId,
    (newJobId) => {
        if (newJobId) {
            searchForm.jobId = newJobId as string;
            loadData(1);
        }
    },
    { immediate: true }
);

onMounted(async () => {
    // 如果路由中没有 jobId 参数，则初始化加载数据
    if (!route.query.jobId) {
        await loadData();
    }
})

</script>

<style scoped lang="scss">

</style>