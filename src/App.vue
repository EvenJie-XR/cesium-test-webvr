<template>
  <div class="container">
    <div id="cesiumContainer" ref="cesiumContainer"></div>
  </div>
</template>

<script lang="ts" setup>
import {reactive,toRefs,defineComponent, ref, onMounted} from "vue"
import * as Cesium from "cesium"
import { cesiumUtils } from "./utils/index"
const cesiumContainer = ref();
onMounted(() => {
  new cesiumUtils(cesiumContainer.value);
})
</script>

<style lang="scss" scoped>
.container {
  width: 100%;
  height: 100%;
  #cesiumContainer {
    width: 100%;
    height: 100%;
  }
}
</style>

