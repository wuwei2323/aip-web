<template>
  <component :is="type" v-bind="linkProps()">
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { isExternal } from '@/utils/validate';

const props = defineProps({
  to: {
    type: [String, Object],
    required: true
  },
  appId: {
    type: String,
    default: ''
  }
});

const isExt = computed(() => {
  return isExternal(props.to as string) || Boolean(props.appId);
});

const type = computed(() => {
  if (isExt.value) {
    return 'a';
  }
  return 'router-link';
});

function linkProps() {
  if (isExt.value) {
    const targetUrl = typeof props.to === 'string' ? props.to : (props.to as any)?.path;
    return {
      href: targetUrl,
      target: '_blank',
      rel: 'noopener'
    };
  }
  return {
    to: props.to
  };
}
</script>
