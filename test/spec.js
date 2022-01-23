const assert = require("assert");
const path = require("path");
const Application = require("spectron").Application;
const electronPath = require("electron");

const app = new Application({
  path: electronPath,
  args: [path.join(__dirname, "..")],
});

describe("Heard 4 U", function() {
  this.timeout(10000);
});

beforeEach(() => {
  return app.start();
});

afterEach(() => {
  if (app && app.isRunning()) {
    return app.stop();
  }
});

// Get window account
it("show an initial window", async () => {
  const count = await app.client.getWindowCount();
  return assert.equal(count, 1);
});

it("has the correct title", async () => {
  const title = await app.client.waitUntilWindowLoaded().getTitle();
  return assert.equal(title, "heard4u");
});
