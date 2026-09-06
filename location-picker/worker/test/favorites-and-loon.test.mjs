import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sourcePath = new URL("../src/page.js", import.meta.url);
const indexPath = new URL("../src/index.js", import.meta.url);
const loonPath = new URL("../../../ios-location-spoofer.lnplugin", import.meta.url);

const page = await readFile(sourcePath, "utf8");
const worker = await readFile(indexPath, "utf8");

test("Worker page uses server-side favorite storage", () => {
  assert.match(page, /id="favadd"/);
  assert.match(page, /id="favlistbtn"/);
  assert.match(page, /function addFavorite\(\)/);
  assert.match(page, /function applyFavorite\(/);
  assert.match(page, /fetch\(favoriteUrl\("\/favorites"\)/);
  assert.doesNotMatch(page, /localStorage|sessionStorage|FAV_MAX|lp_favs_v1/);
  assert.doesNotMatch(page, /window\.prompt\(/);
  assert.match(page, /var name=\$\("favname"\)\.value\.trim\(\)\|\|def/);
  assert.match(page, /var address=\$\("favaddress"\)\.value\.trim\(\)/);
  assert.match(page, /\$\("favaddress"\)\.value=it\.display_name\|\|""/);
});

test("Clicking a favorite previews it and the apply button activates it", () => {
  assert.match(page, /function previewFavorite\(it\)\{/);
  assert.match(page, /toast\("已显示收藏点，点击“应用”后生效"\)/);
  assert.match(page, /use\.textContent="应用"/);
  assert.match(page, /use\.addEventListener\("click",function\(e\)\{[\s\S]*?applyFavorite\(it\)/);
  assert.match(page, /function applyFavorite\(it\)\{[\s\S]*?commit\(function\(\)\{[\s\S]*?toast\("已应用收藏点/);
});

test("Favorite list marks the currently active spoofed point", () => {
  assert.match(page, /function currentFavoriteId\(\)/);
  assert.match(page, /return String\(favorites\[i\]\.id\|\|""\)/);
  assert.match(page, /activeId&&String\(it\.id\|\|""\)===activeId/);
  assert.match(page, /current\.textContent="当前"/);
  assert.match(page, /refreshFavoriteMark\(\)/);
});

test("Different favorite coordinates resolve to only the matching favorite", () => {
  const favorites = [
    { id: "berlin", latitude: 52.4812, longitude: 13.4231 },
    { id: "uk", latitude: 51.37581, longitude: -0.08688 },
  ];
  const current = { lat: 51.37581, lng: -0.08688 };
  const ids = favorites.filter((item) =>
    Math.abs(item.latitude - current.lat) < 1e-5 &&
    Math.abs(item.longitude - current.lng) < 1e-5,
  ).map((item) => item.id);
  assert.deepEqual(ids, ["uk"]);
  assert.match(page, /commit\(function\(\)\{\s*refreshFavoriteMark\(\);\s*toast\("已应用收藏点/);
});

test("Save button does not pass the click event as a completion callback", () => {
  assert.match(page, /\$\("savebtn"\)\.addEventListener\("click",function\(\)\{commit\(\);\}\)/);
});

test("Favorites support editing name and address only", () => {
  assert.match(page, /function editFavorite\(it\)/);
  assert.match(page, /method:"PATCH"/);
  assert.match(page, /编辑收藏定位点/);
  assert.match(page, /toast\("已显示收藏点，点击“应用”后生效"\)/);
  assert.match(page, /use\.textContent="应用"/);
});

test("Worker exposes global favorites CRUD routes", () => {
  assert.match(worker, /const FAVORITES_KEY = "favorites"/);
  assert.match(worker, /url\.pathname === "\/favorites" && request\.method === "GET"/);
  assert.match(worker, /url\.pathname === "\/favorites" && request\.method === "POST"/);
  assert.match(worker, /request\.method === "PATCH"/);
  assert.match(worker, /function parseFavoriteMeta\(input\)/);
  assert.match(worker, /await env\.LOC_KV\.put\(FAVORITES_KEY/);
});

test("Loon plugin exposes editable accuracy arguments", async () => {
  const content = await readFile(loonPath, "utf8");
  assert.match(content, /horizontalAccuracy\s*=\s*input,"39"/);
  assert.match(content, /verticalAccuracy\s*=\s*input,"1000"/);
  assert.match(
    content,
    /argument=\[\{enabled\},\{latitude\},\{longitude\},\{altitude\},\{horizontalAccuracy\},\{verticalAccuracy\},\{address\},\{configHost\},\{configToken\},\{configUrl\},\{debug\}\]/,
  );
  assert.match(content, /script-path=https:\/\/raw\.githubusercontent\.com\/mekos2772\/ios-location-spoofer\/main\/location-spoofer\.js/);
});
