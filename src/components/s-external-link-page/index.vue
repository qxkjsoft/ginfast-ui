<template>
  <div class="snow-page">
    <div class="external-link-page">
      <div class="external-link-inner-page">
        <div>
          <div class="star-emoji">🌍</div>
          <div class="docs-text">若外链未在新窗口中打开，请点击下方按钮</div>
          <div class="to-page"><a-button type="primary" @click="openPage">立即前往</a-button></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";

const route = useRoute();
const openPage = () => {
  window.open(route.meta.link as string, "_blank", "noopener,noreferrer");
};
</script>

<style lang="scss" scoped>
.external-link-page {
  box-sizing: border-box;
  height: 100%;
  .external-link-inner-page {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    overflow: hidden;
    background: $color-bg-1;
    .star-emoji {
      font-size: 100px;
      text-align: center;
    }
    .docs-text {
      margin: $margin 0;
      color: $color-text-3;
      text-align: center;
    }
    .to-page {
      display: flex;
      justify-content: center;
      text-align: center;
    }
  }
}
</style>
