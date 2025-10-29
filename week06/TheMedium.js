const sources = [
  "WholeEarthMarch1985.jpg",
  "WholeEarthSpring2000.jpg",
  "WholeEarthSummer1993.jpg",
  "WholeEarthWinter2000.jpg",
  "WholeEarthFall1976.jpg",
  "TheLastWholeearthJan1971.jpg",
  "WholeEarthFall1985.jpg",
];

const deck  = document.getElementById("deck");
const btn   = document.getElementById("shuffleBtn");


function prettyTitle(filename){
  const base = filename.replace(/\.[^.]+$/,'');                
  return base
    .replace(/[_-]+/g, ' ')                                   
    .replace(/([a-z])([A-Z])/g, '$1 $2')                       
    .replace(/(\d)([A-Za-z])/g, '$1 $2')                        
    .replace(/([A-Za-z])(\d)/g, '$1 $2')                        
    .replace(/\s{2,}/g, ' ')                                   
    .trim();
}

const rnd = (a,b)=> Math.floor(Math.random()*(b-a+1))+a;

const cards = sources.map(src => {
  const img = document.createElement("img");
  img.src = src;
  img.alt = prettyTitle(src);
  img.className = "card";
  img.loading = "eager";

  const cap = document.createElement("div");
  cap.className = "card-caption";
  cap.textContent = img.alt;

  deck.appendChild(img);
  deck.appendChild(cap);
 
  return { img, cap };
});

function layoutStack() {
  cards.forEach(({img, cap}, i) => {
    const baseRot = [-4, -2, 0, 2, 4][i % 5] + (Math.random() * 1.2 - 0.6);
    const yNudge = (cards.length - i - 1) * 2;
    const t = `translateY(${yNudge}px) rotate(${baseRot}deg)`;
    img.style.transform = t;
    img.style.opacity = 0.98;
    img.style.zIndex = String(10 + i);
    cap.style.zIndex = String(11 + i);   
    img.classList.remove("selected");
  });
}

let topZ = 100;    
let lastTop = -1;

function shuffleOnce() {
  let pick = rnd(0, cards.length - 1);
  if (cards.length > 1 && pick === lastTop) pick = (pick + 1) % cards.length;

  cards.forEach(({img}, i) => {
    img.classList.add("shuffling");
    const dir = i % 2 === 0 ? -1 : 1;
    const spread = 14 + rnd(0, 10);
    const tilt = (Math.random() * 10 - 5);

    img.animate(
      [{ transform: img.style.transform },
       { transform: `translate(${dir * spread}px, -6px) rotate(${tilt}deg)` }],
      { duration: 150, easing: "ease-out" }
    ).onfinish = () => {
      img.animate(
        [{ transform: `translate(${dir * spread}px, -6px) rotate(${tilt}deg)` },
         { transform: img.style.transform }],
        { duration: 220, easing: "cubic-bezier(.2,.8,.2,1)" }
      ).onfinish = () => img.classList.remove("shuffling");
    };
  });

  const chosen = cards[pick];
  const newZ = ++topZ;
  chosen.img.classList.add("selected");
  chosen.img.style.zIndex = String(newZ);
  chosen.cap.style.zIndex = String(newZ + 1); 

  if (lastTop !== -1 && cards[lastTop] !== chosen) {
    cards[lastTop].img.classList.remove("selected");
  }
  lastTop = pick;
}

if (btn) btn.addEventListener("click", shuffleOnce);
deck.addEventListener("click", shuffleOnce);
document.addEventListener("keydown", (e) => {
  if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    shuffleOnce();
  }
});

layoutStack();
