// 与 location-picker/server.js 的 PAGE 保持一致（地图选点 UI）
export const PAGE = `<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>定位选点</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H" crossorigin="anonymous">
<style>
  html,body{margin:0;height:100%;font-family:-apple-system,BlinkMacSystemFont,sans-serif}
  .bar{padding:8px;display:flex;gap:6px;box-sizing:border-box}
  .bar input{flex:1;padding:10px;font-size:16px;border:1px solid #ccc;border-radius:8px}
  .bar button{padding:10px 14px;font-size:16px;border:0;border-radius:8px;background:#007aff;color:#fff}
  .bar button:disabled{opacity:.55}
  .results{margin:0 8px;border:1px solid #e2e2e2;border-radius:8px;max-height:34vh;overflow:auto;display:none}
  .results.show{display:block}
  .rrow{padding:10px 12px;font-size:14px;border-bottom:1px solid #eee;color:#222;display:flex;align-items:center;gap:8px}
  .rrow:last-child{border-bottom:0}
  .rrow:active{background:#f0f6ff}
  .rrow .fname{flex:1;min-width:0}
  .rrow .current-tag{padding:3px 6px;font-size:12px;border-radius:5px;background:#34c759;color:#fff;flex-shrink:0}
  .rrow .fdel{padding:6px 10px;font-size:13px;border:0;border-radius:6px;background:#ff3b30;color:#fff;flex-shrink:0}
  #map{height:52vh}
  #info{padding:8px 10px;font-size:13px;line-height:1.4}
  .opts{padding:6px 10px 12px;display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end}
  .opts label{font-size:13px;color:#444;display:flex;flex-direction:column}
  .opts input{width:88px;padding:8px;font-size:15px;border:1px solid #ccc;border-radius:6px;margin-top:2px}
  #savebtn{padding:11px 20px;font-size:16px;border:0;border-radius:8px;background:#34c759;color:#fff;font-weight:600}
  #restorebtn{padding:11px 16px;font-size:15px;border:0;border-radius:8px;background:#8e8e93;color:#fff}
  #favadd,#favlistbtn{padding:11px 14px;font-size:15px;border:0;border-radius:8px;background:#5856d6;color:#fff}
  .toast{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);
    background:rgba(0,0,0,.85);color:#fff;padding:10px 16px;border-radius:8px;
    font-size:14px;opacity:0;transition:opacity .3s;pointer-events:none;z-index:9999}
  .toast.show{opacity:1}
  .favmodal{position:fixed;inset:0;background:rgba(0,0,0,.38);display:none;align-items:center;justify-content:center;z-index:10000}
  .favmodal.show{display:flex}
  .favcard{width:min(92vw,420px);box-sizing:border-box;background:#fff;border-radius:14px;padding:18px;box-shadow:0 10px 35px rgba(0,0,0,.25)}
  .favcard h3{margin:0 0 14px;font-size:18px}
  .favcard label{display:block;font-size:13px;color:#444;margin:10px 0}
  .favcard input{display:block;width:100%;box-sizing:border-box;padding:10px;margin-top:5px;font-size:16px;border:1px solid #ccc;border-radius:8px}
  .favactions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}
  .favactions button{padding:9px 14px;border:0;border-radius:8px;font-size:15px}
  #favcancel{background:#e5e5ea;color:#222}
  #favsave{background:#5856d6;color:#fff}
</style>
</head>
<body>
<div class="bar">
  <input id="q" placeholder="搜地名，回车列出候选（只预览，不改定位）">
  <button id="locatebtn" disabled>当前位置</button>
  <button id="btn">搜</button>
</div>
<div class="results" id="results"></div>
<div id="map"></div>
<div id="info">加载中…</div>
<div class="opts">
  <label>名称<input id="favname" type="text" maxlength="200" placeholder="收藏名称"></label>
  <label>地址<input id="favaddress" type="text" maxlength="500" placeholder="地址（可选）"></label>
  <label>海拔(米)<input id="alt" type="number" inputmode="numeric"></label>
  <label>水平精度<input id="hacc" type="number" inputmode="numeric"></label>
  <label>垂直精度<input id="vacc" type="number" inputmode="numeric"></label>
  <button id="savebtn">保存定位</button>
  <button id="restorebtn">恢复真实定位</button>
  <button id="favadd">收藏此点</button>
  <button id="favlistbtn">我的收藏</button>
</div>
<div class="results" id="favs"></div>
<div class="toast" id="toast"></div>
<div class="favmodal" id="favmodal">
  <div class="favcard">
    <h3 id="favmodaltitle">收藏定位点</h3>
    <label>名称<input id="favmodalname" type="text" maxlength="200"></label>
    <label>地址<input id="favmodaladdress" type="text" maxlength="500"></label>
    <div class="favactions">
      <button id="favcancel" type="button">取消</button>
      <button id="favsave" type="button">保存收藏</button>
    </div>
  </div>
</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH" crossorigin="anonymous"></script>
<script>
var token = new URLSearchParams(location.search).get("token") || "";

var GCJ = (function(){
  var PI = Math.PI, a = 6378245.0, ee = 0.00669342162296594323;
  function outOfChina(lat,lng){return (lng<72.004||lng>137.8347)||(lat<0.8293||lat>55.8271);}
  function tLat(x,y){
    var r=-100.0+2.0*x+3.0*y+0.2*y*y+0.1*x*y+0.2*Math.sqrt(Math.abs(x));
    r+=(20.0*Math.sin(6.0*x*PI)+20.0*Math.sin(2.0*x*PI))*2.0/3.0;
    r+=(20.0*Math.sin(y*PI)+40.0*Math.sin(y/3.0*PI))*2.0/3.0;
    r+=(160.0*Math.sin(y/12.0*PI)+320*Math.sin(y*PI/30.0))*2.0/3.0;return r;
  }
  function tLng(x,y){
    var r=300.0+x+2.0*y+0.1*x*x+0.1*x*y+0.1*Math.sqrt(Math.abs(x));
    r+=(20.0*Math.sin(6.0*x*PI)+20.0*Math.sin(2.0*x*PI))*2.0/3.0;
    r+=(20.0*Math.sin(x*PI)+40.0*Math.sin(x/3.0*PI))*2.0/3.0;
    r+=(150.0*Math.sin(x/12.0*PI)+300*Math.sin(x/30.0*PI))*2.0/3.0;return r;
  }
  function wgs2gcj(lat,lng){
    if(outOfChina(lat,lng))return [lat,lng];
    var dLat=tLat(lng-105.0,lat-35.0), dLng=tLng(lng-105.0,lat-35.0);
    var radLat=lat/180.0*PI, m=Math.sin(radLat); m=1-ee*m*m; var sm=Math.sqrt(m);
    dLat=(dLat*180.0)/((a*(1-ee))/(m*sm)*PI);
    dLng=(dLng*180.0)/(a/sm*Math.cos(radLat)*PI);
    return [lat+dLat,lng+dLng];
  }
  function gcj2wgs(lat,lng){ // 迭代反解，往返误差 <0.001 米
    if(outOfChina(lat,lng))return [lat,lng];
    var wlat=lat, wlng=lng;
    for(var i=0;i<3;i++){ var g=wgs2gcj(wlat,wlng); wlat+=lat-g[0]; wlng+=lng-g[1]; }
    return [wlat,wlng];
  }
  return {wgs2gcj:wgs2gcj, gcj2wgs:gcj2wgs};
})();

var map, marker;
var WGS = {lat:0, lng:0};
var datum = "gcj";
var saved = true;
var enabledState = true;  // true=伪造中；false=已恢复真实定位（脚本放行）

function $(id){return document.getElementById(id);}
function toast(t){var e=$("toast");e.textContent=t;e.classList.add("show");setTimeout(function(){e.classList.remove("show");},1800);}
function numOrNull(id){var v=$(id).value.trim();return v===""?null:Number(v);}
// Leaflet 在重复世界地图上可能返回 -239 这类经度，需要归一化。
function wrapLng(lng){return ((((Number(lng)+180)%360)+360)%360)-180;}

function setLocateBusy(busy){
  var b=$("locatebtn");
  b.disabled=!!busy;
  b.textContent=busy?"定位中…":"当前位置";
}

function geolocationErrorMessage(err){
  if(err&&err.code===1)return "定位权限被拒绝，请在 Safari 设置中允许定位";
  if(err&&err.code===2)return "暂时无法获取当前位置";
  if(err&&err.code===3)return "获取当前位置超时，请到开阔处重试";
  return "获取当前位置失败";
}

var favorites=[];
var editingFavoriteId="";
function favoriteUrl(path){return path+"?token="+encodeURIComponent(token);}
function loadFavorites(){
  return fetch(favoriteUrl("/favorites")).then(function(r){
    if(!r.ok)throw new Error("favorites "+r.status);
    return r.json();
  }).then(function(d){
    favorites=Array.isArray(d.favorites)?d.favorites:[];
    renderFavorites();
  }).catch(function(){toast("收藏列表加载失败");});
}
function favoriteCoords(it){
  return {lat:Number(it.latitude!==undefined?it.latitude:it.lat),lng:wrapLng(Number(it.longitude!==undefined?it.longitude:it.lng))};
}
function setFavoriteForm(it){
  var p=favoriteCoords(it);
  if(!Number.isFinite(p.lat)||!Number.isFinite(p.lng)){toast("收藏坐标无效");return false;}
  WGS=p;
  saved=false;
  $("favname").value=it.name||"";
  $("favaddress").value=it.address||"";
  if(it.altitude!=null&&it.altitude!=="")$("alt").value=it.altitude;
  if(it.horizontalAccuracy!=null&&it.horizontalAccuracy!=="")$("hacc").value=it.horizontalAccuracy;
  if(it.verticalAccuracy!=null&&it.verticalAccuracy!=="")$("vacc").value=it.verticalAccuracy;
  var pos=dispPos();
  marker.setLatLng(pos);
  map.setView(pos,18);
  info();
  return true;
}
function previewFavorite(it){
  if(!setFavoriteForm(it))return;
  $("favname").value=it.name||"";
  $("favaddress").value=it.address||"";
  refreshFavoriteMark();
  toast("已显示收藏点，点击“应用”后生效");
}
function applyFavorite(it){
  if(!setFavoriteForm(it))return;
  refreshFavoriteMark();
  commit(function(){
    refreshFavoriteMark();
    toast("已应用收藏点 ✓");
  });
}
function currentFavoriteId(){
  if(!saved||!enabledState||!Number.isFinite(WGS.lat)||!Number.isFinite(WGS.lng))return "";
  for(var i=0;i<favorites.length;i++){
    var p=favoriteCoords(favorites[i]);
    if(Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&
       Math.abs(p.lat-WGS.lat)<1e-5&&Math.abs(p.lng-WGS.lng)<1e-5){
      return String(favorites[i].id||"");
    }
  }
  return "";
}
function refreshFavoriteMark(){
  if($("favs").classList.contains("show"))renderFavs();
}
function renderFavs(){
  var box=$("favs");
  var list=favorites;
  var activeId=currentFavoriteId();
  box.innerHTML="";
  if(!list.length){box.classList.remove("show");return;}
  list.forEach(function(it){
    var row=document.createElement("div");
    row.className="rrow";
    var name=document.createElement("span");
    name.className="fname";
    var p=favoriteCoords(it);
    name.textContent=it.name||(p.lat.toFixed(4)+","+p.lng.toFixed(4));
    name.addEventListener("click",function(){
      $("results").classList.remove("show");
      previewFavorite(it);
    });
    if(activeId&&String(it.id||"")===activeId){
      var current=document.createElement("span");
      current.className="current-tag";
      current.textContent="当前";
      row.appendChild(current);
    }
    var use=document.createElement("button");
    use.className="fdel";
    use.type="button";
    use.style.background="#34c759";
    use.textContent="应用";
    use.addEventListener("click",function(e){
      e.stopPropagation();
      applyFavorite(it);
    });
    var edit=document.createElement("button");
    edit.className="fdel";
    edit.type="button";
    edit.style.background="#ff9500";
    edit.textContent="编辑";
    edit.addEventListener("click",function(e){
      e.stopPropagation();
      editFavorite(it);
    });
    var del=document.createElement("button");
    del.className="fdel";
    del.type="button";
    del.textContent="删";
    del.addEventListener("click",function(e){
      e.stopPropagation();
      if(!confirm("确定删除收藏“"+(it.name||"此点")+"”吗？"))return;
      fetch(favoriteUrl("/favorites/"+encodeURIComponent(it.id)),{method:"DELETE"})
        .then(function(r){if(!r.ok)throw new Error("delete "+r.status);return loadFavorites();})
        .then(function(){toast("已删除收藏");})
        .catch(function(){toast("删除收藏失败");});
    });
    row.appendChild(name);
    row.appendChild(use);
    row.appendChild(edit);
    row.appendChild(del);
    box.appendChild(row);
  });
  box.classList.add("show");
}
function addFavorite(){
  if(!Number.isFinite(WGS.lat)||!Number.isFinite(WGS.lng)){toast("当前坐标无效");return;}
  var def=$("q").value.trim()||(WGS.lat.toFixed(4)+","+WGS.lng.toFixed(4));
  var name=$("favname").value.trim()||def;
  var address=$("favaddress").value.trim();
  editingFavoriteId="";
  $("favmodaltitle").textContent="收藏定位点";
  $("favmodalname").value=name;
  $("favmodaladdress").value=address;
  $("favmodal").classList.add("show");
}
function editFavorite(it){
  editingFavoriteId=String(it.id||"");
  if(!editingFavoriteId){toast("收藏 ID 无效");return;}
  $("favmodaltitle").textContent="编辑收藏定位点";
  $("favmodalname").value=it.name||"";
  $("favmodaladdress").value=it.address||"";
  $("favmodal").classList.add("show");
}
function closeFavoriteModal(){
  $("favmodal").classList.remove("show");
  editingFavoriteId="";
}
function saveFavorite(){
  var name=$("favmodalname").value.trim();
  var address=$("favmodaladdress").value.trim();
  if(!name){toast("名称不能为空");return;}
  if(editingFavoriteId){
    fetch(favoriteUrl("/favorites/"+encodeURIComponent(editingFavoriteId)),{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:name,address:address})})
      .then(function(r){if(!r.ok)throw new Error("update "+r.status);return loadFavorites();})
      .then(function(){closeFavoriteModal();toast("已更新收藏");})
      .catch(function(){toast("更新收藏失败");});
    return;
  }
  if(!Number.isFinite(WGS.lat)||!Number.isFinite(WGS.lng)){closeFavoriteModal();toast("当前坐标无效");return;}
  var def=$("q").value.trim()||(WGS.lat.toFixed(4)+","+WGS.lng.toFixed(4));
  name=name||def;
  $("favname").value=name;
  $("favaddress").value=address;
  var payload={
    name:name,
    address:address,
    latitude:WGS.lat,
    longitude:WGS.lng,
    altitude:numOrNull("alt"),
    horizontalAccuracy:numOrNull("hacc"),
    verticalAccuracy:numOrNull("vacc")
  };
  fetch(favoriteUrl("/favorites"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)})
    .then(function(r){if(!r.ok)throw new Error("create "+r.status);return loadFavorites();})
    .then(function(){closeFavoriteModal();toast("已收藏");})
    .catch(function(){toast("收藏失败");});
}
function toggleFavs(){
  var box=$("favs");
  if(box.classList.contains("show")){box.classList.remove("show");return;}
  $("results").classList.remove("show");
  loadFavorites().then(function(){
    if(!favorites.length){toast("暂无收藏");return;}
    renderFavorites();
  });
}
function renderFavorites(){renderFavs();}

function info(){
  if(!enabledState){
    $("info").innerHTML = "<b style='color:#ff9500'>已恢复真实定位 · 脚本放行不修改</b>　（关开定位后生效）";
    return;
  }
  var tag = saved ? "已保存 ✓" : "未保存 · 点“保存定位”生效";
  $("info").innerHTML = "<b style='color:"+(saved?"#34c759":"#ff9500")+"'>"+tag+"</b>　WGS-84 "+
    WGS.lat.toFixed(5)+", "+WGS.lng.toFixed(5)+"　海拔 "+($("alt").value||"?")+"m";
}

// 切换按钮外观：伪造中(灰按钮“恢复真实定位”) / 已恢复(橙按钮“重新开启伪造”)
function updateEnabledUI(){
  var b=$("restorebtn");
  if(enabledState){ b.textContent="恢复真实定位"; b.style.background="#8e8e93"; }
  else { b.textContent="● 重新开启伪造"; b.style.background="#ff9500"; }
  info();
}

// 一键切换 伪造/恢复真实
function toggleEnabled(){
  var want = !enabledState;
  fetch("/enable?token="+encodeURIComponent(token),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({enabled:want})})
    .then(function(r){
      if(r.ok){ enabledState=want; updateEnabledUI(); refreshFavoriteMark();
        toast(want ? "已开启伪造，记得关开定位生效" : "已恢复真实定位，记得关开定位生效"); }
      else toast("切换失败 "+r.status);
    })
    .catch(function(){ toast("网络错误"); });
}

function dispPos(){return datum==="gcj"?GCJ.wgs2gcj(WGS.lat,WGS.lng):[WGS.lat,WGS.lng];}
function toWgs(lat,lng){lng=wrapLng(lng);return datum==="gcj"?GCJ.gcj2wgs(lat,lng):[lat,lng];}

function fetchElevation(lat,lng){
  lng=wrapLng(lng);
  return fetch("https://api.open-meteo.com/v1/elevation?latitude="+lat+"&longitude="+lng)
    .then(function(r){return r.json();})
    .then(function(d){return (d&&d.elevation&&d.elevation.length)?d.elevation[0]:null;})
    .catch(function(){return null;});
}

function movePin(dispLat,dispLng){
  dispLng=wrapLng(dispLng);
  var w=toWgs(dispLat,dispLng);
  WGS={lat:w[0], lng:wrapLng(w[1])};
  saved=false;
  marker.setLatLng([dispLat,dispLng]);
  info();
  fetchElevation(WGS.lat,WGS.lng).then(function(el){ if(el!==null)$("alt").value=Math.round(el); info(); });
}

function commit(done){
  var payload={lat:WGS.lat, lng:WGS.lng,
    altitude:numOrNull("alt"), horizontalAccuracy:numOrNull("hacc"), verticalAccuracy:numOrNull("vacc")};
  fetch("/set?token="+encodeURIComponent(token),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)})
    .then(function(r){
      if(!r.ok){ toast("保存失败 "+r.status); return; }
      saved=true;
      enabledState=true;
      try{
        updateEnabledUI();
        refreshFavoriteMark();
        if(done)done(); else toast("已保存 ✓ Loon/小火箭约60秒内生效");
      }catch(e){
        console.error("定位已保存，但页面状态更新失败",e);
        toast("已保存，但页面状态更新失败");
      }
    })
    .catch(function(e){ console.error("保存定位请求失败",e); toast("保存请求失败，请检查网络"); });
}

function locateCurrent(){
  if(enabledState){
    showCurrentLocation();
    return;
  }
  if(!navigator.geolocation){
    toast("当前浏览器不支持定位");
    return;
  }

  setLocateBusy(true);
  navigator.geolocation.getCurrentPosition(
    function(pos){
      var lat=Number(pos&&pos.coords&&pos.coords.latitude);
      var lng=wrapLng(pos&&pos.coords&&pos.coords.longitude);
      if(!Number.isFinite(lat)||!Number.isFinite(lng)){
        toast("获取当前位置失败");
        setLocateBusy(false);
        return;
      }

      WGS={lat:lat,lng:lng};
      saved=false;
      var p=dispPos();
      marker.setLatLng(p);
      map.setView(p,18);
      info();
      fetchElevation(WGS.lat,WGS.lng).then(function(el){
        if(el!==null)$("alt").value=Math.round(el);
        info();
      });
      toast("已定位到当前位置，请确认后保存");
      setLocateBusy(false);
    },
    function(err){
      toast(geolocationErrorMessage(err));
      setLocateBusy(false);
    },
    {enableHighAccuracy:true,maximumAge:0,timeout:12000}
  );
}

function showCurrentLocation(){
  var b=$("locatebtn");
  b.disabled=true;
  b.textContent="读取中…";
  fetch("/loc.json?token="+encodeURIComponent(token),{cache:"no-store"})
    .then(function(r){if(!r.ok)throw new Error("loc "+r.status);return r.json();})
    .then(function(d){
      var lat=Number(d.latitude),lng=wrapLng(Number(d.longitude));
      if(!Number.isFinite(lat)||!Number.isFinite(lng))throw new Error("invalid location");
      WGS={lat:lat,lng:lng};
      saved=true;
      enabledState=(d.enabled!==false);
      if(d.altitude!==undefined)$("alt").value=d.altitude;
      if(d.horizontalAccuracy!==undefined)$("hacc").value=d.horizontalAccuracy;
      if(d.verticalAccuracy!==undefined)$("vacc").value=d.verticalAccuracy;
      var p=dispPos();
      marker.setLatLng(p);
      map.setView(p,18);
      updateEnabledUI();
      refreshFavoriteMark();
      toast("已显示当前生效定位");
    })
    .catch(function(e){console.error("读取当前生效定位失败",e);toast("读取当前生效定位失败");})
    .finally(function(){b.disabled=false;b.textContent="当前位置";});
}

function search(){
  var q=$("q").value.trim(); if(!q) return;
  fetch("https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&limit=8&q="+encodeURIComponent(q))
    .then(function(r){return r.json();})
    .then(function(a){
      var box=$("results"); box.innerHTML="";
      if(!a||!a.length){ box.classList.remove("show"); toast("没找到"); return; }
      a.forEach(function(it){
        var row=document.createElement("div");
        row.className="rrow";
        row.textContent=it.display_name;
        row.addEventListener("click",function(){
          box.classList.remove("show"); box.innerHTML="";
          var la=+it.lat, lo=+it.lon;
          WGS={lat:la,lng:wrapLng(lo)};
          saved=false;
          $("favname").value=$("q").value.trim()||it.display_name||"";
          $("favaddress").value=it.display_name||"";
          var p=dispPos();
          marker.setLatLng(p);
          map.setView(p,18);
          info();
          fetchElevation(WGS.lat,WGS.lng).then(function(el){if(el!==null)$("alt").value=Math.round(el);info();});
          toast("已选择搜索地点，请确认后保存或收藏");
        });
        box.appendChild(row);
      });
      box.classList.add("show");
    })
    .catch(function(){toast("搜索失败");});
}

function load(){
  fetch("/loc.json?token="+encodeURIComponent(token)).then(function(r){return r.json();}).then(function(d){
    WGS={lat:d.latitude, lng:d.longitude};
    saved=true;
    enabledState=(d.enabled!==false);
    $("alt").value=(d.altitude!==undefined?d.altitude:"");
    $("hacc").value=(d.horizontalAccuracy!==undefined?d.horizontalAccuracy:39);
    $("vacc").value=(d.verticalAccuracy!==undefined?d.verticalAccuracy:1000);

    var amapVec=L.tileLayer("https://wprd0{s}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=7",{subdomains:"1234",maxZoom:18,attribution:"高德地图"});
    amapVec.datum="gcj";
    var amapSat=L.layerGroup([
      L.tileLayer("https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}",{subdomains:"1234",maxZoom:18}),
      L.tileLayer("https://wprd0{s}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=8",{subdomains:"1234",maxZoom:18})
    ]);
    amapSat.datum="gcj";
    var osm=L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"});
    osm.datum="wgs";

    map=L.map("map");
    amapVec.addTo(map); datum="gcj";
    map.setView(dispPos(),18);
    L.control.layers({"高德地图":amapVec,"高德卫星":amapSat,"国外 OSM":osm},null,{collapsed:false}).addTo(map);

    marker=L.marker(dispPos(),{draggable:true}).addTo(map);
    updateEnabledUI();
    setLocateBusy(false);

    map.on("baselayerchange",function(e){
      datum=e.layer.datum||"wgs";
      var p=dispPos(); marker.setLatLng(p); map.setView(p,18);
      info();
    });
    map.on("click",function(e){movePin(e.latlng.lat,e.latlng.lng);});
    marker.on("dragend",function(){var p=marker.getLatLng(); movePin(p.lat,p.lng);});
    loadFavorites();
  }).catch(function(){$("info").textContent="加载失败，检查 token 是否正确";});
}

$("btn").addEventListener("click",search);
$("q").addEventListener("keydown",function(e){if(e.key==="Enter")search();});
$("locatebtn").addEventListener("click",locateCurrent);
$("savebtn").addEventListener("click",function(){commit();});
$("restorebtn").addEventListener("click",toggleEnabled);
$("favadd").addEventListener("click",addFavorite);
$("favlistbtn").addEventListener("click",toggleFavs);
$("favcancel").addEventListener("click",closeFavoriteModal);
$("favsave").addEventListener("click",saveFavorite);
load();
</script>
</body>
</html>`;
