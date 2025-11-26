# 上传组件文档

## 组件概述

本项目提供了两种图片上传组件：
- `image-upload.vue` - 单图上传组件
- `multi-image-upload.vue` - 多图上传组件（照片墙形式）

## 多图上传组件 (multi-image-upload.vue)

### 特性

- ✅ **照片墙形式** - 以网格布局展示已上传的图片
- ✅ **自定义上传请求** - 使用项目统一的API接口
- ✅ **双向绑定URL数组** - 支持v-model绑定图片URL数组
- ✅ **图片预览** - 点击图片可放大预览
- ✅ **删除功能** - 支持删除已上传的图片
- ✅ **上传进度显示** - 实时显示上传进度
- ✅ **数量限制** - 可配置最大上传数量
- ✅ **响应式设计** - 自适应不同屏幕尺寸

### 安装和使用

```vue
<template>
  <div>
    <!-- 基本用法 -->
    <multi-image-upload v-model="imageUrls" />
    
    <!-- 自定义配置 -->
    <multi-image-upload 
      v-model="productImages"
      title="上传商品图片"
      :width="120"
      :height="120"
      :max-count="5"
      accept=".jpg,.jpeg,.png,.gif"
    />
  </div>
</template>

<script setup lang="ts">
import MultiImageUpload from '@/components/upload/multi-image-upload.vue';

const imageUrls = ref<string[]>([]);
const productImages = ref<string[]>([]);
</script>
```

### Props 属性

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| modelValue | string[] | [] | 双向绑定的图片URL数组 |
| title | string | '上传图片' | 上传按钮的标题文字 |
| accept | string | 'image/*' | 接受的文件类型 |
| width | string \| number | 100 | 图片显示宽度 |
| height | string \| number | 100 | 图片显示高度 |
| maxCount | number | 10 | 最大上传数量限制 |

### 事件

| 事件名 | 说明 | 参数 |
|--------|------|------|
| update:modelValue | 图片URL数组变化时触发 | (urls: string[]) |

### 功能说明

#### 1. 照片墙布局
- 已上传的图片以网格形式排列
- 支持鼠标悬停效果
- 响应式布局，自动换行

#### 2. 图片操作
- **预览**: 点击图片可放大预览
- **删除**: 点击删除按钮可移除图片
- **上传进度**: 上传过程中显示进度条

#### 3. 上传限制
- 支持配置最大上传数量
- 达到上限后上传按钮自动禁用
- 显示当前上传数量/最大数量

#### 4. 自定义上传
- 使用项目统一的 `uploadAffixAPI` 接口
- 支持FormData格式上传
- 自动处理上传成功/失败状态

### 样式定制

组件使用CSS变量，可以通过以下方式自定义样式：

```css
/* 修改主题色 */
:root {
  --color-primary: #1890ff;
  --color-primary-light-1: #e6f7ff;
}

/* 自定义图片尺寸 */
.custom-upload {
  --upload-width: 120px;
  --upload-height: 120px;
}
```

### 注意事项

1. **URL处理**: 组件会自动调用 `handleUrl` 函数处理相对路径
2. **文件类型**: 默认接受所有图片类型，可通过 `accept` 属性限制
3. **上传状态**: 上传失败的文件会显示错误状态，可以重新上传
4. **性能优化**: 建议设置合理的 `maxCount` 避免上传过多图片

### 示例

查看 `multi-image-upload-demo.vue` 文件获取完整的使用示例。

## 单图上传组件 (image-upload.vue)

### 基本用法

```vue
<template>
  <image-upload v-model="avatarUrl" title="上传头像" />
</template>

<script setup lang="ts">
import ImageUpload from '@/components/upload/image-upload.vue';

const avatarUrl = ref('');
</script>
```

### Props 属性

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| modelValue | string | '' | 双向绑定的图片URL |
| title | string | 'Upload' | 上传按钮的标题文字 |
| accept | string | 'image/*' | 接受的文件类型 |
| width | string \| number | 120 | 图片显示宽度 |
| height | string \| number | 120 | 图片显示高度 |

## API 依赖

两个组件都依赖以下API和工具函数：

- `uploadAffixAPI` - 文件上传接口
- `handleUrl` - URL处理函数
- `Message` - 消息提示组件

确保这些依赖在项目中正确配置。