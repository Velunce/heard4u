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
        <textarea class="form-input" id="realtime-text" :placeholder="realtimeTextPlaceholder" readonly v-model="realtimeText"></textarea>
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
          <button v-if="onRecording" class="btn btn-warning" @click="stopRecord">Stop Record&nbsp;<i class="icon icon-shutdown"></i></button>
          
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import wave from "./wave.vue";
import RecorderWorker from "@/render/libs/recorder/RecorderWorker.js";
import objectTools from "../libs/util/objectTools";
const wavFile = "app/upload.wav";
const code = {
  GBK: "GBK",
  BIN: "binary",
  UTF8: "utf-8",
  BASE64: "base64",
};
const baiduAPI = {
  id: 25546571,
  key: "hvrgOgcraEhvS1VYUBtFUU51",
  secret: "143Np3XGZK3DPXuutdolyloL8emzHkGO",
};
const { dialog } = require("electron").remote;
const fs = require("fs");
// const client = new AipSpeech(baiduAPI.id, baiduAPI.key, baiduAPI.secret);

export default {
  data() {
    return {
      recorder: null,
      tabs: [
        { name: "Realtime Text" },
        //  { name: "Playlists" }
      ],
      audioInputList: [], // list of audio input devices
      audioOutputList: [], // list of audio output devices
      waveArr: [],
      onRecording: false,
      onUploading: false,
      realtimeText: "",
      realtimeTextPlaceholder: "点“Start”，跟我聊聊天",
      tabIndex: 0,
      startTime: 0,
      credential: null,
    };
  },
  components: { wave },
  mounted() {
    this.getBaiduToken();
  },
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
      const { array, blob } = data;
      // console.log(array[0]);
      // console.log(blob);
      // // 测试发现当 array的第一个元素的值小于130的时为无效的声音
      console.log(array[0]);
      // socket 方案使用 blob arrayBuffer
      // if (array[0] < 133 && !this.onUploading) {

      // } else {
      //   // 采集的声音有效
      //   if (!this.onUploading && !this.onRecording) {
      //     this.startRecord();
      //   }
      // }
      //非 socket 方案
      if (parseInt(new Date().getTime() / 1000) - this.startTime === 5 && this.onRecording) {
        this.recorderWorker.stopRecord();
        this.saveUploadRecord()
      }

      this.drawWave(array);
    });
  },
  methods: {
    getBaiduToken() {
      const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${baiduAPI.key}&client_secret=${baiduAPI.secret}`;
      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          console.log(data);
          this.credential = data;
        });
    },
    // 开始录音
    startRecord() {
      if (!this.recorderWorker || !this.recorderWorker.supported) {
        alert("硬件不支持或当前电脑已禁用麦克风！");
        return;
      }
      this.startTime = parseInt(new Date().getTime() / 1000);
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
          alert("这就不要我了？");
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
      this.saveUploadRecord();
    },
    saveUploadRecord() {
      this.recorderWorker.saveWAV((buffer) => {
        fs.writeFile(wavFile, buffer, (err) => {
          if (err) {
            console.log(err);
          } else {
            // 保存完之后清除数据，或在其他合适时机清除，否则录音数据一直叠加
            this.recorderWorker.clear();
            this.getTextByRecord();
          }
        });
      });
    },
    getTextByRecord() {
      let voice = fs.readFileSync(wavFile);
      let voiceBuffer = new Buffer(voice);
      let param = {
        format: "wav",
        rate: 16000,
        channel: 1,
        cuid: "ele_ai_vue",
        token: this.credential.access_token,
        dev_pid: 1537,
        speech: voiceBuffer && voiceBuffer.toString(code.BASE64),
        len: voiceBuffer && voiceBuffer.toString(code.BIN).length,
      };

      let requestParam = objectTools.merge(param);

      fetch("http://vop.baidu.com/server_api", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestParam),
      })
        .then((res) => res.json())
        .then((data) => {
          console.log(data);
          const { err_msg, result } = data;
          if (err_msg === "success.") {
            if (result[0] !== "") {
              this.realtimeText += result[0];
            } else {
              this.realtimeTextPlaceholder = "小度好想什么也没有听到？再试试？";
              
            }            
          }
    
          try {
            fs.unlink(wavFile);
          } catch (error) {
            console.log(error);
          }
          if(this.onRecording){
            this.startRecord();
          }
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
