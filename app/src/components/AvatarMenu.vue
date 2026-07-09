<template>
  <!-- 打开时：半透明背板 + 横排菜单。两个根节点，用 <template v-if> 包 -->
  <template v-if="modelValue">
    <div class="avatar-menu-backdrop" @click="close" />
    <div class="avatar-menu">
      <div v-for="(item, i) in items" :key="i" class="avatar-menu-item" @click="select(item)">
        <div class="avatar-menu-icon" :style="{ background: item.color }">{{ item.icon }}</div>
        <span class="avatar-menu-label">{{ item.label }}</span>
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
// 菜单项类型：把原型里 { label, icon, step, color } 定义成 TS 接口
export interface AvatarMenuItem {
  label: string;
  icon: string;
  color: string;
  step?: number; // 目标（迁移期先保留 step，接路由时再换成路由名）
}

// v-model 控制开关：父组件 <AvatarMenu v-model="showMenu" />
defineProps<{ modelValue: boolean; items: AvatarMenuItem[] }>();
const emit = defineEmits<{
  'update:modelValue': [boolean];
  select: [AvatarMenuItem];
}>();

function close() {
  emit('update:modelValue', false);
}
function select(item: AvatarMenuItem) {
  emit('update:modelValue', false);
  emit('select', item); // 结构层面只负责“选了哪个”，跳转由父页面决定
}
</script>

<style scoped lang="scss">
// 自包含私有样式（scoped）——只作用本组件。
// 绝对定位相对于最近的定位祖先（页面根 .page-slot），与原型一致。
.avatar-menu-backdrop {
  position: absolute;
  top: 56px;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 55;
  animation: fadeIn 0.2s ease;
}
.avatar-menu {
  position: absolute;
  top: 72px;
  left: 24px;
  z-index: 60;
  display: flex;
  flex-direction: row;
  gap: 16px;
  animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.avatar-menu-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: all 0.2s;
  &:active {
    transform: scale(0.9);
  }
  &:active .avatar-menu-icon {
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
  }
}
.avatar-menu-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  transition: all 0.2s;
}
.avatar-menu-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-dark);
  white-space: nowrap;
  background: #fff;
  padding: 2px 10px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
// scoped 里的 @keyframes 会被自动改名隔离，放心写
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
