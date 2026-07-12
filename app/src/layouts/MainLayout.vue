<template>
  <div class="app-bg" :class="{ 'app-bg--framed': $q.platform.is.desktop }">
    <div class="page-wrapper">
      <!-- router-view 暴露当前页面组件，用 <transition> 包起来做滑动过渡 -->
      <router-view v-slot="{ Component }">
        <transition :name="route.meta.overlay ? 'page-rise' : 'page-fade'">
          <!-- class="page-slot" 会合并到页面根元素上（绝对定位 + 可滚动）-->
          <component :is="Component" class="page-slot" :key="route.path" />
        </transition>
      </router-view>
    </div>
    <!-- 仅 Tab 页显示底部导航；引导流/浮层无 meta.tab，不显示 -->
    <TabBar v-if="route.meta.tab" />

    <!-- 注册/登录浮层：全局挂在这里，由 auth.showAuth 控制（任意页面触发都能弹）-->
    <AuthSheet v-if="auth.showAuth" />

    <!-- 上传/识别进度：全局持久 toast，跨页面存在（自己读 store 决定显隐）-->
    <UploadToast />
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import TabBar from '@/components/TabBar.vue';
import { useAuthStore } from '@/stores/auth';
import { storeToRefs } from 'pinia';
import AuthSheet from '@/components/AuthSheet.vue';
import UploadToast from '@/components/UploadToast.vue';

const route = useRoute();

const auth = useAuthStore();

const { showAuth } = storeToRefs(auth);
console.log(showAuth.value);
</script>
