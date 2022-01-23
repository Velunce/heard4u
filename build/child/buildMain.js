const chalk = require("chalk");
const webpack = require("webpack");
const mainRenderConfig = require("../webpack.main.config.js");
function mainBuilder() {
  return new Promise((resolve, reject) => {
    console.log("Building main process......");
    let log = "";
    require("del")(["./app/main.js"]);
    const mainRenderCompiler = webpack(mainRenderConfig);
    mainRenderCompiler.run((err, stats) => {
      if (err) {
        console.log("Building main process error");
        reject(chalk.red(err));
      } else {
        Object.keys(stats.compilation.assets).forEach((key) => {
          log += chalk.blue(key) + "\n";
        });
        stats.compilation.warnings.forEach((key) => {
          log += chalk.yellow(key) + "\n";
        });
        stats.compilation.errors.forEach((key) => {
          log += chalk.red(`${key}:${stats.compilation.errors[key]}`) + "\n";
        });
        log += chalk.green(`time：${(stats.endTime - stats.startTime) / 1000} s\n`) + "\n";
        console.log("Main process building finished");
        resolve(log);
      }
    });
  });
}
module.exports = {
  mainBuilder,
};
