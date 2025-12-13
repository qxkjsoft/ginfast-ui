<template>
    <div class="image-upload">
        <div class="upload-container">
            <a-upload :action="uploadUrl" :fileList="fileList" :show-file-list="false" @change="onChange" :accept="accept"
                @progress="onProgress" :custom-request="handleUpload" :disabled="disabled">
                <template #upload-button>
                    <div :class="`arco-upload-list-item${file && file.status === 'error' ? ' arco-upload-list-item-error' : ''}`">
                        <div class="arco-upload-list-picture custom-upload-avatar" v-if="file && file.url"
                            :style="{ width: typeof width === 'number' ? width + 'px' : width, height: typeof height === 'number' ? height + 'px' : height }">
                            <img :src="handleUrl(file.url)"
                                :style="{ width: typeof width === 'number' ? width + 'px' : width, height: typeof height === 'number' ? height + 'px' : height }" />
                            <div class="arco-upload-list-picture-mask">
                                <div class="action-buttons">
                                    <a-tooltip content="预览">
                                        <a-button type="text" size="mini" @click.stop="handlePreview">
                                            <icon-eye />
                                        </a-button>
                                    </a-tooltip>
                                    <a-tooltip content="删除">
                                        <a-button type="text" size="mini" @click.stop="handleRemove" status="danger">
                                            <IconDelete />
                                        </a-button>
                                    </a-tooltip>
                                </div>
                            </div>
                            <a-progress v-if="file.status === 'uploading' && file.percent < 100" :percent="file.percent"
                                type="circle" size="mini" :style="{
                                    position: 'absolute',
                                    left: '50%',
                                    top: '50%',
                                    transform: 'translateX(-50%) translateY(-50%)',
                                }" />
                        </div>
                        <div class="arco-upload-picture-card" v-else
                            :style="{ width: typeof width === 'number' ? width + 'px' : width, height: typeof height === 'number' ? height + 'px' : height }"
                            :class="{ 'upload-disabled': disabled }">
                            <div class="arco-upload-picture-card-text">
                                <IconPlus />
                                <div style="font-weight: 600;font-size: 12px;">{{ title }}</div>
                            </div>
                        </div>
                    </div>
                </template>
            </a-upload>

            <!-- 选择按钮（右侧） -->
            <div class="select-button"
                 :style="{ width: typeof width === 'number' ? width + 'px' : width, height: typeof height === 'number' ? height + 'px' : height }"
                 :class="{ 'upload-disabled': disabled }"
                 @click="showSelector = true">
                <div class="arco-upload-picture-card">
                    <div class="arco-upload-picture-card-text">
                        <icon-folder />
                        <div style="font-weight: 600;font-size: 12px;">选择图片</div>
                    </div>
                </div>
            </div>
        </div>
        <!-- 图片预览模态框 -->
        <a-image-preview  v-model:visible="previewVisible" :src="file?.url && handleUrl(file.url)" />
        <!-- 附件选择器 -->
        <affix-selector
            v-model:visible="showSelector"
            :multiple="false"
            @confirm="handleAffixSelect"
            @close="handleSelectorClose"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import {  IconPlus, IconDelete, IconFolder , IconEye} from '@arco-design/web-vue/es/icon';
import { uploadAffixAPI } from '@/api/file';
import { Message } from '@arco-design/web-vue';
import { handleUrl } from "@/utils/app";
import AffixSelector from './affix-selector.vue';
// 定义组件属性
const props = defineProps({
    modelValue: {
        type: String,
        default: ''
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
    disabled: {
        type: Boolean,
        default: false
    }
});

// 定义事件
const emit = defineEmits(['update:modelValue', 'change', 'success', 'error']);

// 文件状态
const file = ref<any>(null);
const fileList = ref<any[]>([]);
const showSelector = ref(false);

const previewVisible = ref(false);
// 预览
const handlePreview = ()=> {
    previewVisible.value = true;
}


// 监听图片URL变化
watch(() => props.modelValue, (newUrl) => {
    if (newUrl) {
        file.value = {
            url: newUrl,
            status: 'done'
        };
        fileList.value = [file.value];
    } else {
        file.value = null;
        fileList.value = [];
    }
}, { immediate: true });

// 上传URL（不需要action，因为我们使用自定义请求）
const uploadUrl = '/'; // 占位符，实际不会使用

// 处理文件变化
const onChange = (fileList: any[], currentFile: any) => {
    console.log(fileList)
    // 触发change事件
    emit('change', currentFile);
};

// 处理上传进度
const onProgress = (currentFile: any) => {
    file.value = currentFile;
};

// 自定义上传处理
const handleUpload = async (options: any) => {
    const { fileItem, onError, onSuccess } = options;
    const formData = new FormData();
    formData.append("file", fileItem.file);

    // 设置上传中状态
    file.value = {
        ...fileItem,
        status: 'uploading',
        percent: 0
    };
    try {
        const res: any = await uploadAffixAPI(formData);
        if (res.code === 0) {
            Message.success("上传成功");
            // 设置文件信息
            const uploadedFile = {
                ...fileItem,
                status: 'done',
                url: res.data.url,
                response: res
            };

            file.value = uploadedFile;
            fileList.value = [uploadedFile];

            // 通知父组件更新URL
            emit('update:modelValue', res.data.url);
            emit('success', res.data.url);
            emit('change', uploadedFile);
            onSuccess(res);
        } else {
            throw new Error(res.message || '上传失败');
        }
    } catch (error: any) {
        Message.error(error.message || "上传失败");
        file.value = {
            ...fileItem,
            status: 'error'
        };
        emit('error', error);
        emit('change', file.value);
        onError(error);
    }
};

// 删除图片
const handleRemove = () => {
    // 确认删除
    file.value = null;
    fileList.value = [];
    emit('update:modelValue', '');
    emit('change', null);
    Message.success('删除成功');
};

// 处理附件选择
const handleAffixSelect = (selectedUrl: string) => {
    file.value = {
        url: selectedUrl,
        status: 'done'
    };
    fileList.value = [file.value];
    emit('update:modelValue', selectedUrl);
    emit('change', file.value);
    Message.success('选择图片成功');
};

// 处理选择器关闭
const handleSelectorClose = () => {
    showSelector.value = false;
};
</script>

<style scoped>
.image-upload {
    width: 100%;
}

.upload-container {
    display: flex;
    gap: 12px;
    align-items: stretch;
}

.arco-upload-list-picture {
    position: relative;
    overflow: hidden;
    border-radius: 4px;
    flex-shrink: 0;
}

.arco-upload-list-picture img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.arco-upload-list-picture-mask {
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

.action-buttons {
    display: flex;
    gap: 8px;
}

.arco-upload-list-picture:hover .arco-upload-list-picture-mask {
    opacity: 1;
}

.select-button {
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
    margin-top: 12px;
}

.select-button:hover:not(.upload-disabled) {
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
    display: flex;
    align-items: center;
    justify-content: center;
}

.arco-upload-picture-card-text {
    color: var(--color-text-2);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
}

.arco-upload-picture-card:hover:not(.upload-disabled .arco-upload-picture-card) {
    border-color: var(--color-primary);
    background-color: var(--color-primary-light-1);
}
</style>