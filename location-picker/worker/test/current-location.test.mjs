import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sourcePath = new URL("../src/page.js", import.meta.url);
const webuiPath = new URL("../../cloudflare-webui/worker.js", import.meta.url);
const serverPath = new URL("../../server.js", import.meta.url);

const pages = [
  ["source page", await readFile(sourcePath, "utf8")],
  ["webui artifact", await readFile(webuiPath, "utf8")],
  ["node server page", await readFile(serverPath, "utf8")],
];

for (const [label, content] of pages) {
  test(`${label} exposes a guarded current-location control`, () => {
    assert.match(content, /<button id="locatebtn"[^>]*>当前位置<\/button>/);
    assert.match(content, /function locateCurrent\(\)/);
    if (label === "source page") {
      assert.match(content, /if\s*\(enabledState\)\s*\{\s*showCurrentLocation\(\);\s*return;\s*\}/s);
    } else {
      assert.match(content, /if\s*\(enabledState\)\s*\{\s*toast\("请先恢复真实定位并刷新定位服务"\);\s*return;\s*\}/s);
    }
    assert.match(content, /navigator\.geolocation\.getCurrentPosition\(/);
  });

  test(`${label} requests fresh high-accuracy coordinates`, () => {
    assert.match(content, /enableHighAccuracy:\s*true/);
    assert.match(content, /maximumAge:\s*0/);
    assert.match(content, /timeout:\s*12000/);
  });

  test(`${label} moves the pin without saving automatically`, () => {
    assert.match(content, /WGS\s*=\s*\{\s*lat:\s*lat,\s*lng:\s*lng\s*\}/);
    assert.match(content, /saved\s*=\s*false/);
    assert.match(content, /marker\.setLatLng\(p\)/);
    if (label === "source page") {
      assert.match(content, /map\.setView\(p,\s*18\)/);
    } else {
      assert.match(content, /map\.setView\(p,\s*16\)/);
    }
    const movePinStart = content.indexOf("function movePin(");
    if (movePinStart >= 0) {
      const movePinEnd = content.indexOf("function commit(", movePinStart);
      assert.ok(movePinEnd > movePinStart, "commit function should follow movePin");
      assert.doesNotMatch(content.slice(movePinStart, movePinEnd), /commit\(/);
    }
  });

  test(`${label} maps Geolocation failures to user-facing messages`, () => {
    assert.match(content, /定位权限被拒绝，请在 Safari 设置中允许定位/);
    assert.match(content, /暂时无法获取当前位置/);
    assert.match(content, /获取当前位置超时，请到开阔处重试/);
    assert.match(content, /当前浏览器不支持定位/);
  });

  test(`${label} can reload the active spoofed location`, () => {
    if (label !== "source page") return;
    assert.match(content, /function showCurrentLocation\(\)/);
    assert.match(content, /fetch\("\/loc\.json\?token="\+encodeURIComponent\(token\),\{cache:"no-store"\}\)/);
    assert.match(content, /toast\("已显示当前生效定位"\)/);
  });

}

test("Worker source makes the search result the active draft point", () => {
  const page = pages[0][1];
  assert.doesNotMatch(page, /searchPreviewMarker|searchPreviewWgs|showSearchPreview/);
  assert.match(page, /WGS=\{lat:la,lng:wrapLng\(lo\)\}/);
  assert.match(page, /saved=false/);
  assert.match(page, /marker\.setLatLng\(p\)/);
});

test("Worker source opens the map at a close default zoom", () => {
  const page = pages[0][1];
  assert.match(page, /map\.setView\(dispPos\(\),18\)/);
});
