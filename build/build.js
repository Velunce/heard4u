process.env.NODE_ENV = "production";
const fs = require("fs");
const path = require("path");
const del = require("del");

const build = {
  run() {
    // 删除历史打包数据
    del(["./app/*", "./pack/*"]);
    // 打包
    this.buildApp();
  },
  // 打包
  buildApp() {
    const { viewBuilder } = require("./child/buildRender.js");
    // 打包渲染进程
    viewBuilder()
      .then((res) => {
        const viewRenderConfig = require("./webpack.render.config.js");
        console.log("building output ===>", res);
        let outpath = path.join(__dirname, "../pack/");
        console.log(`Finished render process building. Compress the lite version`);
        try {
          fs.mkdirSync(outpath);
        } catch (e) {
          //console.log(e);//路径已存在
        }
        // 要压缩的文件夹
        let zipPath = viewRenderConfig.output.path;
        // 压缩的文件
        let filePath = path.join(zipPath, `../pack/view-1.0.0.zip`);
        this.compress(zipPath, filePath, 7, (type, msg) => {
          if (type === "error") {
            Promise.reject("Error happened on compressing file：" + msg);
          } else {
            // 打包主进程和自动更新
            this.packMain();
            console.log(`Archive package size is ${(msg / 1024 / 1024).toFixed(2)}MB`);
          }
        });
      })
      .catch((err) => {
        console.error("building view error ===>", err);
        process.exit(1);
      });
  },
  // 打包主进程和自动更新
  packMain() {
    const { mainBuilder } = require("./child/buildMain.js");
    mainBuilder()
      .then((res) => {
        const electronBuilder = require("electron-builder");
        console.log("Build output ===>", res);
        electronBuilder
          .build()
          .then(() => {
            // 删除无用日志文件
            del(["./pack/*.yaml", "./pack/*.yml", "./pack/*.blockmap"]);
            this.buildEnd();
          })
          .catch((error) => {
            console.error(error);
          });
      })
      .catch((err) => {
        console.error("Building main process error ===>", err);
        process.exit(2);
      });
  },
  //压缩指定目录的文件
  compress(filePath, zipPath, level = 9, callback) {
    // 压缩文件所用
    const archiver = require("archiver");
    // 修复压缩包插件中文名称bug
    require("./libs/admzip.js");
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", {
      zlib: { level },
    });
    // 通过管道方法将输出流存档到文件
    archive.pipe(output);
    archive.directory(filePath, false);
    archive.on("error", (err) => {
      if (callback) callback("error", err);
    });
    output.on("close", () => {
      let size = archive.pointer();
      if (callback) callback("success", size);
    });
    // 完成归档
    archive.finalize();
  },
  // 打包结束处理
  buildEnd() {
    // 打开文件管理器
    const { spawn } = require("child_process");
    const dirPath = path.join(__dirname, "..", "pack");
    if (process.platform === "darwin") {
      spawn("open", [dirPath]);
    } else if (process.platform === "win32") {
      spawn("explorer", [dirPath]);
    } else if (process.platform === "linux") {
      spawn("nautilus", [dirPath]);
    }
  },
};

build.run();
