/* 农业产线 3D 场景：4 个单元 + 传送线 + 作物区，全部由基础几何体程序化建模。
   对外接口：Scene3D.mount / unmount / setUnits / setMode / setScale / onPick */
import * as THREE from 'three';
import {OrbitControls} from '../vendor/OrbitControls.js';
import {RoomEnvironment} from '../vendor/RoomEnvironment.js';

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
 M.glass=std(0xbfe0dc,{transparent:true,opacity:.22,roughness:.1,depthWrite:false});M.hood=std(0x9fd3cc,{transparent:true,opacity:.14,roughness:.1,depthWrite:false});
 M.red=std(0xd8372d,{roughness:.4});M.green=std(0x2f9e44,{roughness:.4});M.orange=std(0xf08c1f,{roughness:.4});M.yellow=std(0xf2c230,{roughness:.4});M.blue=std(0x3f78b8,{roughness:.45});
 M.screen=new THREE.MeshBasicMaterial({color:0x1b4452});M.screenOk=new THREE.MeshBasicMaterial({color:0x58c27d});
 M.wood=std(0xb98d5b,{roughness:.8});M.soil=std(0x4f3b2a,{roughness:.95});M.leaf=std(0x4f9a45,{roughness:.7});M.leaf2=std(0x6aa84f,{roughness:.7});
 M.tan=std(0xd9c29a);M.sage=std(0x9db58a);M.slate=std(0x7b8da0);
 M.hop1=std(0x6aa84f,{roughness:.5});M.hop2=std(0x8b5a2b,{roughness:.6});M.hop3=std(0x4a90c2,{roughness:.4});
 M.glow=new THREE.MeshBasicMaterial({color:0xd9a93b});M.white2=new THREE.MeshBasicMaterial({color:0xffffff});
}
const B=(w,h,d,m,x,y,z,p)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);if(p)p.add(o);return o};
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

/* ---------- 单元：通用台架（铝型材机架 + 下柜 + 控制面板 + 触摸屏 + 三色灯） ---------- */
function bench(i){
 const g=new THREE.Group();g.position.x=UX[i];g.userData.unit=i;
 const W=4.2,D=2.0;
 [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(s=>{B(.12,TOP-.12,.12,M.alu,s[0]*(W/2-.08),(TOP-.12)/2+.12,s[1]*(D/2-.08),g);Cy(.07,.07,.06,M.dark,s[0]*(W/2-.08),.03,s[1]*(D/2-.08),g)});
 B(W,.1,D,M.aluD,0,TOP-.05,0,g);B(W-.2,.04,D-.2,M.aluD,0,.18,0,g);
 B(W-.2,.62,.03,M.dark,0,.5,-D/2+.1,g);
 for(let k=0;k<5;k++)B(.34,.22,.05,k%2?M.green:M.dark,-1.5+k*.7,.55,-D/2+.14,g);
  [-1,1].forEach(s=>{B(W/2-.15,.52,.02,M.glass,s*W/4,.48,D/2-.08,g);B(W/2-.12,.03,.04,M.alu,s*W/4,.75,D/2-.08,g);B(.04,.52,.04,M.alu,s*(W/4-.9),.48,D/2-.08,g)});
 B(.05,.2,.05,M.alu,0,.48,D/2-.04,g);
 B(W-.2,.3,.06,M.white,0,TOP-.27,D/2+.0,g);
 const es=Cy(.07,.07,.05,M.red,-1.65,TOP-.27,D/2+.045,g);es.rotation.x=Math.PI/2;
 const gg=Cy(.08,.08,.04,M.white,-1.3,TOP-.27,D/2+.04,g);gg.rotation.x=Math.PI/2;
 [-.85,-.55,-.25,.05].forEach(x=>{B(.15,.2,.04,M.dark,x,TOP-.27,D/2+.04,g);B(.05,.05,.02,M.yellow,x,TOP-.24,D/2+.07,g)});
 [[.8,M.red],[1.0,M.green],[1.2,M.red],[1.4,M.orange]].forEach(a=>{const b=Cy(.055,.055,.04,a[1],a[0],TOP-.27,D/2+.05,g);b.rotation.x=Math.PI/2});
 // 触摸屏
 const hm=new THREE.Group();hm.position.set(-1.5,TOP+.02,.72);g.add(hm);
 B(.5,.36,.3,M.white,0,.18,0,hm);const sc=B(.4,.26,.02,M.screen,0,.22,.16,hm);sc.rotation.x=-.25;B(.3,.04,.01,M.screenOk,-.02,.27,.172,hm).rotation.x=-.25;
 // 三色灯
 Cy(.03,.03,.7,M.alu,1.85,TOP+.35,-.8,g);
 const lamps=[0xd8372d,0xf2c230,0x2f9e44].map((c,k)=>{const m=std(c,{roughness:.3,emissive:0x000000});const l=Cy(.075,.075,.1,m,1.85,TOP+.78-k*.11,-.8,g);return {m:m,c:c}});
 // 传送带
 B(W,.06,.6,M.belt,0,TOP+.03,0,g);[-1,1].forEach(s=>B(W,.1,.04,M.alu,0,TOP+.1,s*.34,g));
 const st=new THREE.Group();g.add(st);const n=Math.round(W/.35);for(let k=0;k<n;k++){const b=B(.06,.066,.54,M.stripe,0,TOP+.03,0,st);stripes.push({m:b,len:W,k:k,sp:W/n,unit:i,g:g})}
 const o={g:g,lamps:lamps,W:W,D:D};U[i]=o;scene.add(g);return o}

/* ---------- 各单元上部结构 ---------- */
function storage(o){const g=o.g;
 const cols=[M.tan,M.sage,M.slate,M.tan,M.sage];
 [[-1.5,-.95],[1.5,-.95],[-1.5,-.45],[1.5,-.45]].forEach(p=>B(.06,1.6,.06,M.alu,p[0],TOP+.8,p[1],g));
 for(let l=0;l<3;l++){const y=TOP+.12+l*.5;B(3.06,.04,.56,M.aluD,0,y,-.7,g);for(let k=0;k<5;k++)B(.5,.3,.42,cols[(k+l)%5],-1.2+k*.6,y+.19,-.7,g)}
 B(3.06,.04,.56,M.aluD,0,TOP+1.62,-.7,g);
 B(3.3,.05,.06,M.alu,0,TOP+.06,.58,g);B(3.3,.05,.06,M.alu,0,TOP+1.55,.58,g);
 const st=new THREE.Group();st.position.set(0,0,.58);g.add(st);B(.1,1.5,.1,M.orange,0,TOP+.8,0,st);B(.3,.18,.18,M.dark,0,TOP+1.5,0,st);
 const fk=new THREE.Group();st.add(fk);B(.45,.04,.3,M.alu,0,0,-.14,fk);B(.5,.06,.06,M.dark,0,.04,0,fk);
 o.stacker=st;o.fork=fk}
function transport(o){const g=o.g;
 [-1,1].forEach(s=>{B(.05,.45,.05,M.alu,s*.9,TOP+.25,.52,g);B(.14,.08,.1,M.dark,s*.9,TOP+.5,.52,g);const l=new THREE.Mesh(new THREE.SphereGeometry(.03,10,10),new THREE.MeshBasicMaterial({color:0xff4b3e}));l.position.set(s*.9,TOP+.5,.46);g.add(l)});
 for(let k=0;k<6;k++){const r=Cy(.05,.05,.6,M.alu,-1.7+k*.12,TOP+.07,0,g,12);r.rotation.x=Math.PI/2}
 B(.6,.4,.44,M.blue,1.7,TOP+.22,-.75,g);const m=Cy(.12,.12,.3,M.dark,1.7,TOP+.22,-.4,g);m.rotation.x=Math.PI/2;
 B(2.4,.04,.2,M.aluD,.3,TOP+.14,-.5,g);
 const pg=new THREE.Group();g.add(pg);Cy(.07,.07,.5,M.alu,0,0,0,pg).rotation.z=Math.PI/2;
 const rod=Cy(.025,.025,.7,M.aluD,0,0,0,pg);rod.rotation.x=Math.PI/2;B(.18,.2,.04,M.orange,0,0,-.4,pg);pg.position.set(.3,TOP+.28,.95);
 o.pusher=pg;o.rod=rod}
function mixing(o){const g=o.g;
 B(3.0,.05,.95,M.aluD,-.2,TOP+.5,-.62,g);[[-1.6,-1],[1.2,-1],[-1.6,-.25],[1.2,-.25]].forEach(p=>B(.06,.45,.06,M.alu,p[0],TOP+.27,p[1]-.0,g));
 [[-1.2,M.hop1],[-.45,M.hop2],[.3,M.hop3]].forEach(h=>{Cy(.34,.34,.6,h[1],h[0],TOP+1.15,-.62,g,24);Cy(.34,.07,.32,h[1],h[0],TOP+.7,-.62,g,24);B(.06,.4,.06,M.alu,h[0]-.3,TOP+.9,-.62,g);B(.06,.4,.06,M.alu,h[0]+.3,TOP+.9,-.62,g);B(.12,.08,.12,M.blue,h[0],TOP+.56,-.62,g);Cy(.03,.03,.3,M.alu,h[0],TOP+.4,-.62,g)});
 const scr=Cy(.07,.07,2.0,M.aluD,-.45,TOP+.32,-.4,g);scr.rotation.z=Math.PI/2;
 const bowl=Cy(.5,.42,.5,M.alu,1.15,TOP+.77,-.5,g,28);Cy(.5,.5,.03,M.dark,1.15,TOP+1.03,-.5,g,28);
 B(.34,.26,.34,M.dark,1.15,TOP+1.3,-.5,g);const sh=Cy(.025,.025,.5,M.alu,1.15,TOP+1.0,-.5,g);
 const pd=new THREE.Group();pd.position.set(1.15,TOP+.78,-.5);g.add(pd);B(.62,.04,.07,M.orange,0,0,0,pd);B(.07,.04,.62,M.orange,0,.12,0,pd);
 Cy(.05,.05,.5,M.alu,1.15,TOP+.3,-.28,g);const nz=Cy(.13,.04,.24,M.alu,1.15,TOP+.62,.0,g);B(.07,.07,.5,M.alu,1.15,TOP+.68,-.25,g);
 o.paddle=pd}
function inspect(o){const g=o.g;
 [[-.95,-.8],[.95,-.8],[-.95,.8],[.95,.8]].forEach(p=>B(.1,1.55,.1,M.alu,p[0],TOP+.78,p[1],g));
 B(2.0,.1,.1,M.alu,0,TOP+1.55,-.8,g);B(2.0,.1,.1,M.alu,0,TOP+1.55,.8,g);
 B(.08,.08,1.7,M.aluD,0,TOP+1.45,0,g);
 const hood=B(1.9,.8,1.6,M.hood,0,TOP+.46,0,g);const eg=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.9,.8,1.6)),new THREE.LineBasicMaterial({color:0x7f9467}));eg.position.copy(hood.position);g.add(eg);
 const cr=new THREE.Group();cr.position.set(0,TOP+1.45,0);g.add(cr);B(.36,.22,.3,M.dark,0,0,0,cr);Cy(.1,.1,.34,M.dark,0,-.26,0,cr,16);Cy(.075,.075,.04,M.white2,0,-.45,0,cr,16);
 const ringL=new THREE.Mesh(new THREE.TorusGeometry(.3,.03,8,24),M.white2);ringL.rotation.x=Math.PI/2;ringL.position.y=-.55;cr.add(ringL);
 const arm=new THREE.Group();arm.position.set(1.45,TOP+.18,.4);g.add(arm);Cy(.07,.07,.2,M.alu,0,0,0,arm);const ab=B(.9,.06,.08,M.orange,.45,0,0,arm);
 B(.62,.26,.46,M.red,1.75,TOP+.14,.95,g);
 Cy(.025,.025,.7,M.alu,-1.6,TOP+.35,.72,g);const mon=B(.62,.4,.04,M.dark,-1.6,TOP+.88,.72,g);mon.rotation.x=-.15;const ms=B(.54,.32,.01,M.screen,-1.6,TOP+.88,.745,g);ms.rotation.x=-.15;B(.2,.16,.01,M.screenOk,-1.72,TOP+.92,.752,g).rotation.x=-.15;
 o.cam=cr;o.arm=arm}

function linkBelt(cx,len,src){const g=new THREE.Group();g.position.x=cx;B(len,.06,.6,M.belt,0,BY-.03,0,g);[-1,1].forEach(s=>{B(len,.1,.04,M.alu,0,BY+.04,s*.34,g);B(.05,BY-.08,.05,M.alu,-len/2+.1,(BY-.08)/2,s*.3,g);B(.05,BY-.08,.05,M.alu,len/2-.1,(BY-.08)/2,s*.3,g)});
 const n=Math.max(2,Math.round(len/.35));for(let k=0;k<n;k++){const b=B(.06,.066,.54,M.stripe,0,BY-.03,0,g);stripes.push({m:b,len:len,k:k,sp:len/n,unit:src,g:g})}scene.add(g)}

function crate(){const g=new THREE.Group();B(.62,.18,.42,M.wood,0,.09,0,g);B(.56,.02,.36,M.soil,0,.19,0,g);
 for(let a=0;a<3;a++)for(let b=0;b<2;b++){const c=new THREE.Mesh(new THREE.ConeGeometry(.06,.18,7),(a+b)%2?M.leaf:M.leaf2);c.position.set(-.18+a*.18,.29,-.09+b*.18);g.add(c)}return g}

/* ---------- 场景搭建 ---------- */
function build(){
 mats();scene=new THREE.Scene();scene.background=new THREE.Color(0xf3f1e6);scene.fog=new THREE.Fog(0xf3f1e6,34,80);
 const pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromScene(new RoomEnvironment(),.04).texture;
 scene.add(new THREE.HemisphereLight(0xffffff,0xb9c9a0,.55));
 const dl=new THREE.DirectionalLight(0xffffff,1.5);dl.position.set(9,15,11);dl.castShadow=true;dl.shadow.mapSize.set(2048,2048);const sc=dl.shadow.camera;sc.left=-17;sc.right=17;sc.top=12;sc.bottom=-9;sc.near=1;sc.far=50;dl.shadow.bias=-.0004;dl.shadow.radius=3;scene.add(dl);
 const fl=new THREE.Mesh(new THREE.PlaneGeometry(120,70),std(0xe8eedb,{roughness:.95}));fl.rotation.x=-Math.PI/2;fl.receiveShadow=true;scene.add(fl);
 const gr=new THREE.GridHelper(60,60,0xc9d6b6,0xdbe5cc);gr.position.y=.004;scene.add(gr);
 for(let i=0;i<4;i++){const p=new THREE.Mesh(new THREE.PlaneGeometry(5.0,3.0),std(0xdfe9cd,{roughness:1}));p.rotation.x=-Math.PI/2;p.position.set(UX[i],.012,0);p.receiveShadow=true;scene.add(p);
  const e=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(5.0,3.0)),new THREE.LineBasicMaterial({color:0x9db58a}));e.rotation.x=-Math.PI/2;e.position.set(UX[i],.016,0);scene.add(e)}
 const bs=[bench(0),bench(1),bench(2),bench(3)];storage(bs[0]);transport(bs[1]);mixing(bs[2]);inspect(bs[3]);
 [-5.6,0,5.6].forEach((x,k)=>linkBelt(x,1.4,k));linkBelt(-11.45,1.9,0);linkBelt(11.45,1.9,3);
 for(let k=0;k<7;k++){const c=crate();c.userData.x=-12+k*3.4;c.position.set(c.userData.x,BY,0);c.traverse(m=>{if(m.isMesh)m.castShadow=true});scene.add(c);crates.push(c)}
 // 作物区（背景）
 const beds=new THREE.Group();scene.add(beds);for(let r=0;r<2;r++){const bd=B(26,.28,1.7,M.soil,0,.14,-6.2-r*2.6,beds);bd.receiveShadow=true;B(26.2,.08,1.8,M.wood,0,.3,-6.2-r*2.6,beds)}
 const pl=new THREE.InstancedMesh(new THREE.SphereGeometry(.2,10,8),M.leaf2,2*3*38),dm=new THREE.Object3D();let n=0;
 for(let r=0;r<2;r++)for(let l=0;l<3;l++)for(let k=0;k<38;k++){dm.position.set(-12.3+k*.68,.5+((k+l)%3)*.03,-6.2-r*2.6-.6+l*.6);dm.scale.setScalar(.7+((k*7+l*3+r)%5)*.07);dm.updateMatrix();pl.setMatrixAt(n++,dm.matrix)}
 pl.castShadow=true;scene.add(pl);

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
function preset(mode,sel){if(mode==='focus'){const x=UX[sel];return {pos:new V3(x+3.9,3.7,6.4),tgt:new V3(x,1.5,0)}}if(mode==='trace')return {pos:new V3(0,14.5,14.2),tgt:new V3(0,.2,1.0)};return {pos:new V3(0,9.4,17.4),tgt:new V3(0,.3,1.4)}}

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
function resize(){if(!ok||!host)return;const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setPixelRatio(Math.max(1,Math.min(2,(window.devicePixelRatio||1)*ST.scale)));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
let ro=null;

/* ---------- 动画 ---------- */
const tmp=new V3();
function frame(){raf=requestAnimationFrame(frame);if(!ok||!host)return;const dt=Math.min(.05,clock.getDelta());T+=dt;
 const sp=i=>{const u=ST.units[i];return u?SPEED[u.st]:1};
 // 传送带条纹
 stripes.forEach(s=>{const v=SPEED[(ST.units[s.unit]||{st:'run'}).st];s.off=((s.off||0)+dt*.9*v)%s.sp;let x=((s.k*s.sp+s.off)%s.len)-s.len/2+s.sp/2;s.m.position.x=x});
 // 各单元动作
 const a0=U[0],a1=U[1],a2=U[2],a3=U[3];
 a0.ph=(a0.ph||0)+dt*.6*sp(0);a0.stacker.position.x=Math.sin(a0.ph)*1.2;a0.fork.position.y=TOP+.7+Math.sin((a0.ph2=(a0.ph2||0)+dt*.9*sp(0)))*.45;
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
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;renderer.setClearColor(0xf3f1e6);
   build();makeLabels();bindPointer();ok=true;Scene3D.ok=true;ro=new ResizeObserver(resize);frame()}catch(e){console.warn('WebGL 不可用',e);ok=false;Scene3D.ok=false}},
 mount(el){Scene3D.init();host=el;if(!el)return;if(!ok){el.innerHTML='<div class="nogl">当前浏览器或显卡不支持 WebGL，无法显示 3D 场景。<br>请换用最新版 Chrome / Edge。</div>';return}
  el.appendChild(renderer.domElement);el.appendChild(labelsEl);renderer.domElement.style.cssText='display:block;width:100%;height:100%;touch-action:none;cursor:grab';ro.disconnect();ro.observe(el);resize();Scene3D.setUnits(ST.units)},
 unmount(){host=null;if(ro)ro.disconnect()},
 setScale(k){ST.scale=k;resize()},
 setUnits(us){ST.units=us||[];if(!labelsEl)return;[...labelsEl.children].forEach((d,i)=>{const u=ST.units[i];if(!u)return;d.querySelector('i').style.background=CSSC[u.st];d.classList.toggle('fault',u.st==='fault');d.querySelector('small').textContent=STN[u.st]+' · '+u.temp.toFixed(1)+'℃ · '+u.pw.toFixed(1)+'kW'})},
 setMode(m,sel){const same=ST.mode===m&&ST.sel===sel;ST.mode=m;ST.sel=sel;if(!ok||same&&ST.goal===null&&m!=='focus')return;ST.goal=preset(m,sel)}
};
