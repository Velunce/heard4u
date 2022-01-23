<template>
  <div class="container">
    <div class="panel">
      <!-- <div class="panel-header">
        <div class="panel-title">Comments</div>
      </div> -->
      <div class="panel-nav">
        <!-- navigation components: tabs, breadcrumbs or pagination -->
        <ul class="tab tab-block">
          <li class="tab-item" :class="{ active: index === tabIndex }" v-for="(tab, index) in tabs" :key="tab.name" @click="switchTab(index)">
            <a>{{ tab.name }}</a>
          </li>
        </ul>
      </div>
      <div class="panel-body" v-if="tabIndex === 0">
        <!-- contents -->
        <textarea class="form-input" id="realtime-text" placeholder="Press start to show your record." readonly v-model="realtimeText"></textarea>
        <wave :unitArry="waveArr"></wave>
      </div>
      <div class="panel-body" v-if="tabIndex === 1">
        <!-- contents -->
        <div class="tile tile-centered">
          <div class="tile-content">
            <div class="tile-title text-bold">E-mail</div>
          </div>
          <div class="tile-action">
            <button class="btn btn-link btn-action btn-lg tooltip tooltip-left" data-tooltip="Open folder"><i class="icon icon-download"></i></button>
            <button class="btn btn-link btn-action btn-lg tooltip tooltip-left" data-tooltip="Delete Record"><i class="icon icon-delete"></i></button>
          </div>
        </div>
      </div>
      <div class="panel-footer">
        <!-- buttons or inputs -->
        <div class="btn-group btn-group-block" v-if="tabIndex === 0">
          <button v-if="!onRecording" class="btn btn-primary" :class="{ disabled: onRecording }" @click="startRecord">
            Start Record&nbsp;<i class="icon icon-forward"></i>
          </button>
          <button v-if="onRecording" class="btn btn-success" @click="stopRecord">Stop Record&nbsp;<i class="icon icon-shutdown"></i></button>
        </div>
        <div class="btn-group btn-group-block" v-if="tabIndex === 1">
          <button class="btn btn-error" @click="saveRecord">Save to MP3&nbsp;<i class="icon icon-download"></i></button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import wave from "./wave.vue";
import RecorderWorker from "@/render/libs/recorder/RecorderWorker.js";
import { v4 as uuidv4 } from "uuid";

const { dialog } = require("electron").remote;
const fs = require("fs");
export default {
  data() {
    return {
      socket: null,
      path: `wss://vop.baidu.com/realtime_asr?sn=${uuidv4()}`,
      recorder: null,
      tabs: [
        { name: "Realtime Text" },
        //  { name: "Playlists" }
      ],
      audioInputList: [], // list of audio input devices
      audioOutputList: [], // list of audio output devices
      waveArr: [],
      onRecording: false,
      realtimeText: "",
      tabIndex: 0,
    };
  },
  components: { wave },
  created: function() {
    this.recorderWorker = new RecorderWorker();
    console.log(this.recorderWorker);
    this.recorderWorker.on("ready", () => {
      console.log("ready");
      this.audioInputList = this.recorderWorker.audioInputList;
      console.log(this.audioInputList);
      this.audioOutputList = this.recorderWorker.audioOutputList;
    });
    this.recorderWorker.on("devicechange", () => {});

    this.recorderWorker.on("audioprocess", (data) => {
      console.log(data.length);
      this.drawWave(data);
    });
    this.recorderWorker.on("");
  },
  methods: {
    // 开始录音
    startRecord() {
      if (!this.recorderWorker || !this.recorderWorker.supported) {
        alert("硬件不支持或当前电脑已禁用麦克风！");
        return;
      }
      if (this.recorderWorker.recording) return;
      this.recorderWorker.startRecord();
      this.onRecording = true;
    },
    // 停止录音
    stopRecord() {
      this.recorderWorker.stopRecord();
      this.onRecording = false;
      this.recorderWorker.saveMP3((buffer) => {
        const savePath = dialog.showSaveDialogSync({
          title: "保存文件",
          filters: [
            {
              name: "mp3",
              extensions: [".mp3"],
            },
          ],
        });
        if (!savePath || !savePath.endsWith(".mp3")) {
          alert("必须保存为mp3格式");
          return;
        }
        fs.writeFile(savePath, buffer, (err) => {
          if (err) {
            console.log(err);
          } else {
            // 保存完之后清除数据，或在其他合适时机清除，否则录音数据一直叠加
            this.recorderWorker.clear();
            alert(`文件已保存至:${savePath}`);
          }
        });
      });
    },
    // 保存录音
    saveRecord() {
      this.onRecording = false;
      this.recorderWorker.saveMP3((buffer) => {
        const savePath = dialog.showSaveDialogSync({
          title: "保存文件",
          filters: [
            {
              name: "mp3",
              extensions: [".mp3"],
            },
          ],
        });
        if (!savePath || !savePath.endsWith(".mp3")) {
          alert("必须保存为mp3格式");
          return;
        }
        fs.writeFile(savePath, buffer, (err) => {
          if (err) {
            console.log(err);
          } else {
            // 保存完之后清除数据，或在其他合适时机清除，否则录音数据一直叠加
            this.recorderWorker.clear();
            alert(`文件已保存至:${savePath}`);
          }
        });
      });
    },
    // 音轨
    drawWave(dataArray) {
      this.waveArr.splice(0, this.waveArr.length);
      let data = dataArray.slice(0, 10);
      this.waveArr.push(data[0], data[1], data[2], data[3], data[4], data[5], data[6], data[7], data[8], data[9]);
    },
    switchTab(index) {
      this.tabIndex = index;
    },
    initWebSocket() {
      if (typeof WebSocket === "undefined") {
        alert("您的浏览器不支持socket");
      } else {
        // 实例化socket
        this.socket = new WebSocket(this.path, "websocket");
        // 监听socket连接
        this.socket.onopen = this.openWebSocket;
        // 监听socket错误信息
        this.socket.onerror = this.errorWebSocket;
        // 监听socket消息
        this.socket.onmessage = this.getMessageWebSocket;
      }
    },
    openWebSocket() {
      console.log("socket连接成功");
    },
    errorWebSocket() {
      console.log("连接错误");
    },
    getMessageWebSocket(msg) {
      console.log(msg.data);
      const { result } = msg.data;
      this.realtimeText += JSON.stringify(result);
    },
    sendWebSocket(params) {
      this.socket.send(params);
    },
    closeWebSocket() {
      console.log("socket已经关闭");
    },
  },
  mounted() {
    this.initWebSocket();
  },
  beforeDestroy() {
    if (this.recorderWorker) {
      this.recorderWorker.destory();
      this.recorderWorker = null;
    }
  },
};
</script>

<style scoped>
@import url("../../static/css/spectre.css");
@import url("../../static/css/spectre-icons.css");
.container {
  padding: 0;
}
.panel {
  display: flex;
  height: 100vh;
}

.panel-footer {
  padding: 0;
}

#realtime-text {
  margin: 12px 0;
  resize: none;
  height: 77vh;
}
</style>
