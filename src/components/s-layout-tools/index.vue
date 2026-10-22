<template>
  <div class="tools">
    <a-space>
      <slot name="left"> </slot>
    </a-space>
    <a-space>
      <slot name="right"> </slot>
    </a-space>
  </div>
</template>

<script setup lang="ts"></script>

<style lang="scss" scoped>
.tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  // arco 2.58+ a-space 间距改为容器 gap，不再产生尾部 margin，工具栏自身换行与同表格的间距在此补回
  row-gap: 8px;
  margin-bottom: 8px;
}
</style>
