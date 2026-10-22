# 修复升级后列表页查询表单与表格间垂直间距丢失

## 背景
Arco 2.58.0 将 Space 间距从子项 margin 改为容器 gap，块尾 8px 底部空间随之消失，导致所有列表页查询表单与下方表格挤在一起。不回退 arco 版本，按旧版视觉补回间距。

## 修改内容

### 1. `src/components/s-layout-tools/index.vue`（覆盖 11 个标准列表页）
`.tools` 增加两条规则，恢复旧版视觉：
- `margin-bottom: 8px` —— 工具栏与下方表格的间距（对应旧版 space 子项 margin-bottom 的尾部空间）
- `row-gap: 8px` —— 窄屏下左右两组按钮换行时的行间距（旧版同样由子项 margin-bottom 提供）

### 2. `src/style/model/global-style.scss`（覆盖直接相邻写法的页面）
新增一条按相邻关系精确匹配的全局规则，只命中「查询区 wrap space 紧邻表格」这一种布局，不会影响表格单元格内的 `a-space wrap`（如角色标签列）：
```scss
// arco 2.58+ a-space 间距改为容器 gap，不再产生尾部 margin，列表页查询区与表格间距在此补回
.arco-space-wrap + .arco-table {
  margin-top: 8px;
}
```
适用于 account、sysjobslist、sysjobresultslist、affix（search-box）等直接 `<a-space wrap>` + `<a-table>` 相邻的页面。

### 3. 兜底检查
逐个确认 account/affix/tenant 等页面的 `<a-space wrap>` 与 `<a-table>` 确为同父级相邻元素；若有中间包裹层的页面，在其 scoped 样式中单独补 `margin-bottom: 8px`。

## 验证
1. `pnpm dev` 启动，浏览器检查：
   - 角色管理页（s-layout-tools 写法）：工具栏与表格间恢复 8px 间距
   - 账号管理页（直接相邻写法）：查询表单与表格间恢复间距
   - 缩窄视口让查询条件换行：行间距正常（组件 row-gap 生效）、换行后与表格间距正常
   - 表格单元格内的 a-space（角色标签）无多余间距、无双重间距
2. 截图对比确认与旧版视觉一致。