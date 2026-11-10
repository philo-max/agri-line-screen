/* 农业产线 3D 场景：4 个单元 + 传送线 + 作物区，全部由基础几何体程序化建模。
   对外接口：Scene3D.mount / unmount / setUnits / setMode / setScale / onPick */
import * as THREE from 'three';
import {OrbitControls} from '../vendor/OrbitControls.js';
import {RoomEnvironment} from '../vendor/RoomEnvironment.js';
import {RoundedBoxGeometry} from '../vendor/RoundedBoxGeometry.js';

const UX=[-8.4,-2.8,2.8,8.4];            // 四个单元沿 x 轴的位置
const TOP=1.12;                  // 台面高度
const BY=TOP+0.06;               // 传送带面高度
const NAMES=['物料仓储单元','物料传输单元','农作物配比单元','品质检测单元'];
const CSSC={run:'#2f7d32',stand:'#9a6b00',fault:'#c4453c',off:'#666'};
const STN={run:'运行',stand:'待机',fault:'故障',off:'离线'};
const SPEED={run:1,stand:.15,fault:0,off:0};

const M={};
const std=(c,o)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.55,metalness:.05},o||{}));
function mats(){
 M.alu=std(0xc9d0d8,{metalness:.7,roughness:.38});M.aluD=std(0x8e98a3,{metalness:.7,roughness:.45});
 M.white=std(0xf1f2ee);M.dark=std(0x262a30,{roughness:.6,metalness:.2});M.belt=std(0x2c3138,{roughness:.85});M.stripe=std(0x4d5663,{roughness:.8});
 M.glass=std(0xbfe0dc,{transparent:true,opacity:.34,roughness:.1,depthWrite:false});M.hood=std(0x9fd3cc,{transparent:true,opacity:.14,roughness:.1,depthWrite:false});
 M.red=std(0xd8372d,{roughness:.4});M.green=std(0x2f9e44,{roughness:.4});M.orange=std(0xf08c1f,{roughness:.4});M.yellow=std(0xf2c230,{roughness:.4});M.blue=std(0x3f78b8,{roughness:.45});
 M.screen=new THREE.MeshBasicMaterial({color:0x1b4452});M.screenOk=new THREE.MeshBasicMaterial({color:0x58c27d});
 M.wood=std(0xb98d5b,{roughness:.8});M.soil=std(0x4f3b2a,{roughness:.95});M.leaf=std(0x4f9a45,{roughness:.7});M.leaf2=std(0x6aa84f,{roughness:.7});
 M.tan=std(0xd9c29a);M.sage=std(0x9db58a);M.slate=std(0x7b8da0);
 M.hop1=std(0x6aa84f,{roughness:.5});M.hop2=std(0x8b5a2b,{roughness:.6});M.hop3=std(0x4a90c2,{roughness:.4});
 {const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');for(let i=0;i<256;i++){const v=110+Math.random()*70|0;x.fillStyle='rgb('+v+','+v+','+v+')';x.fillRect(0,i,256,1)}const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;M.alu.roughnessMap=t;M.aluD.roughnessMap=t;M.alu.roughness=.7;M.aluD.roughness=.75}
 M.acc=[std(0x4f9a45),std(0x3f78b8),std(0xc47a2c),std(0x2f8f8a)];M.cab0=std(0x9db58a);M.tank=std(0xd9dde0,{metalness:.6,roughness:.3});
 M.smoke=std(0x2c3a40,{transparent:true,opacity:.28,roughness:.1,depthWrite:false});M.crateW=std(0xeceae0,{roughness:.7});M.ball1=std(0x4f9a45,{roughness:.35});M.ball2=std(0xe6c35c,{roughness:.35});
 M.glow=new THREE.MeshBasicMaterial({color:0xd9a93b});M.white2=new THREE.MeshBasicMaterial({color:0xffffff});
}
const _bg={};
const B=(w,h,d,m,x,y,z,p)=>{const k=w+','+h+','+d;let ge=_bg[k];if(!ge){const r=Math.min(.02,Math.min(w,h,d)*.3);ge=r>.005?new RoundedBoxGeometry(w,h,d,2,r):new THREE.BoxGeometry(w,h,d);_bg[k]=ge}const o=new THREE.Mesh(ge,m);o.castShadow=true;o.receiveShadow=true;o.position.set(x,y,z);if(p)p.add(o);return o};
const Cy=(rt,rb,h,m,x,y,z,p,seg)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg||20),m);o.position.set(x,y,z);if(p)p.add(o);return o};

let renderer,scene,camera,controls,ok=false,host=null,wrap=null,labelsEl=null,inited=false,raf=0;
const clock=new THREE.Clock();let T=0;
const ST={units:[],mode:'all',sel:0,scale:1,goal:null,hover:-1};
const U=[];            // 每个单元的三维对象引用
const stripes=[];      // 传送带条纹 {m,len,base,unit}
const crates=[];
let ring,trail=[],tube,pathMarks=[];
const V3=THREE.Vector3;
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();

/* ---------- 单元：实训台底座（参照实物照片：铝型材机架 + 白色面板 + 玻璃柜门 + 警示线 + 电气件） ---------- */
function bench(i){
 const g=new THREE.Group();g.position.x=UX[i];g.userData.unit=i;
 const W=4.2,D=2.0,ac=M.acc[i];
 [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(s=>{const x=s[0]*(W/2-.08),z=s[1]*(D/2-.08);
  B(.14,TOP-.12,.14,M.alu,x,(TOP-.12)/2+.12,z,g);B(.02,TOP-.12,.15,M.dark,x,(TOP-.12)/2+.12,z,g);Cy(.07,.09,.12,M.dark,x,.06,z,g,14);
  if(s[1]>0)Cy(.1,.1,TOP-.1,M.aluD,x,(TOP-.1)/2+.1,z+.01,g,16)});
 B(W,.1,D,M.aluD,0,TOP-.05,0,g);B(W-.2,.04,D-.2,M.aluD,0,.18,0,g);
 B(W-.1,.05,.1,M.alu,0,.8,D/2-.06,g);B(W-.1,.03,.11,M.dark,0,.8,D/2-.06,g);
 // 上部白色面板 + 黑色压条
 B(W-.14,.34,.05,M.white,0,TOP-.3,D/2,g);B(W-.14,.02,.06,M.dark,0,TOP-.13,D/2,g);B(W-.14,.02,.06,M.dark,0,TOP-.47,D/2,g);B(W-.14,.04,.07,ac,0,TOP-.09,D/2,g);
 // 玻璃柜门（铝框 + 把手）
 [-1,1].forEach(s=>{const cx=s*W/4;B(W/2-.2,.58,.02,M.glass,cx,.48,D/2-.07,g);
  B(W/2-.2,.04,.04,M.alu,cx,.78,D/2-.06,g);B(W/2-.2,.04,.04,M.alu,cx,.2,D/2-.06,g);B(.04,.58,.04,M.alu,cx-(W/4-.1)*s*-1*-1,.48,D/2-.06,g);B(.04,.58,.04,M.alu,cx+(W/4-.1)*s*-1*-1,.48,D/2-.06,g);
  B(.035,.26,.05,M.alu,s*.07,.5,D/2-.03,g)});
 // 柜内：警示黄黑线、线槽、端子排、PLC
 for(let k=0;k<14;k++){const b=B(.16,.025,.16,k%2?M.yellow:M.dark,-W/2+.35+k*.29,.21,D/2-.28,g);b.rotation.y=.7}
 B(W-.7,.1,.26,M.dark,0,.62,-D/2+.22,g);for(let k=0;k<10;k++)B(.1,.07,.1,M.orange,-.6+k*.14,.5,-D/2+.3,g);
 B(.5,.5,.2,M.dark,W/2-.55,.45,-.2,g);B(.06,.06,.02,M.green,W/2-.45,.6,-.09,g);B(.06,.06,.02,M.green,W/2-.65,.6,-.09,g);
 // 右侧白色侧板与通风窗
 B(.04,.7,D-.3,M.white,W/2-.02,.5,0,g);B(.045,.22,.4,M.dark,W/2,.35,.3,g);
 // 控制区：急停 / 压力表 / 四联旋钮 / 四个按钮
 const ez=D/2+.04,ey=TOP-.3;
 const es=Cy(.07,.07,.05,M.red,-1.7,ey,ez,g);es.rotation.x=Math.PI/2;const ec=Cy(.1,.1,.025,M.yellow,-1.7,ey,ez-.015,g);ec.rotation.x=Math.PI/2;
 const gg=Cy(.1,.1,.04,M.white,-1.33,ey,ez,g);gg.rotation.x=Math.PI/2;const gr=Cy(.11,.11,.02,M.dark,-1.33,ey,ez-.01,g);gr.rotation.x=Math.PI/2;
 [-.85,-.55,-.25,.05].forEach(x=>{B(.17,.22,.04,M.dark,x,ey,ez,g);B(.06,.05,.02,M.yellow,x,ey-.04,ez+.03,g)});
 [[.8,M.red],[1.0,M.green],[1.2,M.red],[1.4,M.orange]].forEach(a=>{const b=Cy(.055,.055,.04,a[1],a[0],ey,ez+.01,g);b.rotation.x=Math.PI/2});
 // 台面：铝型材格栅 + 右前黑色挡板
 for(let k=0;k<5;k++){B(W-.1,.04,.05,M.alu,0,TOP+.03,-.45-k*.1,g);B(W-.1,.04,.05,M.alu,0,TOP+.03,.45+k*.1,g)}
 B(.5,.03,.5,M.dark,W/2-.45,TOP+.03,.68,g);
 // 触摸屏（白色壳体）
 const hm=new THREE.Group();hm.position.set(-1.5,TOP+.02,.72);g.add(hm);
 B(.5,.36,.3,M.white,0,.18,0,hm);const sc=B(.4,.26,.02,M.screen,0,.22,.16,hm);sc.rotation.x=-.25;B(.3,.04,.01,M.screenOk,-.02,.27,.172,hm).rotation.x=-.25;
 for(let k=0;k<5;k++)B(.05,.025,.01,M.dark,-.15+k*.075,.06,.17,hm);
 // 三色灯（左后）
 Cy(.03,.03,.7,M.alu,-2.0,TOP+.35,-.85,g);
 const lamps=[0xd8372d,0xf2c230,0x2f9e44].map((c,k)=>{const m=std(c,{roughness:.3,emissive:0x000000});Cy(.075,.075,.1,m,-2.0,TOP+.78-k*.11,-.85,g);return {m:m,c:c}});
 // 传送带
 B(W,.06,.6,M.belt,0,TOP+.03,0,g);[-1,1].forEach(s=>B(W,.1,.04,M.alu,0,TOP+.1,s*.34,g));
 const st=new THREE.Group();g.add(st);const n=Math.round(W/.35);for(let k=0;k<n;k++){const b=B(.06,.066,.54,M.stripe,0,TOP+.03,0,st);stripes.push({m:b,len:W,k:k,sp:W/n,unit:i,g:g})}
 const o={g:g,lamps:lamps,W:W,D:D};U[i]=o;scene.add(g);return o}

const rnd=(()=>{let s=7;return()=>{s=(s*16807)%2147483647;return s/2147483647}})();
function ball(r,m,x,y,z,p){const s=new THREE.Mesh(new THREE.SphereGeometry(r,14,10),m);s.position.set(x,y,z);s.castShadow=true;p.add(s);return s}

/* ---------- 物料仓储单元：三个原料盒工位 + 抓取龙门 + 两个黄帽升降缸 ---------- */
function storage(o){const g=o.g;
 const cols=[[0xe0b84f],[0x7a5230],[0x4a90c2]];
 B(3.3,.06,.9,M.aluD,0,TOP+.34,-.62,g);
 [[-1.55,-1],[1.55,-1],[-1.55,-.25],[1.55,-.25]].forEach(p=>B(.07,.3,.07,M.alu,p[0],TOP+.18,p[1],g));
 cols.forEach((c,k)=>{const bx=new THREE.Group();bx.position.set(-1.05+k*1.05,TOP+.37,-.62);g.add(bx);
  B(.92,.03,.7,M.crateW,0,.015,0,bx);B(.92,.4,.04,M.crateW,0,.2,.33,bx);B(.92,.4,.04,M.crateW,0,.2,-.33,bx);B(.04,.4,.7,M.crateW,.44,.2,0,bx);B(.04,.4,.7,M.crateW,-.44,.2,0,bx);
  B(.82,.32,.6,std(c[0],{roughness:.9}),0,.17,0,bx);B(.4,.12,.01,std(c[0]),0,.26,.355,bx);B(.44,.02,.03,M.dark,0,.32,.34,bx)});
 [[-1.7,-.98],[1.7,-.98],[-1.7,-.26],[1.7,-.26]].forEach(p=>B(.07,1.25,.07,M.alu,p[0],TOP+.62,p[1],g));
 B(3.5,.08,.08,M.alu,0,TOP+1.25,-.98,g);B(3.5,.08,.08,M.alu,0,TOP+1.25,-.26,g);
 const st=new THREE.Group();st.position.set(0,0,-.62);g.add(st);B(.08,.08,.78,M.alu,0,TOP+1.25,0,st);B(.24,.16,.22,M.dark,0,TOP+1.25,0,st);
 const fk=new THREE.Group();st.add(fk);Cy(.025,.025,.5,M.alu,0,.25,0,fk);B(.3,.05,.2,M.dark,0,0,0,fk);[-1,1].forEach(s=>B(.04,.16,.06,M.alu,s*.12,-.1,0,fk));
 [[1.9,-.8],[1.9,-.42]].forEach(p=>{B(.2,.5,.2,M.aluD,p[0],TOP+.28,p[1],g);Cy(.045,.045,.5,M.alu,p[0],TOP+.75,p[1],g);Cy(.08,.08,.08,M.yellow,p[0],TOP+1.02,p[1],g)});
 o.stacker=st;o.fork=fk}

/* ---------- 物料传输单元：以产线为主体——黄色护栏、辊筒段、分流挡板、支线、侧驱动 ---------- */
function transport(o){const g=o.g;
 [-1,1].forEach(s=>{B(3.7,.14,.04,M.yellow,0,TOP+.2,s*.4,g);[-1.7,-.6,.5,1.6].forEach(x=>B(.04,.14,.04,M.alu,x,TOP+.14,s*.4,g))});
 for(let k=0;k<9;k++){const r=Cy(.05,.05,.6,M.alu,-1.95+k*.13,TOP+.07,0,g,12);r.rotation.x=Math.PI/2}
 [-.9,.1,1.0].forEach(x=>{B(.05,.45,.05,M.alu,x,TOP+.25,.55,g);B(.14,.08,.1,M.dark,x,TOP+.5,.55,g);const l=new THREE.Mesh(new THREE.SphereGeometry(.03,10,10),new THREE.MeshBasicMaterial({color:0xff4b3e}));l.position.set(x,TOP+.5,.49);g.add(l)});
 B(.6,.4,.44,M.blue,1.75,TOP+.22,-.75,g);const m=Cy(.12,.12,.3,M.dark,1.75,TOP+.22,-.4,g);m.rotation.x=Math.PI/2;const pu=Cy(.16,.16,.06,M.aluD,1.75,TOP+.22,-.2,g);pu.rotation.x=Math.PI/2;
 B(2.6,.04,.2,M.aluD,0,TOP+.14,-.55,g);
 const dv=B(.9,.08,.05,M.orange,-.55,TOP+.18,-.15,g);dv.rotation.y=.55;
 B(.7,.06,1.0,M.belt,1.45,TOP+.03,.92,g);[-1,1].forEach(s=>B(.04,.1,1.0,M.yellow,1.45+s*.37,TOP+.12,.92,g));
 const pg=new THREE.Group();g.add(pg);Cy(.07,.07,.5,M.alu,0,0,0,pg).rotation.z=Math.PI/2;
 const rod=Cy(.025,.025,.7,M.aluD,0,0,0,pg);rod.rotation.x=Math.PI/2;B(.18,.2,.04,M.orange,0,0,-.4,pg);pg.position.set(.3,TOP+.28,.95);
 o.pusher=pg;o.rod=rod}

/* ---------- 农作物配比单元：大球 / 小球两个储料管 + 分选配比槽 + 旋转混合桨 ---------- */
function mixing(o){const g=o.g;
 B(3.3,.06,.9,M.aluD,0,TOP+.34,-.62,g);[[-1.55,-1],[1.55,-1],[-1.55,-.25],[1.55,-.25]].forEach(p=>B(.07,.3,.07,M.alu,p[0],TOP+.18,p[1],g));
 [[-1.6,-1],[1.6,-1],[-1.6,-.25],[1.6,-.25]].forEach(p=>B(.06,1.5,.06,M.alu,p[0],TOP+.75,p[1],g));
 B(3.3,.06,.9,M.aluD,0,TOP+1.5,-.62,g);
 // 配比槽（三格：大球 / 小球 / 混合）
 const tr=new THREE.Group();tr.position.set(0,TOP+.37,-.62);g.add(tr);
 B(3.0,.03,.7,M.alu,0,.015,0,tr);B(3.0,.18,.03,M.alu,0,.09,.34,tr);B(3.0,.18,.03,M.alu,0,.09,-.34,tr);[-1.5,-.5,.5,1.5].forEach(x=>B(.03,.18,.7,M.alu,x,.09,0,tr));
 // 两个储料管
 [[-1.0,.22,M.ball1,12,'big'],[0,.1,M.ball2,48,'small']].forEach(t=>{const x=t[0],r=t[1];
  Cy(.34,.34,.9,M.glass,x,TOP+1.0,-.62,g,24);Cy(.34,.08,.3,M.glass,x,TOP+.4+.45,-.62,g,24);Cy(.35,.35,.04,M.aluD,x,TOP+1.47,-.62,g,24);
  for(let k=0;k<t[3];k++){const a=rnd()*6.283,rr=Math.sqrt(rnd())*(.3-r);ball(r,t[2],x+Math.cos(a)*rr,TOP+.72+rnd()*.7,-.62+Math.sin(a)*rr,g)}
  B(.16,.1,.16,M.blue,x,TOP+.58,-.62,g)});
 // 槽内已配好的球
 for(let k=0;k<5;k++)ball(.15,M.ball1,-1.0+(rnd()-.5)*.6,TOP+.55,-.62+(rnd()-.5)*.4,g);
 for(let k=0;k<16;k++)ball(.07,M.ball2,0+(rnd()-.5)*.8,TOP+.5,-.62+(rnd()-.5)*.45,g);
 // 混合区旋转桨
 const pd=new THREE.Group();pd.position.set(1.0,TOP+.52,-.62);g.add(pd);B(.8,.03,.07,M.orange,0,0,0,pd);B(.07,.03,.6,M.orange,0,.06,0,pd);Cy(.03,.03,.3,M.alu,0,.15,0,pd);
 for(let k=0;k<4;k++)ball(.13,M.ball1,.75+(rnd()-.2)*.7,TOP+.53,-.62+(rnd()-.5)*.4,g);for(let k=0;k<10;k++)ball(.065,M.ball2,.75+rnd()*.75,TOP+.5,-.62+(rnd()-.5)*.45,g);
 const nz=Cy(.1,.04,.25,M.alu,1.62,TOP+.38,-.2,g);nz.rotation.x=.5;
 o.paddle=pd}

/* ---------- 品质检测单元：视觉单元——龙门架 + 黑色相机模组 + 环形光源 + 暗箱 + 剔除机构 ---------- */
function inspect(o){const g=o.g,ac=M.acc[3];
 [[-.95,-.8],[.95,-.8],[-.95,.8],[.95,.8]].forEach(p=>B(.1,1.55,.1,M.alu,p[0],TOP+.78,p[1],g));
 B(2.0,.1,.1,M.alu,0,TOP+1.55,-.8,g);B(2.0,.1,.1,M.alu,0,TOP+1.55,.8,g);B(.08,.08,1.7,M.aluD,0,TOP+1.45,0,g);
 const hood=B(1.9,.8,1.6,M.smoke,0,TOP+.46,0,g);const eg=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.9,.8,1.6)),new THREE.LineBasicMaterial({color:0x40504a}));eg.position.copy(hood.position);g.add(eg);
 [-1,1].forEach(s=>B(.06,.05,1.3,M.white2,s*.78,TOP+.75,0,g));
 B(2.2,.08,.12,ac,0,TOP+1.64,-.8,g);B(2.2,.08,.12,ac,0,TOP+1.64,.8,g);
 const cr=new THREE.Group();cr.position.set(0,TOP+1.38,0);g.add(cr);B(.5,.5,.34,M.dark,0,0,0,cr);B(.52,.04,.36,M.aluD,0,.27,0,cr);Cy(.07,.07,.3,M.alu,0,.42,0,cr,14);Cy(.03,.03,.5,M.dark,.18,.55,0,cr,8);
 Cy(.1,.1,.3,M.dark,0,-.38,0,cr,16);Cy(.075,.075,.04,M.white2,0,-.55,0,cr,16);
 const ringL=new THREE.Mesh(new THREE.TorusGeometry(.3,.035,8,24),M.white2);ringL.rotation.x=Math.PI/2;ringL.position.y=-.62;cr.add(ringL);
 const arm=new THREE.Group();arm.position.set(1.45,TOP+.18,.4);g.add(arm);Cy(.07,.07,.2,M.alu,0,0,0,arm);B(.9,.06,.08,M.orange,.45,0,0,arm);
 B(.62,.26,.46,M.red,1.75,TOP+.14,.95,g);
 // 平板显示屏（带支臂）
 Cy(.025,.025,.5,M.alu,-1.6,TOP+.25,.72,g);const mon=B(.7,.44,.03,M.dark,-1.6,TOP+.72,.72,g);mon.rotation.x=-.2;const ms=B(.62,.36,.01,M.screen,-1.6,TOP+.72,.74,g);ms.rotation.x=-.2;B(.22,.14,.01,M.screenOk,-1.75,TOP+.77,.75,g).rotation.x=-.2;
 o.cam=cr;o.arm=arm}

function linkBelt(cx,len,src){const g=new THREE.Group();g.position.x=cx;B(len,.06,.6,M.belt,0,BY-.03,0,g);[-1,1].forEach(s=>{B(len,.1,.04,M.alu,0,BY+.04,s*.34,g);B(.05,BY-.08,.05,M.alu,-len/2+.1,(BY-.08)/2,s*.3,g);B(.05,BY-.08,.05,M.alu,len/2-.1,(BY-.08)/2,s*.3,g)});
 const n=Math.max(2,Math.round(len/.35));for(let k=0;k<n;k++){const b=B(.06,.066,.54,M.stripe,0,BY-.03,0,g);stripes.push({m:b,len:len,k:k,sp:len/n,unit:src,g:g})}scene.add(g)}

function crate(){const g=new THREE.Group();B(.62,.18,.42,M.wood,0,.09,0,g);B(.56,.02,.36,M.soil,0,.19,0,g);
 for(let a=0;a<3;a++)for(let b=0;b<2;b++){const c=new THREE.Mesh(new THREE.SphereGeometry(.08,10,6),(a+b)%2?M.leaf:M.leaf2);c.scale.set(1.1,.6,1.1);c.position.set(-.18+a*.18,.24,-.09+b*.18);c.rotation.y=a+b*2;g.add(c)}return g}

/* ---------- 场景搭建 ---------- */
function build(){
 mats();scene=new THREE.Scene();scene.background=new THREE.Color(0xf3f1e6);scene.fog=new THREE.Fog(0xf3f1e6,34,80);
 const pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromScene(new RoomEnvironment(),.04).texture;
 scene.add(new THREE.HemisphereLight(0xf4f8ff,0xb9c4a6,.4));const fil=new THREE.DirectionalLight(0xbcd2ff,.45);fil.position.set(-12,8,6);scene.add(fil);
 const dl=new THREE.DirectionalLight(0xfff3df,2.1);dl.position.set(9,15,11);dl.castShadow=true;dl.shadow.mapSize.set(2048,2048);const sc=dl.shadow.camera;sc.left=-17;sc.right=17;sc.top=12;sc.bottom=-9;sc.near=1;sc.far=50;dl.shadow.bias=-.0004;dl.shadow.radius=5;scene.add(dl);
 // 环氧地坪：噪点 + 伸缩缝
 const fc=document.createElement('canvas');fc.width=fc.height=512;const fx=fc.getContext('2d');fx.fillStyle='#dcdfd4';fx.fillRect(0,0,512,512);
 for(let i=0;i<9000;i++){const v=200+Math.random()*40|0;fx.fillStyle='rgba('+(v-6)+','+v+','+(v-14)+',.35)';fx.fillRect(Math.random()*512,Math.random()*512,2,2)}
 fx.strokeStyle='rgba(120,128,112,.55)';fx.lineWidth=3;fx.strokeRect(0,0,512,512);
 const ft=new THREE.CanvasTexture(fc);ft.wrapS=ft.wrapT=THREE.RepeatWrapping;ft.repeat.set(60,35);ft.anisotropy=8;ft.colorSpace=THREE.SRGBColorSpace;
 const fl=new THREE.Mesh(new THREE.PlaneGeometry(120,70),std(0xffffff,{map:ft,roughness:.45,metalness:.05}));fl.rotation.x=-Math.PI/2;fl.receiveShadow=true;scene.add(fl);
 for(let i=0;i<4;i++){const sh=new THREE.Mesh(new THREE.PlaneGeometry(4.9,2.8),new THREE.MeshBasicMaterial({color:0x6d7a63,transparent:true,opacity:.12,depthWrite:false}));sh.rotation.x=-Math.PI/2;sh.position.set(UX[i],.01,0);scene.add(sh)}
 const bs=[bench(0),bench(1),bench(2),bench(3)];storage(bs[0]);transport(bs[1]);mixing(bs[2]);inspect(bs[3]);
 [-5.6,0,5.6].forEach((x,k)=>linkBelt(x,1.9,k));linkBelt(-11.45,1.9,0);linkBelt(11.45,1.9,3);
 for(let k=0;k<7;k++){const c=crate();c.userData.x=-12+k*3.4;c.position.set(c.userData.x,BY,0);c.traverse(m=>{if(m.isMesh)m.castShadow=true});scene.add(c);crates.push(c)}
 // 作物区（背景）：水培种植架 + 生菜 + 补光灯
 const beds=new THREE.Group();scene.add(beds);const trayM=std(0xf2f4f0,{roughness:.5}),waterM=std(0x2c4a52,{roughness:.2,metalness:.1}),ledM=new THREE.MeshBasicMaterial({color:0xffd9f2});
 const lett=new THREE.InstancedMesh(new THREE.SphereGeometry(.22,12,8),std(0xffffff,{roughness:.7}),2*3*38*2),dm=new THREE.Object3D(),col=new THREE.Color();let n=0;
 for(let r=0;r<2;r++){const z0=-6.2-r*2.6;
  B(26,.16,1.8,trayM,0,.78,z0,beds);B(25.6,.04,1.5,waterM,0,.87,z0,beds);for(let k=0;k<8;k++){B(.08,.78,.08,M.alu,-12.4+k*3.55,.39,z0-.8,beds);B(.08,.78,.08,M.alu,-12.4+k*3.55,.39,z0+.8,beds)}
  for(let k=0;k<8;k++){B(.08,1.35,.08,M.alu,-12.4+k*3.55,1.9,z0-.85,beds)}B(26,.06,.1,M.alu,0,2.55,z0-.85,beds);B(25.6,.05,.5,ledM,0,2.5,z0,beds);
  for(let l=0;l<3;l++)for(let k=0;k<38;k++){const px=-12.3+k*.68,pz=z0-.5+l*.5,sc=.75+((k*7+l*3+r)%5)*.08;
   for(let q=0;q<2;q++){dm.position.set(px,.97+q*.04,pz);dm.rotation.set(0,(k*1.7+l+q*.9),0);dm.scale.set(sc*(1-q*.35),.5*(1-q*.1),sc*(1-q*.35));dm.updateMatrix();lett.setMatrixAt(n,dm.matrix);col.setHSL(.29+((k*13+l*5+q)%7)*.012,.6,.17+q*.06+((k+l)%4)*.012);lett.setColorAt(n,col);n++}}}
 lett.castShadow=true;scene.add(lett);

 // 前场通道 + AGV 小车 + 码垛料盘
 const wk=new THREE.Mesh(new THREE.PlaneGeometry(40,2.0),std(0xd3dac4,{roughness:1}));wk.rotation.x=-Math.PI/2;wk.position.set(0,.014,4.6);wk.receiveShadow=true;scene.add(wk);
 [3.6,5.6].forEach(z=>{for(let k=-19;k<20;k++){const d=B(.8,.01,.07,M.yellow,k*1.0+.2,.02,z,scene)}});
 const agv=new THREE.Group();B(1.5,.32,.9,M.green,0,.34,0,agv);B(1.55,.06,.95,M.white,0,.52,0,agv);[[-.55,-.4],[.55,-.4],[-.55,.4],[.55,.4]].forEach(p=>{const w=Cy(.14,.14,.1,M.dark,p[0],.14,p[1],agv,14);w.rotation.x=Math.PI/2});
 const ac=crate();ac.position.set(0,.55,0);agv.add(ac);const lt=Cy(.05,.05,.3,M.alu,.6,.7,-.3,agv);const lb=new THREE.Mesh(new THREE.SphereGeometry(.07,10,10),M.glow);lb.position.set(.6,.9,-.3);agv.add(lb);
 agv.traverse(m=>{if(m.isMesh)m.castShadow=true});agv.position.set(-8,0,4.6);scene.add(agv);Scene3D._agv=agv;
 for(let k=0;k<3;k++){const st=new THREE.Group();for(let l=0;l<3;l++){const c=crate();c.position.y=l*.2;st.add(c)}st.position.set(-13+k*.0,0,3.0+k*0);st.position.set(11.5-k*1.4,0,2.9);st.traverse(m=>{if(m.isMesh)m.castShadow=true});scene.add(st)}
 // 运行轨迹
 const tc=new THREE.LineCurve3(new V3(-12.4,BY+.5,0),new V3(12.4,BY+.5,0));tube=new THREE.Mesh(new THREE.TubeGeometry(tc,2,.035,8,false),new THREE.MeshBasicMaterial({color:0x3d8b3d,transparent:true,opacity:.55}));scene.add(tube);
 for(let i=0;i<4;i++){const m=new THREE.Mesh(new THREE.TorusGeometry(.5,.03,8,32),M.glow);m.rotation.x=Math.PI/2;m.position.set(UX[i],BY+.5,0);scene.add(m);pathMarks.push(m)}
 for(let k=0;k<6;k++){const s=new THREE.Mesh(new THREE.SphereGeometry(.16-k*.018,12,10),M.glow);scene.add(s);trail.push(s)}
 ring=new THREE.Mesh(new THREE.RingGeometry(2.55,2.78,64),new THREE.MeshBasicMaterial({color:0x2f6b3a,transparent:true,opacity:.7,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.03;scene.add(ring);
 U.forEach(u=>u.g.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true}}));
 camera=new THREE.PerspectiveCamera(36,2,.1,200);const p=preset('all',0);camera.position.copy(p.pos);
 controls=new OrbitControls(camera,renderer.domElement);controls.target.copy(p.tgt);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=5;controls.maxDistance=42;controls.maxPolarAngle=1.48;controls.addEventListener('start',()=>{ST.goal=null});controls.update();
}
function dolly(v,t,k){return v.clone().sub(t).multiplyScalar(k).add(t)}
function preset(mode,sel){const asp=host&&host.clientHeight?host.clientWidth/host.clientHeight:2,k=Math.max(.62,Math.min(1,2.1/asp));if(mode==='focus'){const x=UX[sel];return {pos:new V3(x+3.9,3.7,6.4),tgt:new V3(x,1.5,0)}}if(mode==='trace'){const t=new V3(0,.2,1.0);return {pos:dolly(new V3(0,14.5,14.2),t,k),tgt:t}}const t=new V3(0,.3,1.4);return {pos:dolly(new V3(0,9.4,17.4),t,k),tgt:t}}

/* ---------- 标签与交互 ---------- */
function makeLabels(){labelsEl=document.createElement('div');labelsEl.className='lbls3d';
 NAMES.forEach((n,i)=>{const d=document.createElement('div');d.className='lbl3d';d.innerHTML='<b><i></i>'+n+'</b><small></small>';d.addEventListener('click',()=>pick(i));d.addEventListener('pointerenter',()=>ST.hover=i);d.addEventListener('pointerleave',()=>ST.hover=-1);labelsEl.appendChild(d)})}
function pick(i){if(Scene3D.onPick)Scene3D.onPick(i)}
function bindPointer(){const el=renderer.domElement;let dn=null;
 el.addEventListener('pointerdown',e=>{dn=[e.clientX,e.clientY]});
 el.addEventListener('pointerup',e=>{if(!dn)return;const mv=Math.hypot(e.clientX-dn[0],e.clientY-dn[1]);dn=null;if(mv<5){const i=hit(e);if(i>=0)pick(i)}});
 el.addEventListener('pointermove',e=>{if(e.buttons)return;const i=hit(e);ST.hover=i;el.style.cursor=i>=0?'pointer':'grab'})}
function hit(e){const r=renderer.domElement.getBoundingClientRect();ndc.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(ndc,camera);
 const h=ray.intersectObjects(U.map(u=>u.g),true);for(const x of h){let o=x.object;while(o&&o.userData.unit===undefined)o=o.parent;if(o)return o.userData.unit}return -1}
function resize(){if(!ok||!host)return;const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setPixelRatio(Math.max(1,Math.min(2,(window.devicePixelRatio||1)*ST.scale)));renderer.setSize(w,h,false);camera.aspect=w/h;if(!ST._asp||Math.abs(ST._asp-w/h)/(w/h)>.05){ST._asp=w/h;if(ST.mode!=='focus'&&ST.mode)ST.goal=preset(ST.mode,ST.sel)}camera.updateProjectionMatrix()}
let ro=null;

/* ---------- 动画 ---------- */
const tmp=new V3();
function frame(){raf=requestAnimationFrame(frame);if(!ok||!host)return;const dt=Math.min(.05,clock.getDelta());T+=dt;
 const sp=i=>{const u=ST.units[i];return u?SPEED[u.st]:1};
 // 传送带条纹
 stripes.forEach(s=>{const v=SPEED[(ST.units[s.unit]||{st:'run'}).st];s.off=((s.off||0)+dt*.9*v)%s.sp;let x=((s.k*s.sp+s.off)%s.len)-s.len/2+s.sp/2;s.m.position.x=x});
 // 各单元动作
 const a0=U[0],a1=U[1],a2=U[2],a3=U[3];
 a0.ph=(a0.ph||0)+dt*.6*sp(0);a0.stacker.position.x=Math.sin(a0.ph)*1.05;a0.fork.position.y=TOP+.98+Math.sin((a0.ph2=(a0.ph2||0)+dt*.9*sp(0)))*.15;
 a1.pph=(a1.pph||0)+dt*1.6*sp(1);a1.pusher.position.z=.95-Math.max(0,Math.sin(a1.pph))*.45;
 a2.paddle.rotation.y+=dt*3.2*sp(2);
 a3.cph=(a3.cph||0)+dt*.8*sp(3);a3.cam.position.z=Math.sin(a3.cph)*.7;a3.rph=(a3.rph||0)+dt*sp(3);const rp=(a3.rph%6)/6;a3.arm.rotation.y=rp>.7&&rp<.9?-Math.sin((rp-.7)/.2*Math.PI)*.9:0;
 // 三色灯
 U.forEach((u,i)=>{const s=(ST.units[i]||{st:'run'}).st;u.lamps.forEach((l,k)=>{const on=(k===0&&s==='fault'&&Math.sin(T*7)>-.2)||(k===1&&s==='stand')||(k===2&&s==='run');l.m.emissive.setHex(on?l.c:0x000000);l.m.emissiveIntensity=on?1.4:0})});
 // 料盘流动：故障单元前停止、待机单元内减速、保持间距
 crates.sort((a,b)=>b.userData.x-a.userData.x);
 crates.forEach((c,k)=>{let v=.9,x=c.userData.x;
  for(let i=0;i<4;i++){const s=(ST.units[i]||{st:'run'}).st,dx=x-UX[i];if(s==='fault'&&dx>-3.1&&dx<-2.3)v=0;else if(s==='stand'&&Math.abs(dx)<2.3)v=Math.min(v,.14);else if(s==='off'&&dx>-3.1&&dx<-2.3)v=0}
  const ahead=crates[k-1];if(ahead&&ahead.userData.x-x<1.3)v=Math.min(v,Math.max(0,(ahead.userData.x-x-.8)*.9));
  x+=v*dt;if(x>12.4){x=-12.4;}c.userData.x=x;c.position.x=x});
 // 轨迹光点
 const mode=ST.mode;tube.scale.set(1,mode==='trace'?3:1,mode==='trace'?3:1);tube.material.opacity=mode==='trace'?.9:.5;
 pathMarks.forEach(m=>{m.visible=mode==='trace'||mode==='all';m.scale.setScalar(mode==='trace'?1.25:1)});
 trail.forEach((s,k)=>{const x=((T*2.4-k*.45)%24.8+24.8)%24.8-12.4;s.position.set(x,BY+.5,0);s.visible=true;s.scale.setScalar(mode==='trace'?1.4:1)});
 // AGV 往返
 if(Scene3D._agv){const a=Scene3D._agv;a.ph=(a.ph||0)+dt*.5;const x=Math.sin(a.ph)*10.5;a.position.x=x;a.rotation.y=Math.cos(a.ph)>0?0:Math.PI}
 // 选中圈
 const rx=UX[ST.sel];ring.position.x+=(rx-ring.position.x)*Math.min(1,dt*8);ring.material.opacity=.45+.3*Math.sin(T*3);ring.visible=mode==='focus'||ST.hover>=0||mode==='trace';
 if(ST.hover>=0&&mode!=='focus')ring.position.x=UX[ST.hover];
 // 相机过渡
 if(ST.goal){const k=1-Math.pow(.0015,dt);camera.position.lerp(ST.goal.pos,k);controls.target.lerp(ST.goal.tgt,k);if(camera.position.distanceTo(ST.goal.pos)<.05&&controls.target.distanceTo(ST.goal.tgt)<.05)ST.goal=null}
 controls.update();renderer.render(scene,camera);
 // 标签
 const w=host.clientWidth,h=host.clientHeight;
 [...labelsEl.children].forEach((d,i)=>{tmp.set(UX[i],3.55,0).project(camera);const vis=tmp.z<1;d.style.display=vis?'':'none';d.style.transform='translate('+((tmp.x*.5+.5)*w)+'px,'+((-tmp.y*.5+.5)*h)+'px) translate(-50%,-100%)';d.classList.toggle('on',i===ST.sel&&mode==='focus'||i===ST.hover)})}

/* ---------- 对外接口 ---------- */
export const Scene3D={
 ok:false,onPick:null,
 init(){if(inited)return;inited=true;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.setClearColor(0xf3f1e6);
   build();makeLabels();bindPointer();ok=true;Scene3D.ok=true;ro=new ResizeObserver(resize);frame()}catch(e){console.warn('WebGL 不可用',e);ok=false;Scene3D.ok=false}},
 mount(el){Scene3D.init();host=el;if(!el)return;if(!ok){el.innerHTML='<div class="nogl">当前浏览器或显卡不支持 WebGL，无法显示 3D 场景。<br>请换用最新版 Chrome / Edge。</div>';return}
  el.appendChild(renderer.domElement);el.appendChild(labelsEl);renderer.domElement.style.cssText='display:block;width:100%;height:100%;touch-action:none;cursor:grab';ro.disconnect();ro.observe(el);resize();Scene3D.setUnits(ST.units)},
 unmount(){host=null;if(ro)ro.disconnect()},
 setScale(k){ST.scale=k;resize()},
 setUnits(us){ST.units=us||[];if(!labelsEl)return;[...labelsEl.children].forEach((d,i)=>{const u=ST.units[i];if(!u)return;d.querySelector('i').style.background=CSSC[u.st];d.classList.toggle('fault',u.st==='fault');d.querySelector('small').textContent=STN[u.st]+' · '+u.temp.toFixed(1)+'℃ · '+u.pw.toFixed(1)+'kW'})},
 setMode(m,sel){const same=ST.mode===m&&ST.sel===sel;ST.mode=m;ST.sel=sel;if(!ok||same&&ST.goal===null&&m!=='focus')return;ST.goal=preset(m,sel)}
};
