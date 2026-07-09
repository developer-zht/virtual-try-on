<template>
  <div class="app-bg" :class="{ 'app-bg--framed': $q.platform.is.desktop }">
    <div class="phone-frame">
      <div class="page-wrapper">
        <!-- router-view 暴露当前页面组件，用 <transition> 包起来做滑动过渡 -->
        <router-view v-slot="{ Component }">
          <transition :name="transitionName">
            <!-- class="page-slot" 会合并到页面根元素上（绝对定位 + 可滚动）-->
            <component :is="Component" class="page-slot" />
          </transition>
        </router-view>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';

const $q = useQuasar();

const route = useRoute();
const transitionName = ref('page-forward');

watch(
  () => route.meta.order as number | undefined,
  (toOrder, fromOrder) => {
    transitionName.value = (toOrder ?? 0) >= (fromOrder ?? 0) ? 'page-forward' : 'page-back';
  },
);
</script>
