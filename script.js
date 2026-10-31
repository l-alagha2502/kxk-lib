const revealItems = document.querySelectorAll('.reveal');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (reduceMotion) {
  revealItems.forEach((item) => item.classList.add('is-visible'));
} else {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealItems.forEach((item) => observer.observe(item));
}

document.querySelectorAll('.magnetic').forEach((button) => {
  button.addEventListener('pointermove', (event) => {
    if (reduceMotion) return;
    const bounds = button.getBoundingClientRect();
    const x = (event.clientX - bounds.left - bounds.width / 2) * 0.12;
    const y = (event.clientY - bounds.top - bounds.height / 2) * 0.12;
    button.style.transform = `translate(${x}px, ${y}px)`;
  });
  button.addEventListener('pointerleave', () => { button.style.transform = ''; });
});

const clocks = document.querySelectorAll('#clock, #hero-clock');
const updateClock = () => {
  const time = `${new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'UTC'
  }).format(new Date())} UTC`;
  clocks.forEach((clock) => { clock.textContent = time; });
};
updateClock();
setInterval(updateClock, 1000);

const runnerStage = document.querySelector('#runner-stage');
const runnerPlayer = document.querySelector('#runner-player');
const runnerInstructions = document.querySelector('#runner-instructions');
const runnerDeath = document.querySelector('#runner-death');
const runnerScore = document.querySelector('#runner-score');
const runnerBest = document.querySelector('#runner-best');
const runnerBestKey = 'kxk-runner-best';
let runnerStarted = false;
let runnerDead = false;
let runnerJumping = false;
let runnerShrunk = false;
let runnerFrame;
let runnerLastTime = 0;
let runnerElapsed = 0;
let runnerNextObstacle = 900;
let runnerObstacles = [];
let runnerBestValue = Number(localStorage.getItem(runnerBestKey)) || 0;
runnerBest.textContent = String(runnerBestValue).padStart(5, '0');

const setRunnerScore = (value) => { runnerScore.textContent = String(value).padStart(5, '0'); };
const clearRunnerObstacles = () => { runnerObstacles.forEach((obstacle) => obstacle.remove()); runnerObstacles = []; };
const jump = () => {
  if (!runnerStarted || runnerDead || runnerJumping) return;
  runnerJumping = true;
  runnerPlayer.classList.add('is-jumping');
  window.setTimeout(() => { runnerJumping = false; runnerPlayer.classList.remove('is-jumping'); }, 560);
};
const setShrink = (value) => {
  if (!runnerStarted || runnerDead) return;
  runnerShrunk = value;
  runnerPlayer.classList.toggle('is-shrunk', value);
};
const spawnObstacle = () => {
  const overhead = Math.random() < 0.25;
  const groupSize = overhead ? 4 : (Math.random() < 0.45 ? Math.floor(Math.random() * 2) + 2 : 1);
  for (let index = 0; index < groupSize; index += 1) {
    const obstacle = document.createElement('span');
    obstacle.className = `runner-obstacle${overhead ? ' is-overhead' : ''}`;
    obstacle.textContent = overhead ? '❞' : (Math.random() < 0.5 ? '?' : '!');
    obstacle.style.right = overhead ? '0px' : `${-index * 27}px`;
    if (overhead) obstacle.style.setProperty('--stack-level', String(index));
    runnerStage.appendChild(obstacle);
    runnerObstacles.push(obstacle);
  }
  runnerNextObstacle = 700 + Math.random() * 900;
};
const endRunner = () => {
  runnerDead = true;
  runnerStarted = false;
  runnerPlayer.classList.remove('is-jumping', 'is-shrunk');
  runnerDeath.classList.add('is-visible');
  runnerInstructions.classList.remove('is-visible');
  cancelAnimationFrame(runnerFrame);
  const score = Math.floor(runnerElapsed / 100);
  if (score > runnerBestValue) {
    runnerBestValue = score;
    localStorage.setItem(runnerBestKey, String(score));
    runnerBest.textContent = String(score).padStart(5, '0');
  }
};
const startRunner = () => {
  clearRunnerObstacles();
  runnerStarted = true;
  runnerDead = false;
  runnerJumping = false;
  runnerShrunk = false;
  runnerElapsed = 0;
  runnerNextObstacle = 900;
  runnerPlayer.classList.remove('is-jumping', 'is-shrunk');
  runnerDeath.classList.remove('is-visible');
  runnerInstructions.classList.add('is-hidden');
  setRunnerScore(0);
  runnerLastTime = performance.now();
  runnerFrame = requestAnimationFrame(runRunner);
};
const runRunner = (time) => {
  if (!runnerStarted) return;
  const delta = Math.min(time - runnerLastTime, 50);
  runnerLastTime = time;
  runnerElapsed += delta;
  runnerNextObstacle -= delta;
  setRunnerScore(Math.floor(runnerElapsed / 100));
  if (runnerNextObstacle <= 0) spawnObstacle();
  const stageRect = runnerStage.getBoundingClientRect();
  const playerRect = runnerPlayer.getBoundingClientRect();
  runnerObstacles = runnerObstacles.filter((obstacle) => {
    const currentRight = Number.parseFloat(obstacle.style.right || '-60');
    const nextRight = currentRight + delta * (0.65 + Math.min(runnerElapsed / 24000, 0.95));
    obstacle.style.right = `${nextRight}px`;
    const obstacleRect = obstacle.getBoundingClientRect();
    const overlaps = playerRect.left < obstacleRect.right && playerRect.right > obstacleRect.left && playerRect.top < obstacleRect.bottom && playerRect.bottom > obstacleRect.top;
    if (overlaps && !(obstacle.classList.contains('is-overhead') && runnerShrunk)) endRunner();
    if (obstacleRect.right < stageRect.left - 60) { obstacle.remove(); return false; }
    return true;
  });
  runnerFrame = requestAnimationFrame(runRunner);
};
const handleRunnerKeydown = (event) => {
  if (event.target.matches('input, textarea, select, button')) return;
  if (event.code === 'Space') { event.preventDefault(); if (!runnerStarted) startRunner(); else jump(); }
  if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') { event.preventDefault(); setShrink(true); }
};
const handleRunnerKeyup = (event) => {
  if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') { event.preventDefault(); setShrink(false); }
};
document.addEventListener('keydown', handleRunnerKeydown);
document.addEventListener('keyup', handleRunnerKeyup);
runnerStage.addEventListener('click', () => runnerStage.focus());
