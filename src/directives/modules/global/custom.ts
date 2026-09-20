import { Directive } from "vue";

const custom: Directive = {
  mounted(el, binding) {
    el.__onClick__ = () => {
      let { goodsId, event } = binding.value;
      event(goodsId);
    };
    el.addEventListener("click", el.__onClick__);
  },
  // 卸载时移除事件监听，防止节点复用/销毁后监听器残留
  unmounted(el) {
    el.removeEventListener("click", el.__onClick__);
    delete el.__onClick__;
  }
};

export default custom;
