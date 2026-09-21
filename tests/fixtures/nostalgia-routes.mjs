import {escalatorX,obstacleBox,floorY} from '../../games/shared/nostalgia/keystone.js';

// A controller using only visible actor/map positions and ordinary buttons.
export function keystoneRoute(m) {
  const p=m.player,t=m.thief,lift=m.elevator;
  if(p.ride)return {};
  const goalFloor=t.ride?t.ride.to:t.floor;
  if(p.inLift)return {down:lift.open&&lift.floor===Math.min(2,goalFloor)};
  let goal=t.x,c={};
  if(p.floor!==goalFloor){
    const stairs=escalatorX(p.floor);
    if(goalFloor===3&&p.floor===2)goal=stairs;
    else if(p.floor<3&&Math.abs(m.liftX-p.x)<Math.abs(stairs-p.x)+170){goal=m.liftX;if(Math.abs(p.x-goal)<10)c.up=true;}
    else goal=stairs;
  }
  const dir=Math.sign(goal-p.x);c.left=goal<p.x-3;c.right=goal>p.x+3;
  for(const o of m.obstacles){
    if(o.floor!==p.floor||p.immune)continue;
    const dx=o.x-p.x,b=obstacleBox(o,m.clock),relative=o.dir*o.speed-dir*108;
    const approaching=dx*relative<0;
    if(!approaching&&Math.abs(dx)>22)continue;
    if(o.type==='plane'&&Math.abs(dx)<52){c.down=true;c.left=false;c.right=false;}
    else if(o.type==='ball'&&Math.abs(dx)<35&&b.y<floorY(p.floor)-22){c.down=true;c.left=false;c.right=false;}
    else if(Math.abs(dx)<(o.type==='radio'?29:38)&&p.z===0)c.action=true;
  }
  // A running jump lasts about 0.57 s. Wait for an approaching plane before
  // starting one, instead of asking the player to crouch in mid-air.
  if(p.z===0&&m.obstacles.some(o=>o.type==='plane'&&o.floor===p.floor&&Math.abs(o.x-p.x)<145&&(o.x-p.x)*(o.dir*o.speed-dir*108)<0)){
    c.down=true;c.left=false;c.right=false;c.action=false;
  }
  return c;
}
