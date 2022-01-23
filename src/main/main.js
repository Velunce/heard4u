const { app, BrowserWindow } = require("electron");

// 主窗口
const indexWin = require("./index.js");

// (electron) The default value of app.allowRendererProcessReuse is deprecated, it is currently "false".
// It will change to be "true" in Electron 9.
// For more information please check https://github.com/electron/electron/issues/18397
// 手动设置为false，跟当前默认值保持一致，同时可清除终端中的log警告
app.allowRendererProcessReuse = false;

// const gotTheLock = app.requestSingleInstanceLock();
// if (!gotTheLock) return app.quit();
app.on("second-instance", () => {
  let myWindows = BrowserWindow.getAllWindows();
  myWindows.forEach((win) => {
    if (win && !win.isDestroyed()) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
});

// 禁用硬件加速
app.disableHardwareAcceleration();

app.on("ready", () => {
  // 启动主窗体
  indexWin.create();
});

app.on("window-all-closed", function() {
  setTimeout(() => {
    const allwindow = BrowserWindow.getAllWindows();
    if (allwindow.length === 0) app.exit(1);
  }, 500);
});
