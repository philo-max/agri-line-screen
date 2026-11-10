import {Scene3D} from './scene3d.js';
var $=function(s){return document.querySelector(s)};
var C={green:'#2f6b3a',leaf:'#4f9a45',leaf2:'#6aa84f',wheat:'#d9a93b',soil:'#a47c4b',ok:'#2f7d32',warn:'#9a6b00',bad:'#c4453c',line:'#cfd9c2',dash:'#a9b88f',track:'#dde6cf',ink:'#24321f',muted:'#5a6650',olive:'#7f9467'};
var PAL=[C.green,C.leaf2,C.wheat,C.soil,C.olive];
var pad=function(n){return String(n).padStart(2,'0')};
var clock=function(d){d=d||new Date();return pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds())};
var dtStr=function(){var d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' '+clock(d)};
var R=function(a,b){return a+Math.random()*(b-a)};
var clamp=function(v,a,b){return Math.max(a,Math.min(b,v))};
var sd=11;var rn=function(){sd=(sd*16807)%2147483647;return (sd-1)/2147483646};
var hm=function(m){return Math.floor(m/60)+'h '+pad(Math.floor(m%60))+'m'};
var pc=function(v){return (v*100).toFixed(1)+'%'};
var STN={run:'运行',stand:'待机',fault:'故障',off:'离线'};
var stH=function(u){return '<span class="s-'+u.st+'">● '+STN[u.st]+'</span>'};
var DEVICE_IMG='img/device.png';

/* ---------- 数据 ---------- */
var UN=[
 {n:'物料仓储单元',s:'仓储',code:'U-01',st:'run',temp:22.4,hum:48.2,rpm:1180,pw:3.2,min:512,av:.91,pf:.88,ql:.97,en:128,
  sp:[{l:'库存量',v:1860,u:'件',max:2500,cum:0},{l:'出入库次数',v:342,u:'次',max:600,cum:1},{l:'货位占用率',v:72,u:'%',max:100,cum:0}]},
 {n:'物料传输单元',s:'传输',code:'U-02',st:'run',temp:26.1,hum:44.5,rpm:860,pw:2.6,min:498,av:.89,pf:.9,ql:.98,en:96,
  sp:[{l:'传送速度',v:1.2,u:'m/s',max:2,cum:0},{l:'堵塞次数',v:3,u:'次',max:20,cum:1},{l:'搬运节拍',v:18,u:'s',max:40,cum:0}]},
 {n:'农作物配比单元',s:'配比',code:'U-03',st:'stand',temp:24.8,hum:52,rpm:0,pw:.4,min:301,av:.74,pf:.8,ql:.95,en:74,
  sp:[{l:'配比精度',v:98.6,u:'%',max:100,cum:0},{l:'配比批次',v:56,u:'批',max:100,cum:1},{l:'原料偏差',v:.8,u:'%',max:5,cum:0}]},
 {n:'品质检测单元',s:'检测',code:'U-04',st:'fault',temp:29.3,hum:41,rpm:0,pw:.2,min:276,av:.7,pf:.84,ql:.93,en:61,
  sp:[{l:'检测数',v:1240,u:'件',max:2000,cum:1},{l:'不良数',v:87,u:'件',max:200,cum:1},{l:'检出率',v:96.4,u:'%',max:100,cum:0}]}
];
var ALT=[['库存低位','货架通讯中断','温湿度超限'],['传送堵塞','电机过载','光电传感器异常'],['配比偏差','称重传感器异常','物料不足'],['检测不合格率偏高','视觉相机异常','剔除机构故障']];
var CAT={'库存低位':'物料异常','物料不足':'物料异常','货架通讯中断':'传感通讯','光电传感器异常':'传感通讯','称重传感器异常':'传感通讯','视觉相机异常':'传感通讯','温湿度超限':'设备故障','电机过载':'设备故障','传送堵塞':'设备故障','剔除机构故障':'设备故障','配比偏差':'质量异常','检测不合格率偏高':'质量异常'};
var CATS=['设备故障','传感通讯','物料异常','质量异常'];
var PL={temp:['温度','℃'],hum:['湿度','%'],rpm:['转速','rpm'],pw:['功率','kW']};
var TEAMS=[{s:'早班',tm:'08:00-16:00',g:'班组 A',n:12,u:'物料仓储 · 物料传输'},{s:'中班',tm:'16:00-24:00',g:'班组 B',n:10,u:'农作物配比 · 品质检测'},{s:'晚班',tm:'00:00-08:00',g:'班组 C',n:8,u:'全线巡检'}];
var S={view:'overview',unit:0,param:'temp',dim:'type',scene:'all',period:'day',of:'all',af:{u:'all',l:'all',s:'all'},ap:0,out:1286,id:100,alarms:[],logs:[[],[],[],[]],energy:[],yld:[],oeeS:[],
 base:[],
 orders:[{id:'DD-0001',p:'生菜育苗配比包',qty:500,done:352,st:'run',due:'11-03'},{id:'DD-0002',p:'番茄营养液配比',qty:300,done:121,st:'run',due:'11-04'},{id:'DD-0003',p:'黄瓜基质配比包',qty:400,done:0,st:'wait',due:'11-05'},{id:'DD-0004',p:'草莓育苗配比包',qty:200,done:200,st:'done',due:'11-02'},{id:'DD-0005',p:'薄荷种植套装',qty:150,done:150,st:'done',due:'11-01'},{id:'DD-0006',p:'水培蔬菜配比包',qty:350,done:0,st:'wait',due:'11-06'}],
 mats:[{n:'育苗基质',s:'基质',ui:0,stock:820,safe:400,rate:2,al:0},{n:'有机肥',s:'有机肥',ui:0,stock:610,safe:300,rate:1.5,al:0},{n:'营养液原料',s:'营养液',ui:2,stock:260,safe:300,rate:2.5,al:0},{n:'种子',s:'种子',ui:2,stock:140,safe:200,rate:1,al:0}],
 defects:[{l:'外观缺陷',v:34},{l:'尺寸偏差',v:22},{l:'重量不符',v:15},{l:'杂质',v:11},{l:'其他',v:5}],
 tl:[]};
var oee=function(u){return u.av*u.pf*u.ql};
var avg=function(f){return UN.reduce(function(a,u){return a+f(u)},0)/UN.length};
var matSt=function(m){return m.stock<m.safe*.6?['缺料','var(--bad)',C.bad]:(m.stock<m.safe?['偏低','var(--warn)',C.wheat]:['充足','var(--ok)',C.leaf])};

function mkHist(u){u.hist={temp:[],hum:[],rpm:[],pw:[]};for(var i=0;i<40;i++){u.hist.temp.push(u.temp+R(-1,1));u.hist.hum.push(u.hum+R(-2,2));u.hist.rpm.push(u.st==='run'?u.rpm+R(-60,60):0);u.hist.pw.push(u.st==='run'?u.pw+R(-.3,.3):u.pw)}}
function addLog(ui,k,txt){S.logs[ui].unshift({t:clock(),k:k,txt:txt});if(S.logs[ui].length>8)S.logs[ui].pop()}
function addAlarm(ui,lv,type,when){var d=when||new Date();S.alarms.unshift({id:++S.id,t:clock(d),h:d.getHours(),ui:ui,lv:lv,type:type,st:'未处理'});if(!when)addLog(ui,'告警',type)}
function init(){
 UN.forEach(mkHist);
 for(var i=0;i<30;i++){S.energy.push(9+Math.sin(i/4)*1.2+R(-.3,.3));S.base.push(9.4+Math.sin(i/5)*1.1);S.yld.push(95.5+R(-1,1));S.oeeS.push(70+R(-3,3))}
 var offs=[];for(var k=0;k<22;k++)offs.push(8+Math.floor(rn()*700));offs.sort(function(a,b){return a-b});
 var list=[];offs.forEach(function(o,k){var ui=Math.floor(rn()*4),ty=ALT[ui][Math.floor(rn()*3)],r=rn(),lv=r<.15?'严重':(r<.55?'一般':'提示');
  var d=new Date(Date.now()-o*60000);list.push({id:k+1,t:clock(d),h:d.getHours(),ui:ui,lv:lv,type:ty,st:k<4?(k%2?'处理中':'未处理'):'已处理'})});
 S.alarms=list.reverse().reverse();
 S.alarms.unshift({id:99,t:clock(new Date(Date.now()-4*60000)),h:new Date(Date.now()-4*60000).getHours(),ui:3,lv:'严重',type:'剔除机构故障',st:'未处理'});
 S.alarms.forEach(function(a){if(a.id<50||a.id===99)S.logs[a.ui].push({t:a.t,k:'告警',txt:a.type})});
 S.logs.forEach(function(l,i){l.length=Math.min(l.length,4);l.push({t:'08:00:00',k:'状态',txt:'单元启动，进入'+(UN[i].st==='stand'?'待机':'运行')});l.push({t:'07:58:00',k:'操作',txt:'班前点检完成'})});
 for(var u=0;u<4;u++){var segs=[],tot=0;while(tot<100){var w=Math.min(100-tot,6+Math.floor(rn()*22)),r2=rn();segs.push({st:r2<.78?'run':(r2<.95?'stand':'fault'),w:w});tot+=w}S.tl.push(segs)}
}

/* ---------- 图表 ---------- */
function lineSvg(series,w,h,o){o=o||{};var pl=o.pl||34,pr=10,pt=10,pb=o.xl?22:10;
 var all=[];series.forEach(function(s){all=all.concat(s.d)});var mn=o.min!==undefined?o.min:Math.min.apply(null,all),mx=o.max!==undefined?o.max:Math.max.apply(null,all);
 if(mx===mn){mx+=1;mn-=1}var pd=(mx-mn)*.12;if(o.min===undefined)mn-=pd;if(o.max===undefined)mx+=pd;
 var n0=series[0].d.length;var X=function(i,n){return pl+(w-pl-pr)*i/(n-1)};var Y=function(v){return pt+(h-pt-pb)*(1-(v-mn)/(mx-mn))};
 var fmt=o.fmt||function(x){return Math.round(x)};var g='';
 for(var k=0;k<=2;k++){var v=mn+(mx-mn)*k/2,y=Y(v);g+='<line x1="'+pl+'" x2="'+(w-pr)+'" y1="'+y+'" y2="'+y+'" stroke="'+C.track+'"/><text x="'+(pl-5)+'" y="'+(y+4)+'" text-anchor="end" font-size="11" fill="'+C.muted+'">'+fmt(v)+'</text>'}
 if(o.xl){var st=Math.ceil(n0/8);for(var i=0;i<n0;i+=st){g+='<text x="'+X(i,n0)+'" y="'+(h-6)+'" text-anchor="middle" font-size="11" fill="'+C.muted+'">'+o.xl[i]+'</text>'}}
 if(o.th!==undefined){var ty=Y(o.th);g+='<line x1="'+pl+'" x2="'+(w-pr)+'" y1="'+ty+'" y2="'+ty+'" stroke="'+C.bad+'" stroke-dasharray="6 5"/><text x="'+(w-pr-2)+'" y="'+(ty-4)+'" text-anchor="end" font-size="11" fill="'+C.bad+'">告警阈值</text>'}
 series.forEach(function(s){var n=s.d.length,pts=s.d.map(function(v,i){return X(i,n).toFixed(1)+','+Y(v).toFixed(1)}).join(' ');
  if(s.area)g+='<polygon points="'+X(0,n)+','+Y(mn)+' '+pts+' '+X(n-1,n)+','+Y(mn)+'" fill="'+s.c+'" opacity=".12"/>';
  g+='<polyline points="'+pts+'" fill="none" stroke="'+s.c+'" stroke-width="2.2" stroke-linejoin="round"'+(s.dash?' stroke-dasharray="6 5"':'')+'/>';
  if(!s.dash)g+='<circle cx="'+X(n-1,n)+'" cy="'+Y(s.d[n-1])+'" r="4" fill="'+s.c+'"><title>'+(+s.d[n-1].toFixed(1))+'</title></circle>'});
 return '<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+(o.label||'折线图')+'">'+g+'</svg>'}
function barsSvg(items,w,h,o){o=o||{};var pl=36,pr=8,pt=22,pb=26;var mx=o.max||Math.max.apply(null,items.map(function(i){return i.v}).concat([1]))*1.2;var bw=(w-pl-pr)/items.length;
 var g='<line x1="'+pl+'" y1="'+(h-pb)+'" x2="'+(w-pr)+'" y2="'+(h-pb)+'" stroke="'+C.dash+'"/>';
 [0,.5,1].forEach(function(k){var y=pt+(h-pt-pb)*(1-k);g+='<line x1="'+pl+'" x2="'+(w-pr)+'" y1="'+y+'" y2="'+y+'" stroke="'+C.track+'"/><text x="'+(pl-5)+'" y="'+(y+4)+'" font-size="11" text-anchor="end" fill="'+C.muted+'">'+Math.round(mx*k)+'</text>'});
 items.forEach(function(it,i){var bh=(h-pt-pb)*it.v/mx,x=pl+bw*i+bw*.2,y=h-pb-bh;
  g+='<rect x="'+x+'" y="'+y+'" width="'+bw*.6+'" height="'+bh+'" rx="2" fill="'+(it.c||C.leaf)+'"><title>'+it.l+' '+it.v+'</title></rect><text x="'+(x+bw*.3)+'" y="'+(y-5)+'" text-anchor="middle" font-size="12" font-weight="600" fill="'+C.ink+'">'+(o.fmt?o.fmt(it.v):it.v)+'</text><text x="'+(x+bw*.3)+'" y="'+(h-pb+16)+'" text-anchor="middle" font-size="12" fill="'+C.muted+'">'+(it.s||it.l)+'</text>'});
 return '<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+(o.label||'柱状图')+'">'+g+'</svg>'}
function groupSvg(gs,cols,w,h){var pl=34,pr=8,pt=20,pb=26,mx=100,gw=(w-pl-pr)/gs.length,n=cols.length,bw=gw*.72/n;
 var g='<line x1="'+pl+'" y1="'+(h-pb)+'" x2="'+(w-pr)+'" y2="'+(h-pb)+'" stroke="'+C.dash+'"/>';
 [0,.5,1].forEach(function(k){var y=pt+(h-pt-pb)*(1-k);g+='<line x1="'+pl+'" x2="'+(w-pr)+'" y1="'+y+'" y2="'+y+'" stroke="'+C.track+'"/><text x="'+(pl-5)+'" y="'+(y+4)+'" font-size="11" text-anchor="end" fill="'+C.muted+'">'+mx*k+'</text>'});
 gs.forEach(function(gp,i){var x0=pl+gw*i+gw*.14;gp.vals.forEach(function(v,j){var bh=(h-pt-pb)*v/mx,x=x0+bw*j,y=h-pb-bh;g+='<rect x="'+x+'" y="'+y+'" width="'+(bw-2)+'" height="'+bh+'" rx="2" fill="'+cols[j]+'"><title>'+gp.l+' '+v.toFixed(1)+'%</title></rect><text x="'+(x+bw/2-1)+'" y="'+(y-4)+'" text-anchor="middle" font-size="10" fill="'+C.ink+'">'+Math.round(v)+'</text>'});g+='<text x="'+(pl+gw*i+gw/2)+'" y="'+(h-pb+16)+'" text-anchor="middle" font-size="12" fill="'+C.muted+'">'+gp.l+'</text>'});
 return '<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="OEE 分解分组柱状图">'+g+'</svg>'}
function hbarsSvg(items,w,h,o){o=o||{};var pl=o.pl||68,pr=36,pt=6,rowH=(h-pt)/items.length,mx=Math.max.apply(null,items.map(function(i){return i.v}).concat([1]))*1.1,g='';
 items.forEach(function(it,i){var y=pt+rowH*i,bh=Math.min(16,rowH*.55),bw=(w-pl-pr)*it.v/mx;g+='<text x="'+(pl-6)+'" y="'+(y+rowH/2+4)+'" text-anchor="end" font-size="12" fill="'+C.ink+'">'+it.l+'</text><rect x="'+pl+'" y="'+(y+rowH/2-bh/2)+'" width="'+bw+'" height="'+bh+'" rx="2" fill="'+(it.c||C.leaf)+'"><title>'+it.l+' '+it.v+'</title></rect><text x="'+(pl+bw+5)+'" y="'+(y+rowH/2+4)+'" font-size="12" fill="'+C.ink+'">'+it.v+'</text>'});
 return '<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+(o.label||'条形图')+'">'+g+'</svg>'}
function donutSvg(items,size,label){var tot=items.reduce(function(a,b){return a+b.v},0),t=tot||1,r=size*.31,cx=size/2,cir=2*Math.PI*r,off=0,g='';
 items.forEach(function(it){var len=cir*it.v/t;g+='<circle cx="'+cx+'" cy="'+cx+'" r="'+r+'" fill="none" stroke="'+it.c+'" stroke-width="'+size*.2+'" stroke-dasharray="'+len+' '+(cir-len)+'" stroke-dashoffset="'+(-off)+'" transform="rotate(-90 '+cx+' '+cx+')"><title>'+it.l+' '+it.v+'</title></circle>';off+=len});
 g+='<text x="'+cx+'" y="'+(cx)+'" text-anchor="middle" font-size="'+size*.17+'" font-weight="700" fill="'+C.ink+'">'+tot+'</text><text x="'+cx+'" y="'+(cx+size*.1)+'" text-anchor="middle" font-size="'+size*.085+'" fill="'+C.muted+'">'+(label||'合计')+'</text>';
 return '<svg viewBox="0 0 '+size+' '+size+'" role="img" aria-label="'+(label||'')+'占比环形图">'+g+'</svg>'}
var legend=function(items){return '<div class="leg">'+items.map(function(i){return '<span><i style="background:'+i.c+'"></i>'+i.l+' '+i.v+'</span>'}).join('')+'</div>'};
function gaugeSvg(v,label,sz){sz=sz||84;var r=sz*.35,c=2*Math.PI*r,cx=sz/2,col=v<.6?C.bad:(v<.75?C.wheat:C.leaf);
 return '<svg width="'+sz+'" height="'+sz+'" viewBox="0 0 '+sz+' '+sz+'" role="img" aria-label="'+label+' '+Math.round(v*100)+'%"><circle cx="'+cx+'" cy="'+cx+'" r="'+r+'" fill="none" stroke="'+C.track+'" stroke-width="9"/><circle cx="'+cx+'" cy="'+cx+'" r="'+r+'" fill="none" stroke="'+col+'" stroke-width="9" stroke-linecap="round" stroke-dasharray="'+c*v+' '+c+'" transform="rotate(-90 '+cx+' '+cx+')"/><text x="'+cx+'" y="'+(cx+5)+'" text-anchor="middle" font-size="15" font-weight="600" fill="'+C.ink+'">'+Math.round(v*100)+'%</text></svg>'}
var gauges=function(arr){return '<div class="gau">'+arr.map(function(g){return '<div>'+gaugeSvg(g[1],g[0])+g[0]+'</div>'}).join('')+'</div>'};
var pills=function(act,items,cur){return '<span class="pills">'+items.map(function(it){return '<button class="pill'+(it[0]===cur?' on':'')+'" data-act="'+act+'" data-arg="'+it[0]+'">'+it[1]+'</button>'}).join('')+'</span>'};
function P(t,inner,o){o=o||{};return '<section class="panel" style="'+(o.style||'')+'"><h3 class="pt">'+(o.n?'<i class="rb">'+o.n+'</i>':'')+t+(o.right?'<span class="pr">'+o.right+'</span>':'')+(o.more?'<a class="more" href="#'+o.more+'">详情 ›</a>':'')+'</h3>'+inner+'</section>'}
var kpi=function(l,v,link,col){var tag=link?'a':'div';return '<'+tag+' class="kpi"'+(link?' href="#'+link+'"':'')+'><small>'+l+(link?' ›':'')+'</small><b'+(col?' style="color:'+col+'"':'')+'>'+v+'</b></'+tag+'>'};
var tr=function(cols,cells,cls,href,extra){return '<'+(href?'a href="#'+href+'"':'div')+' class="tr '+(cls||'')+'" style="--cols:'+cols+'"'+(extra||'')+'>'+cells.map(function(c){return '<span>'+c+'</span>'}).join('')+'</'+(href?'a':'div')+'>'};

/* ---------- 告警统计 ---------- */
function dimItems(list,dim){var keys,fn;
 if(dim==='type'){keys=CATS;fn=function(a){return CAT[a.type]}}
 else if(dim==='unit'){keys=UN.map(function(u){return u.s});fn=function(a){return UN[a.ui].s}}
 else{keys=['0-6时','6-12时','12-18时','18-24时'];fn=function(a){return keys[Math.floor(a.h/6)]}}
 return keys.map(function(k,i){return {l:k,s:(dim==='type'?k.slice(0,2):k),v:list.filter(function(a){return fn(a)===k}).length,c:PAL[i%PAL.length]}})}
var unhandled=function(ui){return S.alarms.filter(function(a){return a.ui===ui&&a.st!=='已处理'&&a.lv==='严重'}).length};

/* ---------- 3D 场景（Three.js，见 scene3d.js） ---------- */
function sceneHtml(){return '<section class="panel scene m-'+S.scene+'" id="scene" style="flex:1"><h3 class="pt"><i class="rb">7</i>▲ 3D 数字化农业产线监控场景<span class="pr"><span class="cap">拖动旋转 · 滚轮缩放 · 点击单元</span>'+pills('scene',[['all','全景'],['focus','单元聚焦'],['trace','运行轨迹']],S.scene)+'</span></h3><div class="sc"><div class="sc3d" id="sc3d"></div><div class="lg"><span class="s-run">● 运行</span><span class="s-stand">● 待机</span><span class="s-fault">● 故障</span><span style="color:#b8860b">● 运行轨迹</span></div><div class="card" id="scCard"></div></div></section>'}
function updateScene(){Scene3D.setUnits(UN);
 var c=$('#scCard');if(c){var u=UN[S.unit];c.innerHTML='<b style="font-size:16px">'+u.n+'</b> '+stH(u)+'<div class="sp" style="margin:8px 0"><div><span>温度</span><b>'+u.temp.toFixed(1)+' ℃</b></div><div><span>湿度</span><b>'+u.hum.toFixed(1)+' %</b></div><div><span>转速</span><b>'+Math.round(u.rpm)+' rpm</b></div><div><span>功率</span><b>'+u.pw.toFixed(1)+' kW</b></div></div><a class="more" style="display:inline-block" href="#unit" data-unit="'+S.unit+'">进入单元详情 ›</a>'}}

/* ---------- 页头 ---------- */
var live=function(){return '<span class="live"><i class="rb">6</i><b class="dot pulse"></b>实时更新 · 刷新周期 2 秒</span><span class="clk" id="clk">'+dtStr()+'</span>'};
var dhdr=function(title,from,right){return '<header class="hdr"><div class="l"><a class="back" href="#overview">‹ 返回总览</a></div><h1 class="d">'+title+'</h1><div class="r">'+(right||'<span>下钻自：'+from+'</span>')+'</div></header>'};

/* ---------- 视图：总览 ---------- */
var V={};
V.overview={
 shell:function(){return '<header class="hdr"><div class="l"><span class="sel0">产线选择：农业产线 01 ▾</span></div><h1>数字化农业产线 · 大数据监控中心</h1><div class="r">'+live()+'</div></header><div class="body"><div class="col" style="width:600px" id="ovL"></div><div class="col grow"><div class="kpis" id="ovK"></div>'+sceneHtml()+'<div class="row" style="height:232px;flex:none" id="ovB"></div></div><div class="col" style="width:600px" id="ovR"></div></div>'},
 update:function(){
  var cnt={run:0,stand:0,fault:0,off:0};UN.forEach(function(u){cnt[u.st]++});
  var tiles=['run','stand','fault','off'].map(function(k){return '<div class="tile"><b class="s-'+k+'">'+pad(cnt[k])+'</b><span>'+STN[k]+'</span></div>'}).join('');
  var rows=tr('1.5fr .7fr .8fr 1fr',['单元名称','编号','状态','运行时长'],'h')+UN.map(function(u,i){return tr('1.5fr .7fr .8fr 1fr',[u.n,u.code,stH(u),hm(u.min)],'',  'unit',' data-unit="'+i+'"')}).join('');
  var o=avg(oee),ens=S.energy.map(function(v){return v});
  var rt=tr('1.6fr .9fr .9fr .9fr .9fr',['单元','温度','湿度','转速','功率'],'h')+UN.map(function(u){return tr('1.6fr .9fr .9fr .9fr .9fr',[u.n,u.temp.toFixed(1),u.hum.toFixed(1),Math.round(u.rpm),u.pw.toFixed(1)])}).join('');
  $('#ovL').innerHTML=P('产线运行状态 · 单元基本信息','<div class="tiles">'+tiles+'</div><div class="tbl">'+rows+'</div>',{n:2,more:'unit',style:'height:292px;flex:none'})+
   P('绩效指标 · OEE · 能耗',gauges([['OEE',o],['稼动率',avg(function(u){return u.av})],['性能率',avg(function(u){return u.pf})],['良品率',avg(function(u){return u.ql})]])+'<div class="cap" style="display:flex;justify-content:space-between"><span>能耗趋势 kW（实线今日 / 虚线昨日）</span></div><div class="cbox">'+lineSvg([{d:S.base,c:C.wheat,dash:1},{d:ens,c:C.leaf,area:1}],540,84,{label:'能耗趋势',fmt:function(x){return x.toFixed(0)}})+'</div>',{n:3,more:'perf',style:'height:276px;flex:none'})+
   P('单元实时数据','<div class="tbl">'+rt+'</div>',{n:1,more:'unit',style:'flex:1'});
  $('#ovK').innerHTML=kpi('今日产量',S.out.toLocaleString())+kpi('综合 OEE',pc(o),'perf')+kpi('今日能耗',Math.round(UN.reduce(function(a,u){return a+u.en},0))+' kWh','perf')+kpi('综合良率',pc(avg(function(u){return u.ql})),'perf');
  var nodes=UN.map(function(u,i){var bd=u.st==='fault'?C.bad:'#7f9467';return '<a href="#unit" data-unit="'+i+'" style="width:132px;text-align:center;text-decoration:none;color:inherit"><div style="border:1px solid '+bd+';border-radius:4px;padding:12px 0;font-size:14px;'+(u.st==='fault'?'background:#fdf0ee':'')+'"><span class="s-'+u.st+'">●</span><br>'+u.n.replace('单元','')+'<br>单元</div><div class="cap" style="margin-top:4px">'+stH(u)+'</div></a>'}).join('<span style="color:#666">▶</span>');
  var al=S.alarms.slice(0,5).map(function(a){return tr('.9fr .5fr 1.9fr',[a.t,'<b class="lv-'+a.lv+'">'+a.lv+'</b>',UN[a.ui].s+' · '+a.type])}).join('');
  $('#ovB').innerHTML=P('产线单元流程状态','<div style="flex:1;display:flex;align-items:center;justify-content:space-between">'+nodes+'</div>',{n:2,style:'width:700px;flex:none'})+P('实时告警（滚动）','<div class="tbl">'+al+'</div>',{n:5,more:'alarm',style:'flex:1'});
  var ord=S.orders.filter(function(x){return x.st!=='done'}).slice(0,3).map(function(x){return '<div style="display:flex;align-items:center;gap:8px;font-size:13px"><span style="width:70px">'+x.id+'</span><div class="prog" style="flex:1"><i style="width:'+x.done/x.qty*100+'%"></i></div><span style="width:56px;text-align:right">'+(x.st==='run'?'生产中':'待排产')+'</span></div>'}).join('');
  var ct=TEAMS[curTeam()];
  var mt=S.mats.map(function(m){var s=matSt(m);return '<div style="display:flex;align-items:center;gap:8px;font-size:13px"><span style="width:56px">'+m.s+'</span><div class="prog" style="flex:1"><i style="width:'+Math.min(100,m.stock/(m.safe*2)*100)+'%;background:'+s[2]+'"></i></div><span style="width:44px;text-align:right;color:'+s[1]+'">'+s[0]+'</span></div>'}).join('');
  $('#ovR').innerHTML=P('订单 · 班组 · 物料状态','<div class="cap">订单状态</div><div style="display:flex;flex-direction:column;gap:6px">'+ord+'</div><div style="font-size:14px;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="cap">当前班组</span><span style="border:1px solid #7f9467;border-radius:4px;padding:2px 10px">'+ct.g+'</span><span>'+ct.s+' · 人数 '+ct.n+'</span></div><div class="cap">物料状态（物料仓储 / 配比单元）</div><div style="display:flex;flex-direction:column;gap:6px">'+mt+'</div>',{n:4,more:'order',style:'height:330px;flex:none'})+
   statPanel()+
   P('产线良率 · 不良品分析（品质检测）','<div class="row" style="flex:1"><div class="cbox">'+lineSvg([{d:S.yld,c:C.leaf,area:1}],200,170,{label:'良率趋势',min:90,max:100,fmt:function(x){return x.toFixed(0)+'%'},pl:38})+'<span class="cap">良率趋势</span></div><div class="cbox">'+hbarsSvg(S.defects.map(function(d,i){return {l:d.l,v:d.v,c:PAL[i%5]}}),200,170,{label:'不良品原因'})+'<span class="cap">不良原因 Top</span></div></div>',{n:5,more:'perf',style:'flex:1'});
  updateScene()}
};
function statPanel(h){h=h||258;var it=dimItems(S.alarms,S.dim);return P('单元告警统计分析','<div class="row" style="flex:1"><div class="cbox">'+donutSvg(it,170,'告警')+legend(it)+'</div><div class="cbox">'+barsSvg(it,260,190,{label:'告警次数'})+'<span class="cap">告警次数（柱状图）</span></div></div>',{n:5,right:pills('dim',[['type','按类型'],['unit','按单元'],['time','按时段']],S.dim),more:'alarm',style:'height:'+h+'px;flex:none'})}
function curTeam(){var h=new Date().getHours();return h>=8&&h<16?0:(h>=16?1:2)}

/* ---------- 视图：单元详情 ---------- */
V.unit={
 shell:function(){var u=UN[S.unit];
  return dhdr('单元详情 · '+u.n,'运行状态 / 实时数据 / 3D 单元 / 工序流程')+
  '<div style="height:48px;flex:none;background:var(--head);border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 24px"><span class="pills" style="gap:8px">'+UN.map(function(x,i){return '<button class="pill'+(i===S.unit?' on':'')+'" style="font-size:16px;padding:6px 18px;background:'+(i===S.unit?'':'#fff')+'" data-act="unit" data-arg="'+i+'">'+x.n+'</button>'}).join('')+'</span><span id="uSt"></span></div>'+
  '<div class="body"><div class="col" style="width:520px"><section class="panel" style="height:400px;flex:none"><h3 class="pt">设备实物图</h3><div class="cbox" style="padding:6px"><img src="'+DEVICE_IMG+'" alt="'+u.n+'设备实物图" style="max-width:100%;max-height:100%;object-fit:contain"></div></section><div id="uInfo" style="flex:1;min-height:0;display:flex"></div></div><div class="col grow" id="uC"></div><div class="col" style="width:520px" id="uR"></div></div>'},
 update:function(){var u=UN[S.unit],i=S.unit;
  $('#uSt').innerHTML=stH(u)+'　编号：'+u.code+'　● 实时更新';
  $('#uInfo').innerHTML=P('基本信息','<div>'+[['单元名称',u.n],['设备编号',u.code],['设备型号','—'],['所属产线','农业产线 01'],['运行时长',hm(u.min)],['负责班组',TEAMS[curTeam()].g],['通讯状态','<span class="s-run">● 在线</span>']].map(function(r){return '<div class="info"><span>'+r[0]+'</span><span>'+r[1]+'</span></div>'}).join('')+'</div>',{style:'flex:1'});
  var tiles=['temp','hum','rpm','pw'].map(function(k){var v=u[k];return '<div class="kpi"><small>'+PL[k][0]+'</small><b style="font-size:32px">'+(k==='rpm'?Math.round(v):v.toFixed(1))+' <span style="font-size:16px;font-weight:400">'+PL[k][1]+'</span></b></div>'}).join('');
  var th={temp:32,hum:65,rpm:1400,pw:4.2}[S.param];
  var tl=S.tl[i].map(function(s){return '<div style="flex:'+s.w+';background:'+(s.st==='run'?C.leaf2:(s.st==='stand'?C.wheat:C.bad))+'"></div>'}).join('');
  var lg=S.logs[i].slice(0,5).map(function(l){return tr('.8fr .6fr 2.5fr',[l.t,l.k,l.txt])}).join('');
  $('#uC').innerHTML='<div class="kpis" style="height:90px">'+tiles+'</div>'+
   P('参数实时曲线','<div class="cbox">'+lineSvg([{d:u.hist[S.param],c:C.leaf,area:1}],1420,215,{label:PL[S.param][0]+'曲线',th:th,fmt:function(x){return S.param==='pw'?x.toFixed(1):Math.round(x)}})+'</div>',{right:pills('param',[['temp','温度'],['hum','湿度'],['rpm','转速'],['pw','功率']],S.param),style:'height:300px;flex:none'})+
   P('运行状态时间轴（24h）','<div class="tl">'+tl+'</div><div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted)"><span>0时</span><span>6时</span><span>12时</span><span>18时</span><span>24时</span></div>',{right:'<span class="cap"><span class="s-run">■</span> 运行　<span class="s-stand">■</span> 待机　<span class="s-fault">■</span> 故障</span>',style:'height:130px;flex:none'})+
   P('运行日志','<div class="tbl">'+tr('.8fr .6fr 2.5fr',['时间','类型','事件内容'],'h')+lg+'</div>',{style:'flex:1'});
  var al=S.alarms.filter(function(a){return a.ui===i}).slice(0,5).map(function(a){return tr('.9fr .5fr 1.5fr .7fr',[a.t,'<b class="lv-'+a.lv+'">'+a.lv+'</b>',a.type,a.st])}).join('');
  var sp=u.sp.map(function(m){var v=m.v;var t=(m.max<10?v.toFixed(1):Math.round(v));return '<div class="sp"><div><span>'+m.l+'</span><b>'+t+' '+m.u+'</b></div><div class="prog"><i style="width:'+clamp(v/m.max*100,0,100)+'%"></i></div></div>'}).join('');
  $('#uR').innerHTML=P('本单元绩效',gauges([['OEE',oee(u)],['稼动率',u.av],['性能率',u.pf],['良品率',u.ql]]),{style:'height:190px;flex:none'})+
   P('本单元告警记录','<div class="tbl">'+tr('.9fr .5fr 1.5fr .7fr',['时间','级别','内容','状态'],'h')+al+'</div>',{right:'',more:'alarm',style:'height:300px;flex:none'})+
   P('单元专属指标','<div class="cap">'+['仓储：库存量 / 出入库次数 / 货位占用率','传输：传送速度 / 堵塞次数 / 搬运节拍','配比：配比精度 / 配比批次 / 原料偏差','检测：检测数 / 不良数 / 检出率'][i]+'（指标待老师确认）</div><div style="display:flex;flex-direction:column;gap:12px;margin-top:4px">'+sp+'</div>',{style:'flex:1'})}
};

/* ---------- 视图：告警详情 ---------- */
function alF(){var f=S.af;return S.alarms.filter(function(a){return (f.u==='all'||a.ui===+f.u)&&(f.l==='all'||a.lv===f.l)&&(f.s==='all'||a.st===f.s)})}
V.alarm={
 shell:function(){var f=S.af;var LB={fU:'按单元筛选',fL:'按级别筛选',fS:'按状态筛选'};var opt=function(id,arr,cur){return '<select class="sel" id="'+id+'" aria-label="'+LB[id]+'">'+arr.map(function(o){return '<option value="'+o[0]+'"'+(String(o[0])===String(cur)?' selected':'')+'>'+o[1]+'</option>'}).join('')+'</select>'};
  return dhdr('告警详情 · 统计分析','实时告警 / 单元告警统计')+'<div class="body" style="flex-direction:column"><div class="panel" style="flex-direction:row;align-items:center;height:50px;flex:none;padding:0 16px;gap:12px"><span class="cap" style="font-size:15px">单元</span>'+opt('fU',[['all','全部单元']].concat(UN.map(function(u,i){return [i,u.n]})),f.u)+'<span class="cap" style="font-size:15px;margin-left:10px">级别</span>'+opt('fL',[['all','全部'],['严重','严重'],['一般','一般'],['提示','提示']],f.l)+'<span class="cap" style="font-size:15px;margin-left:10px">状态</span>'+opt('fS',[['all','全部'],['未处理','未处理'],['处理中','处理中'],['已处理','已处理']],f.s)+'<button class="btn" style="margin-left:auto;font-size:15px;padding:5px 20px" data-act="areset">重置</button></div><div class="kpis" id="alK"></div><div class="row" style="height:270px;flex:none" id="alC"></div><div style="flex:1;min-height:0;display:flex" id="alT"></div></div>'},
 update:function(){var L=alF(),all=S.alarms;
  var cnt={};L.forEach(function(a){cnt[a.ui]=(cnt[a.ui]||0)+1});var top='—',mx=0;Object.keys(cnt).forEach(function(k){if(cnt[k]>mx){mx=cnt[k];top=UN[k].s+'单元'}});
  $('#alK').innerHTML=kpi('告警总数',L.length)+kpi('未处理',L.filter(function(a){return a.st==='未处理'}).length,null,C.bad)+kpi('处理中',L.filter(function(a){return a.st==='处理中'}).length)+kpi('告警最多单元',top);
  var ty=dimItems(L,'type'),un=dimItems(L,'unit');var now=new Date().getHours(),hrs=[],lbl=[];for(var k=11;k>=0;k--){var h=(now-k+24)%24;hrs.push(h);lbl.push(pad(h))}
  var trend=hrs.map(function(h){return L.filter(function(a){return a.h===h}).length});
  $('#alC').innerHTML=P('按类型占比（环形图）','<div class="cbox">'+donutSvg(ty,170,'告警')+legend(ty)+'</div>',{style:'flex:1'})+P('按单元统计（柱状图）','<div class="cbox">'+barsSvg(un,800,200,{label:'各单元告警'})+'</div>',{style:'flex:1'})+P('近 12 小时趋势（折线图）','<div class="cbox">'+lineSvg([{d:trend,c:C.leaf,area:1}],800,200,{label:'告警趋势',xl:lbl,min:0,pl:28})+'</div>',{style:'flex:1'});
  var pages=Math.max(1,Math.ceil(L.length/8));S.ap=clamp(S.ap,0,pages-1);var rows=L.slice(S.ap*8,S.ap*8+8).map(function(a){var nx={'未处理':'处理','处理中':'完成','已处理':''}[a.st];return tr('1fr 1.3fr .6fr .9fr 2fr .8fr .8fr',[a.t,UN[a.ui].n,'<b class="lv-'+a.lv+'">'+a.lv+'</b>',CAT[a.type],a.type,a.st,nx?'<button class="btn" data-act="ack" data-arg="'+a.id+'">'+nx+'</button>':'—'])}).join('');
  $('#alT').innerHTML=P('告警明细（点击“处理”可推进状态）','<div class="tbl">'+tr('1fr 1.3fr .6fr .9fr 2fr .8fr .8fr',['时间','单元','级别','类别','告警内容','状态','操作'],'h')+rows+'</div><div style="display:flex;justify-content:flex-end;gap:8px;align-items:center;font-size:13px;color:var(--muted)"><span>共 '+L.length+' 条 · 第 '+(S.ap+1)+' / '+pages+' 页</span><button class="pill" data-act="apage" data-arg="-1"'+(S.ap<=0?' disabled':'')+'>‹</button><button class="pill" data-act="apage" data-arg="1"'+(S.ap>=pages-1?' disabled':'')+'>›</button></div>',{style:'flex:1'})}
};

/* ---------- 视图：订单·班组·物料 ---------- */
V.order={
 shell:function(){return dhdr('订单 · 班组 · 物料详情','订单 · 班组 · 物料状态')+'<div class="body"><div class="col grow" id="oL"></div><div class="col" style="width:1000px;flex:none" id="oR"></div></div>'},
 update:function(){var O=S.orders,N=function(s){return O.filter(function(x){return x.st===s}).length};
  var list=O.filter(function(x){return S.of==='all'||x.st===S.of});var nm={run:'生产中',wait:'待排产',done:'已完成'};
  var rows=list.map(function(x){return tr('1fr 1.4fr .8fr .8fr 1.5fr .8fr .9fr .7fr',[x.id,x.p,x.qty,x.done,'<div class="prog"><i style="width:'+x.done/x.qty*100+'%"></i></div>',nm[x.st],x.due,x.st==='wait'?'<button class="btn" data-act="sched" data-arg="'+x.id+'">排产</button>':'—'])}).join('');
  var cum=[];var tot=S.orders.reduce(function(a,x){return a+x.done},0);for(var k=11;k>=0;k--)cum.push(tot-k*Math.round(tot/40));
  $('#oL').innerHTML='<div class="kpis">'+kpi('订单总数',O.length)+kpi('生产中',N('run'))+kpi('待排产',N('wait'))+kpi('已完成',N('done'))+'</div>'+
   P('订单列表（待排产订单可点“排产”）','<div class="tbl">'+tr('1fr 1.4fr .8fr .8fr 1.5fr .8fr .9fr .7fr',['订单号','产品','计划数量','已完成','进度','状态','计划完成','操作'],'h')+rows+'</div>',{right:pills('ofilter',[['all','全部'],['run','生产中'],['wait','待排产'],['done','已完成']],S.of),style:'flex:1'})+
   P('累计完成数量趋势','<div class="cbox">'+lineSvg([{d:cum,c:C.leaf,area:1}],1480,140,{label:'完成趋势'})+'</div>',{style:'height:200px;flex:none'});
  var ci=curTeam();var tm=TEAMS.map(function(t,i){return tr('1fr 1fr 1.8fr .6fr',[t.s+' '+t.tm,t.g+(i===ci?' <b style="color:var(--ok)">● 当班</b>':''),t.u,t.n])}).join('');
  var mrows=S.mats.map(function(m,i){var s=matSt(m);return tr('1fr 1.3fr .8fr .8fr .9fr .8fr .7fr',[m.n,UN[m.ui].n,Math.round(m.stock),m.safe,m.rate+' /次','<b style="color:'+s[1]+'">'+s[0]+'</b>','<button class="btn" data-act="refill" data-arg="'+i+'">补料</button>'])}).join('');
  $('#oR').innerHTML=P('班组信息','<div class="tbl">'+tr('1fr 1fr 1.8fr .6fr',['班次','班组','负责单元','人数'],'h')+tm+'</div>',{style:'height:190px;flex:none'})+
   P('物料状态','<div class="tbl">'+tr('1fr 1.3fr .8fr .8fr .9fr .8fr .7fr',['物料','所在单元','库存','安全库存','消耗速度','状态','操作'],'h')+mrows+'</div>',{style:'flex:1'})+
   P('物料库存对比','<div class="cbox">'+barsSvg(S.mats.map(function(m){return {l:m.n,s:m.n,v:Math.round(m.stock),c:matSt(m)[2]}}),960,150,{label:'物料库存'})+'</div>',{style:'height:230px;flex:none'})}
};

/* ---------- 视图：绩效·良率·不良品 ---------- */
var PD={};
function genP(n,b,a,no){var r=[];for(var i=0;i<n;i++)r.push(+(b+a*Math.sin(i/n*6.28)+(rn()-.5)*no).toFixed(1));return r}
function initPD(){var D=['一','二','三','四','五','六','日'];
 PD.day={xl:Array.from({length:24},function(_,i){return pad(i)}),oee:genP(24,76,5,6),en:genP(24,52,14,8),yd:genP(24,96,1.2,2)};
 PD.week={xl:D,oee:genP(7,75,4,5),en:genP(7,1180,160,120),yd:genP(7,96,1,1.6)};
 PD.month={xl:Array.from({length:30},function(_,i){return String(i+1)}),oee:genP(30,74,5,6),en:genP(30,1150,150,140),yd:genP(30,95.5,1.2,2)}}
V.perf={
 shell:function(){return dhdr('绩效 · 良率 · 不良品详情','',pills('period',[['day','日'],['week','周'],['month','月']],S.period))+'<div class="body" style="flex-direction:column"><div class="kpis" id="pK"></div><div class="row" style="flex:1" id="pG"></div></div>'},
 update:function(){var d=PD[S.period],o=avg(oee);
  $('#pK').innerHTML=kpi('综合 OEE',pc(o))+kpi('今日能耗',Math.round(UN.reduce(function(a,u){return a+u.en},0))+' kWh')+kpi('综合良率',pc(avg(function(u){return u.ql})))+kpi('不良品数',S.defects.reduce(function(a,x){return a+x.v},0),null,C.bad);
  var gs=UN.map(function(u){return {l:u.s,vals:[u.av*100,u.pf*100,u.ql*100]}});var cols=[C.green,C.leaf2,C.wheat];
  var en=UN.map(function(u,i){return {l:u.n,s:u.s,v:Math.round(u.en),c:C.leaf}});
  var df=S.defects.map(function(x,i){return {l:x.l,v:x.v,c:PAL[i%5]}});
  var ord=S.orders.slice(0,4).map(function(x,i){return {l:x.id,v:Math.max(1,Math.round(x.done*.03)),c:PAL[i]}});
  var col=function(x){return '<div class="col grow" style="flex:1">'+x+'</div>'};
  $('#pG').innerHTML=col(P('OEE 分解（按单元）','<div class="cbox">'+groupSvg(gs,cols,800,260)+'</div>',{right:'<span class="cap"><span style="color:'+cols[0]+'">■</span> 稼动率 <span style="color:'+cols[1]+'">■</span> 性能率 <span style="color:'+cols[2]+'">■</span> 良品率</span>',style:'flex:1'})+P('OEE 趋势','<div class="cbox">'+lineSvg([{d:d.oee,c:C.leaf,area:1}],800,260,{label:'OEE 趋势',xl:d.xl,fmt:function(x){return Math.round(x)+'%'},pl:40})+'</div>',{style:'flex:1'}))+
   col(P('能耗对比（按单元，kWh）','<div class="cbox">'+barsSvg(en,800,260,{label:'能耗对比'})+'</div>',{style:'flex:1'})+P('能耗趋势','<div class="cbox">'+lineSvg([{d:d.en,c:C.wheat,area:1}],800,260,{label:'能耗趋势',xl:d.xl,pl:44})+'</div>',{style:'flex:1'}))+
   col(P('良率趋势','<div class="cbox">'+lineSvg([{d:d.yd,c:C.leaf,area:1}],800,260,{label:'良率趋势',xl:d.xl,min:90,max:100,fmt:function(x){return Math.round(x)+'%'},pl:40})+'</div>',{style:'flex:1'})+P('不良品分析（品质检测单元）','<div class="row" style="flex:1"><div class="cbox">'+donutSvg(ord,170,'按订单')+legend(ord)+'</div><div class="cbox">'+hbarsSvg(df,260,260,{label:'不良原因'})+'<span class="cap">不良原因 Top</span></div></div>',{style:'flex:1'}))}
};

/* ---------- 渲染与交互 ---------- */
function fit(){var k=Math.min(innerWidth/2580,innerHeight/946);$('#stage').style.transform='scale('+k+')';var h=$('#holder');h.style.width=2580*k+'px';h.style.height=946*k+'px';Scene3D.setScale(k)}
function nav(){document.querySelectorAll('[data-nav]').forEach(function(a){a.classList.toggle('on',a.dataset.nav===S.view)})}
function render(){$('#stage').innerHTML=V[S.view].shell();V[S.view].update();nav();fit();if(S.view==='overview'){Scene3D.mount($('#sc3d'));Scene3D.setMode(S.scene,S.unit)}else Scene3D.unmount()}
function route(){var h=location.hash.slice(1);S.view=V[h]?h:'overview';render()}
function fault(){var c=[];UN.forEach(function(u,i){if(u.st==='run')c.push(i)});if(!c.length)return;var i=c[Math.floor(Math.random()*c.length)];UN[i].st='fault';var ty=ALT[i][Math.floor(Math.random()*3)];addAlarm(i,'严重',ty);addLog(i,'状态','进入故障状态');S.view==='overview'||S.view==='unit'||S.view==='alarm'?V[S.view].update():0}
function ack(id){var a=S.alarms.filter(function(x){return x.id===+id})[0];if(!a)return;a.st=a.st==='未处理'?'处理中':'已处理';addLog(a.ui,'操作','告警“'+a.type+'”'+a.st);
 if(a.st==='已处理'&&UN[a.ui].st==='fault'&&!unhandled(a.ui)){UN[a.ui].st='run';addLog(a.ui,'状态','故障解除，恢复运行')}}
document.addEventListener('click',function(e){var t=e.target.closest('[data-unit]');if(t){var i=+t.dataset.unit;if(t.closest('#scene')&&S.scene==='focus'&&!t.classList.contains('more')){e.preventDefault();S.unit=i;updateScene();return}S.unit=i}
 var b=e.target.closest('[data-act]');if(!b)return;var a=b.dataset.act,g=b.dataset.arg;
 if(a==='req'){var on=document.body.classList.toggle('req');b.setAttribute('aria-pressed',on);return}
 if(a==='full'){var d=document;if(d.fullscreenElement)d.exitFullscreen();else if(d.documentElement.requestFullscreen)d.documentElement.requestFullscreen();return}
 if(a==='fault'){fault();return}
 if(a==='unit'){S.unit=+g}else if(a==='param'){S.param=g}else if(a==='period'){S.period=g}else if(a==='dim'){S.dim=g}else if(a==='scene'){S.scene=g}else if(a==='ofilter'){S.of=g}
 else if(a==='areset'){S.af={u:'all',l:'all',s:'all'};S.ap=0}
 else if(a==='apage'){S.ap+=+g;V.alarm.update();return}
 else if(a==='ack'){ack(g);V[S.view].update();return}
 else if(a==='sched'){S.orders.forEach(function(x){if(x.id===g)x.st='run'})}
 else if(a==='refill'){var m=S.mats[+g];m.stock+=m.safe*1.5;m.al=0}
 render()});
document.addEventListener('change',function(e){var id=e.target.id;if(id==='fU'||id==='fL'||id==='fS'){S.af[id==='fU'?'u':(id==='fL'?'l':'s')]=e.target.value;S.ap=0;V.alarm.update()}});

function tick(){
 var allRun=UN.every(function(u){return u.st==='run'}),anyF=UN.some(function(u){return u.st==='fault'});
 UN.forEach(function(u,i){var on=u.st==='run';u.temp=clamp(u.temp+R(-.3,.3),18,38);u.hum=clamp(u.hum+R(-.6,.6),30,70);
  u.rpm=on?clamp(u.rpm+R(-30,30),500,1500):(u.st==='stand'?u.rpm*.6:0);u.pw=on?clamp(u.pw+R(-.15,.15),1.5,4.5):(u.st==='stand'?.4+R(0,.1):.15+R(0,.05));
  ['av','pf','ql'].forEach(function(k){u[k]=clamp(u[k]+R(-.004,.004),.5,.99)});if(on){u.min+=1;u.en+=u.pw*.03}
  u.sp.forEach(function(m){if(m.cum){if(on)m.v=Math.min(m.max,m.v+R(0,m.max*.004))}else m.v=clamp(m.v+R(-m.max*.004,m.max*.004),0,m.max)});
  ['temp','hum','rpm','pw'].forEach(function(k){u.hist[k].push(u[k]);u.hist[k].shift()})});
 var add=allRun?Math.round(R(1,4)):(anyF?0:1);S.out+=add;
 if(add){var o=S.orders.filter(function(x){return x.st==='run'})[0];if(o){o.done=Math.min(o.qty,o.done+add);if(o.done>=o.qty)o.st='done'}}
 if(!anyF&&Math.random()<.35){S.defects[Math.floor(Math.random()*5)].v++}
 S.mats.forEach(function(m){m.stock=Math.max(0,m.stock-(UN[m.ui].st==='run'?m.rate*R(.5,1.5):0));if(m.stock<m.safe*.6&&!m.al){m.al=1;addAlarm(m.ui,'一般','物料不足')}});
 S.energy.push(UN.reduce(function(a,u){return a+u.pw},0));S.energy.shift();S.yld.push(avg(function(u){return u.ql})*100);S.yld.shift();
 if(Math.random()<.1){var ui=Math.floor(Math.random()*4);addAlarm(ui,Math.random()<.35?'一般':'提示',ALT[ui][Math.floor(Math.random()*3)])}
 V[S.view].update()}
init();initPD();
window.addEventListener('hashchange',route);window.addEventListener('resize',fit);
setInterval(tick,2000);setInterval(function(){var c=$('#clk');if(c)c.textContent=dtStr()},1000);
Scene3D.onPick=function(i){S.unit=i;if(S.scene==='focus'){updateScene();Scene3D.setMode('focus',i)}else{location.hash='unit'}};
route();
