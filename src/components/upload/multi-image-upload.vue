<template>
    <div class="multi-image-upload">
        <a-space direction="vertical" :style="{ width: '100%' }">
            <!-- 照片墙展示区域 -->
            <div class="image-wall">
                <!-- 已上传的图片 -->
                <div v-for="(fileItem, index) in fileList" :key="fileItem.uid || index"
                     class="image-item"
                     :style="{ width: typeof width === 'number' ? width + 'px' : width, height: typeof height === 'number' ? height + 'px' : height }">
                    <div class="upload-list-picture custom-upload-avatar">
                        <img :src="handleUrl(fileItem.url)"
                             :style="{ width: typeof width === 'number' ? width + 'px' : width, height: typeof height === 'number' ? height + 'px' : height }" />
                        <div class="upload-list-picture-mask">
                            <div class="action-buttons">
                                <a-tooltip content="预览">
                                    <a-button type="text" size="mini" @click="handlePreview(fileItem)">
                                        <icon-eye />
                                    </a-button>
                                </a-tooltip>
                                <a-tooltip content="删除">
                                    <a-button type="text" size="mini" @click="handleRemove(index)" status="danger">
                                        <icon-delete />
                                    </a-button>
                                </a-tooltip>
                            </div>
                        </div>
                        <a-progress v-if="fileItem.status === 'uploading' && fileItem.percent < 100"
                                   :percent="fileItem.percent"
                                   type="circle" size="mini" :style="{
                                       position: 'absolute',
                                       left: '50%',
                                       top: '50%',
                                       transform: 'translateX(-50%) translateY(-50%)',
                                   }" />
                    </div>
                </div>

                <!-- 上传按钮 -->
                <a-upload :action="uploadUrl"
                         :fileList="[]"
                         :show-file-list="false"
                         @change="onChange"
                         :accept="accept"
                         :multiple="true"
                         :limit="maxCount"
                         @progress="onProgress"
                         :custom-request="handleUpload"
                         :disabled="fileList.length >= maxCount">
                    <template #upload-button>
                        <div class="upload-button"
                             :style="{ width: typeof width === 'number' ? width + 'px' : width, height: typeof height === 'number' ? height + 'px' : height }"
                             :class="{ 'upload-disabled': fileList.length >= maxCount }">
                            <div class="arco-upload-picture-card">
                                <div class="arco-upload-picture-card-text">
                                    <icon-plus />
                                    <div style="font-weight: 600;font-size: 12px;">{{ title }}</div>
                                    <div v-if="maxCount" style="font-size: 10px;color: var(--color-text-3);margin-top: 4px;">
                                        {{ fileList.length }}/{{ maxCount }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </template>
                </a-upload>

                <!-- 选择按钮 -->
                <div class="upload-button"
                     :style="{ width: typeof width === 'number' ? width + 'px' : width, height: typeof height === 'number' ? height + 'px' : height }"
                     :class="{ 'upload-disabled': fileList.length >= maxCount }"
                     @click="showSelector = true">
                    <div class="arco-upload-picture-card">
                        <div class="arco-upload-picture-card-text">
                            <icon-folder />
                            <div style="font-weight: 600;font-size: 12px;">选择图片</div>
                            <div v-if="maxCount" style="font-size: 10px;color: var(--color-text-3);margin-top: 4px;">
                                {{ fileList.length }}/{{ maxCount }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </a-space>

        <!-- 图片预览模态框 -->
        <a-image-preview v-model:visible="previewVisible" :src="previewImage" />
        <!-- 附件选择器 -->
        <affix-selector
            v-model:visible="showSelector"
            :multiple="true"
            @confirm="handleAffixSelect"
            @close="handleSelectorClose"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { IconPlus, IconEye, IconDelete, IconFolder } from '@arco-design/web-vue/es/icon';
import { uploadAffixAPI } from '@/api/file';
import { Message } from '@arco-design/web-vue';
import { handleUrl } from "@/utils/app";
import AffixSelector from './affix-selector.vue';

// 定义组件属性
const props = defineProps({
    modelValue: {
        type: Array as () => string[],
        default: () => []
    },
    title: {
        type: String,
        default: '上传图片'
    },
    accept: {
        type: String,
        default: 'image/*'
    },
    width: {
        type: [String, Number],
        default: 120
    },
    height: {
        type: [String, Number],
        default: 120
    },
    maxCount: {
        type: Number,
        default: 10
    }
});

// 定义事件
const emit = defineEmits(['update:modelValue']);

// 文件列表
const fileList = ref<any[]>([]);
const showSelector = ref(false);

// 预览相关
const previewVisible = ref(false);
const previewImage = ref('');

// 跟踪正在上传的文件数量
const uploadingCount = ref(0);

// 监听图片URL数组变化（仅用于初始化）
watch(() => props.modelValue, (newUrls) => {
    // 只有当没有正在上传的文件且fileList为空时才初始化，避免覆盖正在上传的文件
    if (uploadingCount.value === 0 && fileList.value.length === 0 && Array.isArray(newUrls) && newUrls.length > 0) {
        fileList.value = newUrls.map((url, index) => ({
            uid: `existing-${index}`,
            url: url,
            status: 'done'
        }));
    }
}, { immediate: true });

// 上传URL（不需要action，因为我们使用自定义请求）
const uploadUrl = '/'; // 占位符，实际不会使用

// 处理文件变化
const onChange = (fileList: any[], currentFile: any) => {
    // 多图上传时，这里会收到所有选中的文件
    // 但我们已经使用自定义上传处理，所以这里不需要额外处理
    console.log("onChange - fileList:", fileList, "currentFile:", currentFile);
};

// 处理上传进度
const onProgress = (currentFile: any) => {
    // 更新对应文件的上传进度
    const fileIndex = fileList.value.findIndex(file => file.uid === currentFile.uid);
    if (fileIndex !== -1) {
        fileList.value[fileIndex] = {
            ...fileList.value[fileIndex],
            percent: currentFile.percent
        };
    }
};

// 自定义上传处理
const handleUpload = async (options: any) => {
    const { fileItem, onError, onSuccess } = options;
    const formData = new FormData();
    formData.append("file", fileItem.file);
    // 生成唯一ID
    const fileUid = fileItem.uid;
    // 添加到文件列表，显示上传中状态
    const uploadingFile = {
        uid: fileUid,
        name: fileItem.name,
        status: 'uploading',
        percent: 0,
        url: '',
        file: fileItem.file
    };
    fileList.value.push(uploadingFile);
    uploadingCount.value++;
    try {
        const res: any = await uploadAffixAPI(formData);
        if (res.code === 0) {
            Message.success("上传成功");
            // 更新文件状态
            const fileIndex = fileList.value.findIndex(file => file.uid === fileUid);
            if (fileIndex !== -1) {
                fileList.value[fileIndex] = {
                    ...fileList.value[fileIndex],
                    status: 'done',
                    url: res.data.url,
                    response: res
                };
            }
            uploadingCount.value--;
            // 更新父组件的URL数组（只包含已完成的文件）
            const urls = fileList.value
                .filter(file => file.status === 'done' && file.url)
                .map(file => file.url);
            emit('update:modelValue', urls);
            onSuccess(res);
        } else {
            throw new Error(res.message || '上传失败');
        }
    } catch (error: any) {
        Message.error(error.message || "上传失败");
        
        // 更新文件状态为错误
        const fileIndex = fileList.value.findIndex(file => file.uid === fileUid);
        if (fileIndex !== -1) {
            fileList.value[fileIndex] = {
                ...fileList.value[fileIndex],
                status: 'error'
            };
        }
        uploadingCount.value--;
        onError(error);
    }
};

// 删除图片
const handleRemove = (index: number) => {
    const removedFile = fileList.value[index];
    // 如果删除的是正在上传的文件，减少上传计数
    if (removedFile.status === 'uploading') {
        uploadingCount.value--;
    }
    fileList.value.splice(index, 1);
    
    // 更新父组件的URL数组（只包含已完成的文件）
    const urls = fileList.value
        .filter(file => file.status === 'done' && file.url)
        .map(file => file.url);
    emit('update:modelValue', urls);
};

// 预览图片
const handlePreview = (fileItem: any) => {
    previewImage.value = handleUrl(fileItem.url);
    previewVisible.value = true;
};

// 处理附件选择
const handleAffixSelect = (urls: string[]) => {
    if (urls.length === 0) return;
    
    // 检查是否超过最大数量限制
    const availableSlots = props.maxCount - fileList.value.length;
    if (availableSlots <= 0) {
        Message.warning(`最多只能选择${props.maxCount}张图片`);
        return;
    }
    
    // 限制选择数量不超过可用槽位
    const urlsToAdd = urls.slice(0, availableSlots);
    
    // 添加选中的图片到文件列表
    urlsToAdd.forEach((url, index) => {
        fileList.value.push({
            uid: `selected-${Date.now()}-${index}`,
            url: url,
            status: 'done'
        });
    });
    
    // 更新父组件的URL数组
    const allUrls = fileList.value
        .filter(file => file.status === 'done' && file.url)
        .map(file => file.url);
    emit('update:modelValue', allUrls);
    
    Message.success(`成功选择${urlsToAdd.length}张图片`);
};

// 处理选择器关闭
const handleSelectorClose = () => {
    showSelector.value = false;
};
</script>

<style scoped>
.multi-image-upload {
    width: 100%;
}

.image-wall {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: flex-start;
}

.image-item {
    position: relative;
    border-radius: 4px;
    overflow: hidden;
    transition: all 0.2s;
}

.image-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.upload-list-picture {
    position: relative;
    overflow: hidden;
    border-radius: 4px;
    border: 1px solid var(--color-border-2);
}

.upload-list-picture img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.upload-list-picture-mask {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    opacity: 0;
    transition: opacity 0.2s;
}

.upload-list-picture:hover .upload-list-picture-mask {
    opacity: 1;
}

.action-buttons {
    display: flex;
    gap: 8px;
}

.upload-button {
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
}

.upload-button:hover:not(.upload-disabled) {
    border-color: var(--color-primary);
    background-color: var(--color-primary-light-1);
}

.upload-disabled {
    cursor: not-allowed;
    opacity: 0.5;
}

.upload-disabled:hover {
    border-color: var(--color-border-2);
    background-color: var(--color-fill-2);
}

.arco-upload-picture-card {
    border: 1px dashed var(--color-border-2);
    border-radius: 4px;
    background-color: var(--color-fill-2);
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
    height: 100%;
    position: relative;
}

.arco-upload-picture-card-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: var(--color-text-2);
}

.arco-upload-picture-card:hover:not(.upload-disabled .arco-upload-picture-card) {
    border-color: var(--color-primary);
    background-color: var(--color-primary-light-1);
}
.preview-container {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;
}

.preview-image {
    max-width: 90vw;
    max-height: 90vh;
    object-fit: contain;
}
</style>