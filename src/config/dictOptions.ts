// 固定字典选项（统一管理）
// 背景：初始化时 sys_dict 表为空，这些选项直接写死并统一放在本文件维护。
// 注意：各选项的 value 类型与后端契约/页面筛选逻辑绑定，勿随意修改类型：
// - STATUS_OPTIONS 用数字：后端 status 字段为整型，页面本地筛选为数字严格比较
// - GENDER_OPTIONS 用字符串：后端 Sex 为 string/varchar，数字会触发 JSON 反序列化报错
// - HIDE/DISABLE_OPTIONS 用 "false"/"true"：menu.vue 的 performSearch 按此字符串匹配 hide/disable 的 0/1

// 通用状态（0 禁用 / 1 启用）
export const STATUS_OPTIONS = [
    { value: 0, name: "禁用" },
    { value: 1, name: "启用" }
];

// 性别（1 男 / 0 女 / 2 保密）
export const GENDER_OPTIONS = [
    { value: "1", name: "男" },
    { value: "0", name: "女" },
    { value: "2", name: "保密" }
];

// 菜单显示状态（hide 字段：0 显示 / 1 隐藏）
export const HIDE_OPTIONS = [
    { value: "false", name: "显示" },
    { value: "true", name: "隐藏" }
];

// 菜单启用状态（disable 字段：0 启用 / 1 停用）
export const DISABLE_OPTIONS = [
    { value: "false", name: "启用" },
    { value: "true", name: "停用" }
];
