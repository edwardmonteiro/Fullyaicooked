export const W=360,H=450;
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const wrap=(n,max)=>(n%max+max)%max;
export const delta=(a,b,size)=>wrap(a-b+size/2,size)-size/2;
export const distance=(a,b)=>Math.hypot(delta(a.x,b.x,W),delta(a.y,b.y,H));
export class Random { constructor(seed=2600){this.seed=seed>>>0;} next(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;} }
export function segmentBox(x,y,dx,dy,left,top,right,bottom){
 let enter=0,exit=1,nx=0,ny=0;
 for(const [p,d,min,max,axis] of [[x,dx,left,right,0],[y,dy,top,bottom,1]]){
  if(Math.abs(d)<1e-9){if(p<min||p>max)return null;continue;}
  let a=(min-p)/d,b=(max-p)/d,normal=-Math.sign(d);if(a>b)[a,b]=[b,a];
  if(a>enter){enter=a;nx=axis?0:normal;ny=axis?normal:0;}exit=Math.min(exit,b);
  if(enter>exit)return null;
 }
 return enter>=0&&enter<=1?{t:enter,nx,ny}:null;
}
export function segmentCircle(x,y,dx,dy,cx,cy,r){
 const ox=x-cx,oy=y-cy,a=dx*dx+dy*dy,c=ox*ox+oy*oy-r*r;if(c<=0)return 0;if(a<1e-12)return null;
 const b=2*(ox*dx+oy*dy),disc=b*b-4*a*c;if(disc<0)return null;const t=(-b-Math.sqrt(disc))/(2*a);return t>=0&&t<=1?t:null;
}
// Shared polygon outlines keep asteroid rendering and contact geometry in agreement.
export function rockVertices(r,cx=r.x,cy=r.y){return r.shape.map((n,i)=>{const a=r.angle+i*Math.PI*2/r.shape.length;return {x:cx+Math.cos(a)*r.r*n,y:cy+Math.sin(a)*r.r*n};});}
export function insidePolygon(x,y,vertices){let inside=false;for(let i=0,j=vertices.length-1;i<vertices.length;j=i++){const a=vertices[i],b=vertices[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;}
export function segmentPolygon(x,y,dx,dy,vertices){if(insidePolygon(x,y,vertices))return 0;let closest=null;for(let i=0;i<vertices.length;i++){const a=vertices[i],b=vertices[(i+1)%vertices.length],ex=b.x-a.x,ey=b.y-a.y,det=dx*ey-dy*ex;if(Math.abs(det)<1e-9)continue;const ox=a.x-x,oy=a.y-y,t=(ox*ey-oy*ex)/det,u=(ox*dy-oy*dx)/det;if(t>=0&&t<=1&&u>=0&&u<=1&&(closest===null||t<closest))closest=t;}return closest;}
export function circlePolygon(x,y,r,vertices){if(insidePolygon(x,y,vertices))return true;for(let i=0;i<vertices.length;i++){const a=vertices[i],b=vertices[(i+1)%vertices.length],dx=b.x-a.x,dy=b.y-a.y,t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy),0,1);if(Math.hypot(x-a.x-dx*t,y-a.y-dy*t)<r)return true;}return false;}
