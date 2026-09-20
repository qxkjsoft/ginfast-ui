type PermDisplayEl = HTMLElement & { __permHidden__?: boolean; __permOriginalDisplay__?: string };

/**
 * 按权限结果显隐元素（display:none 语义，可恢复）
 * 取代 removeChild：权限异步到位后 updated 钩子重判可恢复节点（F-20）
 * 首次隐藏时记录原内联 display，恢复时还原；仅回收自己设过的隐藏，避免覆盖 v-show 等他人对 display 的控制
 */
export const setElementHidden = (rawEl: HTMLElement, hidden: boolean) => {
  const el = rawEl as PermDisplayEl;
  if (hidden) {
    if (!el.__permHidden__) {
      el.__permOriginalDisplay__ = el.style.display;
      el.__permHidden__ = true;
    }
    el.style.display = "none";
  } else if (el.__permHidden__) {
    el.style.display = el.__permOriginalDisplay__ ?? "";
    el.__permHidden__ = false;
    delete el.__permOriginalDisplay__;
  }
};
