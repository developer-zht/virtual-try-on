<template>
  <section class="home-guide" aria-labelledby="home-guide-title" :data-guide-stage="view.stage">
    <div class="home-guide__brand" aria-hidden="true">
      <span class="home-guide__orbit home-guide__orbit--outer"></span>
      <span class="home-guide__orbit home-guide__orbit--inner"></span>
      <img :src="logoLunar" alt="" class="home-guide__logo" />
    </div>

    <div class="home-guide__copy">
      <h1 id="home-guide-title">{{ view.title }}</h1>
      <p>{{ view.description }}</p>
    </div>

    <div class="home-guide__steps" aria-label="开始使用前的准备步骤">
      <button
        v-for="step in view.steps"
        :key="step.key"
        class="guide-step"
        :class="`guide-step--${step.state}`"
        :data-step-state="step.state"
        :data-step-action="step.action"
        :disabled="step.action === null"
        @click="emitAction(step.action)"
      >
        <span class="guide-step__rail" aria-hidden="true"></span>
        <span class="guide-step__badge" aria-hidden="true">
          <AppIcon v-if="step.state === 'done'" name="check" :size="15" />
          <span v-else-if="step.state === 'progress'" class="guide-step__spinner"></span>
          <template v-else>{{ step.order }}</template>
        </span>

        <span class="guide-step__body">
          <strong>{{ step.label }}</strong>
          <span
            v-if="step.key === 'model' && step.state === 'progress'"
            class="guide-step__progress"
            role="progressbar"
            aria-label="专属模特生成进度"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="view.modelProgress"
          >
            <span :style="{ width: `${view.modelProgress}%` }"></span>
          </span>
        </span>

        <span class="guide-step__status">{{ step.statusText }}</span>
      </button>
    </div>

    <button
      class="home-guide__primary"
      :class="{ 'home-guide__primary--waiting': view.primary.action === null }"
      :data-primary-action="view.primary.action"
      :disabled="view.primary.action === null"
      @click="emitAction(view.primary.action)"
    >
      <span>{{ view.primary.label }}</span>
      <AppIcon
        v-if="view.primary.action !== null"
        name="chevron-left"
        :size="17"
        class="home-guide__primary-arrow"
      />
      <span v-else class="home-guide__primary-pulse" aria-hidden="true"></span>
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppIcon from '@/components/icons/AppIcon.vue';
import logoLunar from '@/assets/logo-lunar.png';
import { buildHomeGuideView, type HomeGuideAction, type HomeGuideFacts } from './homeGuideFlow';

const props = defineProps<{
  facts: HomeGuideFacts;
}>();

const emit = defineEmits<{
  action: [action: HomeGuideAction];
}>();

const view = computed(() => buildHomeGuideView(props.facts));

function emitAction(action: HomeGuideAction | null) {
  if (action === null) return;
  emit('action', action);
}
</script>

<style scoped lang="scss">
.home-guide {
  position: relative;
  flex: 1;
  min-height: 100%;
  padding: 22px 4px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
}
.home-guide::before {
  content: '';
  position: absolute;
  top: -124px;
  left: 50%;
  width: 360px;
  height: 310px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(74, 79, 176, 0.13), rgba(74, 79, 176, 0) 68%);
  transform: translateX(-50%);
  pointer-events: none;
}
.home-guide__brand {
  position: relative;
  width: 116px;
  height: 116px;
  display: grid;
  place-items: center;
}
.home-guide__orbit {
  position: absolute;
  border: 1px solid rgba(74, 79, 176, 0.13);
  border-radius: 44%;
}
.home-guide__orbit--outer {
  inset: 2px;
  transform: rotate(18deg);
}
.home-guide__orbit--inner {
  inset: 15px;
  border-color: rgba(217, 165, 76, 0.2);
  transform: rotate(-24deg);
}
.home-guide__logo {
  position: relative;
  width: 82px;
  height: 82px;
  object-fit: contain;
  filter: drop-shadow(0 14px 22px rgba(44, 48, 105, 0.16));
}
.home-guide__copy {
  position: relative;
  margin-top: 10px;
  text-align: center;
}
.home-guide__copy h1 {
  max-width: 330px;
  font-size: clamp(25px, 7vw, 30px);
  line-height: 1.18;
  letter-spacing: -0.8px;
  color: var(--text-dark);
}
.home-guide__copy p {
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.55;
  color: var(--text-gray);
}
.home-guide__steps {
  position: relative;
  width: 100%;
  margin-top: 28px;
  padding: 4px 16px;
  border: 1px solid rgba(74, 79, 176, 0.07);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 18px 44px -34px rgba(35, 42, 92, 0.7);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}
.guide-step {
  position: relative;
  width: 100%;
  min-height: 68px;
  padding: 12px 0;
  border: 0;
  display: flex;
  align-items: center;
  gap: 13px;
  text-align: left;
  background: transparent;
  color: var(--text-dark);
}
.guide-step + .guide-step {
  border-top: 1px solid var(--hairline);
}
.guide-step:not(:disabled):active {
  transform: scale(0.985);
}
.guide-step:disabled {
  opacity: 1;
}
.guide-step__rail {
  position: absolute;
  top: 46px;
  bottom: -22px;
  left: 15px;
  width: 1px;
  background: var(--hairline);
}
.guide-step:last-child .guide-step__rail {
  display: none;
}
.guide-step__badge {
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
  width: 31px;
  height: 31px;
  border: 1px solid var(--hairline);
  border-radius: 11px;
  display: grid;
  place-items: center;
  background: var(--bg-fill);
  color: var(--text-gray);
  font-size: 12px;
  font-weight: 800;
}
.guide-step--current .guide-step__badge,
.guide-step--progress .guide-step__badge {
  border-color: rgba(74, 79, 176, 0.16);
  background: var(--primary-soft);
  color: var(--primary);
}
.guide-step--done .guide-step__badge {
  border-color: transparent;
  background: var(--primary);
  color: #fff;
}
.guide-step__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(74, 79, 176, 0.17);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: guide-spin 0.8s linear infinite;
}
.guide-step__body {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.guide-step__body strong {
  font-size: 15px;
  font-weight: 720;
}
.guide-step__progress {
  width: min(100%, 150px);
  height: 3px;
  overflow: hidden;
  border-radius: var(--radius-pill);
  background: rgba(74, 79, 176, 0.1);
}
.guide-step__progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--primary);
  transition: width 0.3s ease;
}
.guide-step__status {
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-light);
}
.guide-step--current .guide-step__status,
.guide-step--progress .guide-step__status {
  color: var(--primary);
}
.guide-step--done .guide-step__status {
  color: var(--success);
}
.home-guide__primary {
  position: relative;
  width: 100%;
  min-height: 54px;
  margin-top: 20px;
  padding: 0 18px;
  border: 1px solid var(--button-primary-border);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  background: var(--gradient-button-primary);
  box-shadow: var(--shadow-cta);
  color: #fff;
  font-size: 16px;
  font-weight: 780;
}
.home-guide__primary:not(:disabled):active {
  transform: scale(0.985);
}
.home-guide__primary--waiting {
  border-color: var(--button-secondary-border);
  background: var(--gradient-button-secondary);
  box-shadow: none;
  color: var(--primary);
}
.home-guide__primary-arrow {
  transform: rotate(180deg);
}
.home-guide__primary-pulse {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  animation: guide-pulse 1.4s ease-in-out infinite;
}
@keyframes guide-spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes guide-pulse {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1.15);
  }
}
@media (max-height: 720px) {
  .home-guide {
    padding-top: 4px;
  }
  .home-guide__brand {
    width: 92px;
    height: 92px;
  }
  .home-guide__logo {
    width: 68px;
    height: 68px;
  }
  .home-guide__copy {
    margin-top: 4px;
  }
  .home-guide__steps {
    margin-top: 18px;
  }
  .guide-step {
    min-height: 62px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .guide-step__spinner,
  .home-guide__primary-pulse {
    animation: none;
  }
  .guide-step__progress span {
    transition: none;
  }
}
</style>
