import { dom } from "./dom.js";

const frames = [
  "/assets/hand1.png","/assets/hand2.png","/assets/hand3.png",
  "/assets/hand4.png","/assets/hand5.png","/assets/hand6.png"
];

let interval;

export function startHand() {
  let last=-1;
  interval = setInterval(()=>{
    let i;
    do { i=Math.floor(Math.random()*frames.length); }
    while(i===last);
    last=i;
    dom.hand.src = frames[i];
  },125);
}

export function stopHand() {
  clearInterval(interval);
}
