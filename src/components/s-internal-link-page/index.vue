<template>
  <div class="snow-fill-pure">
    <div class="link-page-box">
      <div v-if="!isLoading" class="loading-page">
        <div class="dc-loader"></div>
      </div>
      <iframe v-show="isLoading" :src="link" :title="title" class="iframe-size" @load="isLoading = true"> </iframe>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";

const route = useRoute();

// 缓存标签页各自保留地址，避免跟随全局路由切换。
const link = route.meta.link as string;
const title = String(route.meta.title || "内嵌窗口");

const isLoading = ref(false); // iframe是否加载完成
</script>

<style lang="scss" scoped>
.link-page-box {
  display: flex;
  width: 100%;
  height: 100%;
  .iframe-size {
    flex: 1;
    border: 0;
  }
}
</style>
