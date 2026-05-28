import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Fill this after creating your Firebase web app.
// The game still runs with localStorage fallback until these values are replaced.
const firebaseConfig = {
  apiKey: "AIzaSyC-xgLfINFr4-r4g_wc35TYfFrIIxBPM-k",
  authDomain: "an-experimental-crossover-game.firebaseapp.com",
  projectId: "an-experimental-crossover-game",
  storageBucket: "an-experimental-crossover-game.firebasestorage.app",
  messagingSenderId: "467631740620",
  appId: "1:467631740620:web:1376c1a7011b116d76d469",
};

const FIREBASE_CONFIG_FILLED = !Object.values(firebaseConfig).some(v => String(v).includes("PASTE"));
let db = null;
let firebaseEnabled = false;

try {
  if (FIREBASE_CONFIG_FILLED) {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    firebaseEnabled = true;
    console.log("Firebase Firestore enabled. Leaderboard will use the online database.");
  } else {
    console.warn("Firebase config is still using placeholder values. Leaderboard will use localStorage fallback.");
  }
} catch (error) {
  console.error("Firebase initialization failed. Leaderboard will use localStorage fallback.", error);
  db = null;
  firebaseEnabled = false;
}

const $ = (id) => document.getElementById(id);
const screens = ["landing", "battleScreen", "vnScreen", "victoryScreen", "gameOverScreen", "toBeContinuedScreen", "leaderboardScreen"];
function showScreen(id) {
  screens.forEach(s => $(s).classList.toggle("active", s === id));
}
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

const audio = {
  music: null,
  playMusic(src, loop = true) {
    this.stopMusic();
    const a = new Audio(src);
    a.loop = loop;
    a.volume = 0.45;
    this.music = a;
    a.play().catch(() => {});
    return a;
  },
  stopMusic() {
    if (this.music) {
      this.music.pause();
      this.music.currentTime = 0;
      this.music = null;
    }
  },
  playSfx(src, volume = 0.55) {
    const a = new Audio(src);
    a.volume = volume;
    a.play().catch(() => {});
    return a;
  },
  random(srcs, volume = 0.55) { this.playSfx(choice(srcs), volume); }
};

const ASSETS = {
  portraits: {
    player: "assets/images/portraits/you_battle.png",
    kiryu: "assets/images/portraits/kiryu_battle.png",
    shiroko: "assets/images/portraits/shiroko_battle.png"
  },
  full: {
    kiryu: "assets/images/characters/kiryu_full.png",
    shiroko: "assets/images/characters/shiroko_full.png"
  },
  enemies: {
    monster1: "assets/images/enemies/monster1.png",
    boss: "assets/images/enemies/boss.png"
  },
  music: {
    battle1: "assets/audio/music/battle_1_placeholder.mp3",
    boss: "assets/audio/music/boss_battle_placeholder.mp3",
    victory: "assets/audio/music/victory_placeholder.mp3",
    partyWipe: "assets/audio/music/party_wipe_tune_placeholder.mp3",
    gameOver: "assets/audio/music/game_over_placeholder.mp3",
    ending: "assets/audio/music/ending_placeholder.mp3"
  },
  sfx: {
    menu: "assets/audio/sfx/menu_select.wav",
    attack: "assets/audio/sfx/attack_basic.wav",
    guard: "assets/audio/sfx/guard.wav",
    item: "assets/audio/sfx/item_use.wav",
    heal: "assets/audio/sfx/heal.wav",
    revive: "assets/audio/sfx/revive.wav",
    damage: "assets/audio/sfx/damage_taken.wav",
    down: "assets/audio/sfx/character_down.wav",
    singleFire: "assets/audio/sfx/single_fire.wav",
    explosion: "assets/audio/sfx/explosion.wav",
    launch: "assets/audio/sfx/missile_launch.wav",
    shortRapid: "assets/audio/sfx/short_rapid_fire.wav",
    longRapid: "assets/audio/sfx/long_rapid_fire.wav",
    missileDrone: "assets/audio/sfx/shiroko_missile_drone_sfx.wav",
    kiryuExtreme: "assets/audio/sfx/kiryu_extreme_heat_sfx.wav",
    kiryuEssence: "assets/audio/sfx/kiryu_dragon_king_essence_sfx.wav",
    kiryuHits: ["assets/audio/sfx/kiryu_hit_1.wav", "assets/audio/sfx/kiryu_hit_2.wav", "assets/audio/sfx/kiryu_hit_3.wav"]
  },
  voices: {
    kiryuAttack: ["assets/audio/voices/kiryu/kiryu_attack_voice_1.wav", "assets/audio/voices/kiryu/kiryu_attack_voice_2.wav", "assets/audio/voices/kiryu/kiryu_attack_voice_3.wav"],
    kiryuParry: "assets/audio/voices/kiryu/kiryu_komaki_parry_voice_1.wav",
    kiryuHeat: ["assets/audio/voices/kiryu/kiryu_extreme_heat_voice_1.wav", "assets/audio/voices/kiryu/kiryu_extreme_heat_voice_2.wav"],
    kiryuEssence: ["assets/audio/voices/kiryu/kiryu_dragon_king_essence_voice_1.wav", "assets/audio/voices/kiryu/kiryu_dragon_king_essence_voice_2.wav"],
    shirokoAttack: ["assets/audio/voices/shiroko/shiroko_attack_voice_1.wav", "assets/audio/voices/shiroko/shiroko_attack_voice_2.wav", "assets/audio/voices/shiroko/shiroko_attack_voice_3.wav"],
    shirokoDrone: ["assets/audio/voices/shiroko/shiroko_missile_drone_voice_1.wav", "assets/audio/voices/shiroko/shiroko_missile_drone_voice_2.wav"],
    monster1: "assets/audio/voices/monsters/monster1_voice_1.wav",
    boss: ["assets/audio/voices/monsters/boss_voice_1.wav", "assets/audio/voices/monsters/boss_voice_2.wav", "assets/audio/voices/monsters/boss_voice_3.wav"]
  }
};

let state = {};
function freshState(name = "Player") {
  return {
    playerName: name,
    phase: "landing",
    battleIndex: 0,
    totalBattleTime: 0,
    timerStart: 0,
    timerRunning: false,
    timerInterval: null,
    turns: 0,
    bossCheckpoint: null,
    partyBuffTurns: 0,
    partyDebuffTurns: 0,
    actionQueue: [],
    currentActorIndex: 0,
    enemy: null,
    party: [
      { id: "player", name, battleLabel: name, maxHp: 183, hp: 183, maxMp: 127, mp: 127, guard: false, down: false, glow: false },
      { id: "kiryu", name: "Kazuma Kiryu", battleLabel: "Kiryu", maxHp: 384, hp: 384, maxMp: 98, mp: 98, guard: false, down: false, parry: false, heatTurns: 0, glow: false },
      { id: "shiroko", name: "Sunaookami Shiroko", battleLabel: "Shiroko", maxHp: 218, hp: 218, maxMp: 160, mp: 160, guard: false, down: false, glow: false }
    ],
    inventory: {
      lifeStone: { name: "Life Stone", qty: 5, desc: "Restores 50 HP to one ally." },
      staminanSpark: { name: "Staminan Spark", qty: 3, desc: "Fully restores one ally's HP and MP." },
      revivePill: { name: "Revive Pill", qty: 5, desc: "Revives one fallen ally with 50% of their maximum HP." },
      freedomsAdvance: { name: "Freedom's Advance", qty: 1, desc: "Designates the enemy for a devastating long-range strike. Deals massive damage to all enemies." }
    }
  };
}

function createEnemy(type) {
  if (type === "boss") {
    return {
      id: "boss", name: "Menacing Monster", image: ASSETS.enemies.boss, maxHp: 5000, hp: 5000,
      moves: ["Crushing Blow", "Sweeping Strike", "Distorted Roar", "Ruin Charge"], enraged: false
    };
  }
  return {
    id: "monster1", name: "Monster", image: ASSETS.enemies.monster1, maxHp: 650, hp: 650,
    moves: ["Claw Swipe", "Body Slam", "Rage Howl"], rage: false
  };
}

function startTimer() {
  if (state.timerRunning) return;
  state.timerRunning = true;
  state.timerStart = performance.now();
  state.timerInterval = setInterval(updateTimerDisplay, 50);
}
function pauseTimer() {
  if (!state.timerRunning) return;
  state.totalBattleTime += (performance.now() - state.timerStart) / 1000;
  state.timerRunning = false;
  clearInterval(state.timerInterval);
  updateTimerDisplay();
}
function setTimer(seconds) {
  state.totalBattleTime = seconds;
  state.timerStart = performance.now();
  updateTimerDisplay();
}
function currentTime() {
  return state.totalBattleTime + (state.timerRunning ? (performance.now() - state.timerStart) / 1000 : 0);
}
function updateTimerDisplay() { $("timer").textContent = currentTime().toFixed(2); }

function livingParty() { return state.party.filter(p => p.hp > 0); }
function getChar(id) { return state.party.find(p => p.id === id); }
function displayName(chOrId) {
  const ch = typeof chOrId === "string" ? getChar(chOrId) : chOrId;
  if (!ch) return "Unknown";
  return ch.id === "player" ? state.playerName : ch.battleLabel;
}
function enemyAlive() { return state.enemy && state.enemy.hp > 0; }
function hpPercent(ch) { return Math.max(0, Math.min(100, (ch.hp / ch.maxHp) * 100)); }
function mpPercent(ch) { return Math.max(0, Math.min(100, (ch.mp / ch.maxMp) * 100)); }

function renderBattle() {
  $("battleTitle").textContent = state.battleIndex === 2 ? "BOSS BATTLE" : "BATTLE";
  $("turnCounter").textContent = state.turns;
  $("enemyImage").src = state.enemy.image;
  $("enemyName").textContent = `${state.enemy.name}  ${Math.max(0, state.enemy.hp)} / ${state.enemy.maxHp} HP`;
  $("enemyHpBar").querySelector("span").style.width = `${Math.max(0, state.enemy.hp) / state.enemy.maxHp * 100}%`;
  const row = $("partyRow");
  row.innerHTML = "";
  state.party.forEach((p, idx) => {
    const card = document.createElement("div");
    card.className = "party-card";
    if (idx === state.currentActorIndex && p.hp > 0) card.classList.add("active-turn");
    if (p.hp <= 0) card.classList.add("down");
    card.innerHTML = `
      <img src="${ASSETS.portraits[p.id]}" alt="${p.battleLabel}">
      <div class="party-name">${p.id === "player" ? state.playerName : p.battleLabel}</div>
      <div>HP ${Math.max(0, p.hp)} / ${p.maxHp}</div><div class="bar hp"><span style="width:${hpPercent(p)}%"></span></div>
      <div>MP ${Math.max(0, p.mp)} / ${p.maxMp}</div><div class="bar mp"><span style="width:${mpPercent(p)}%"></span></div>
    `;
    row.appendChild(card);
  });
}

function log(text) { $("battleLog").innerHTML = text; }
function clearCommands() {
  $("commandArea").innerHTML = "";
  setHoverDescription("");
}
function setHoverDescription(text = "") {
  const box = $("hoverDescription");
  if (!box) return;
  box.textContent = text;
  box.classList.toggle("visible", Boolean(text));
}
function addButton(label, fn, disabled = false, description = "") {
  const b = document.createElement("button");
  b.textContent = label;
  b.disabled = disabled;
  if (description) {
    b.title = description;
    b.dataset.description = description;
    b.addEventListener("mouseenter", () => setHoverDescription(description));
    b.addEventListener("mouseleave", () => setHoverDescription(""));
    b.addEventListener("focus", () => setHoverDescription(description));
    b.addEventListener("blur", () => setHoverDescription(""));
  }
  b.addEventListener("click", () => { audio.playSfx(ASSETS.sfx.menu, 0.25); fn(); });
  $("commandArea").appendChild(b);
}

function beginBattle(index) {
  state.battleIndex = index;
  state.phase = index === 2 ? "bossBattle" : "battle1";
  state.enemy = createEnemy(index === 2 ? "boss" : "monster1");
  state.actionQueue = [];
  state.currentActorIndex = 0;
  state.party.forEach(p => { p.guard = false; p.parry = false; });
  showScreen("battleScreen");
  renderBattle();
  log(index === 2 ? "Menacing Monster blocks your path." : "A hostile entity appears. No tutorial. Survive.");
  audio.playMusic(index === 2 ? ASSETS.music.boss : ASSETS.music.battle1);
  if (index === 2) saveBossCheckpoint();
  startTimer();
  setTimeout(nextPartyActor, 600);
}

function saveBossCheckpoint() {
  state.bossCheckpoint = {
    totalBattleTime: currentTime(),
    turns: state.turns,
    party: deepClone(state.party),
    inventory: deepClone(state.inventory)
  };
}

function nextPartyActor() {
  renderBattle();
  clearCommands();
  if (!enemyAlive()) return winBattle();
  if (livingParty().length === 0) return partyWipe();
  while (state.currentActorIndex < state.party.length && state.party[state.currentActorIndex].hp <= 0) {
    state.currentActorIndex++;
  }
  if (state.currentActorIndex >= state.party.length) return resolvePartyActions();
  const actor = state.party[state.currentActorIndex];
  log(`${displayName(actor)}'s action.`);
  addButton("Attack", () => queueAction({ type: "attack", actor: actor.id }));
  addButton("Special", () => showSpecials(actor));
  addButton("Item", () => showItems(actor));
  addButton("Guard", () => queueAction({ type: "guard", actor: actor.id }));
}

function queueAction(action) {
  state.actionQueue.push(action);
  state.currentActorIndex++;
  nextPartyActor();
}

function showSpecials(actor) {
  clearCommands();
  const specials = getSpecials(actor.id);
  log(`Choose ${displayName(actor)}'s special.`);
  specials.forEach(sp => {
    const disabled = (sp.costType === "HP" && actor.hp <= sp.cost) || (sp.costType === "MP" && actor.mp < sp.cost);
    addButton(`${sp.name} (${sp.cost} ${sp.costType})`, () => {
      if (sp.target === "ally") return chooseAllyTarget(actor, sp, false);
      queueAction({ type: "special", actor: actor.id, special: sp.name });
    }, disabled, sp.desc || "");
  });
  addButton("Back", nextPartyActor, false, "Return to the main command list.");
}

function showItems(actor) {
  clearCommands();
  log("Choose an item.");
  Object.entries(state.inventory).forEach(([key, item]) => {
    addButton(`${item.name} x${item.qty}`, () => chooseItemTarget(actor, key), item.qty <= 0, item.desc);
  });
  addButton("Back", nextPartyActor, false, "Return to the main command list.");
}

function chooseAllyTarget(actor, special, fallenOnly) {
  clearCommands();
  log(`Choose a target for ${special.name}.`);
  state.party.forEach(ally => {
    const invalid = fallenOnly ? ally.hp > 0 : ally.hp <= 0;
    addButton(ally.id === "player" ? state.playerName : ally.battleLabel, () => {
      queueAction({ type: "special", actor: actor.id, special: special.name, target: ally.id });
    }, invalid);
  });
  addButton("Back", () => showSpecials(actor), false, "Return to the special list.");
}

function chooseItemTarget(actor, itemKey) {
  clearCommands();
  const item = state.inventory[itemKey];
  const fallenOnly = itemKey === "revivePill";
  if (itemKey === "freedomsAdvance") {
    queueAction({ type: "item", actor: actor.id, item: itemKey });
    return;
  }
  log(`Choose a target for ${item.name}.`);
  state.party.forEach(ally => {
    const invalid = fallenOnly ? ally.hp > 0 : ally.hp <= 0;
    addButton(ally.id === "player" ? state.playerName : ally.battleLabel, () => {
      queueAction({ type: "item", actor: actor.id, item: itemKey, target: ally.id });
    }, invalid);
  });
  addButton("Back", () => showItems(actor), false, "Return to the item list.");
}

function getSpecials(id) {
  if (id === "player") return [
    { name: "Rush Attack", cost: 15, costType: "HP", desc: "Spend 15 HP to strike one enemy 3 times for light physical damage." },
    { name: "Power Strike", cost: 15, costType: "HP", desc: "Spend 15 HP to deal medium physical damage to one enemy." },
    { name: "Rally Cry", cost: 25, costType: "MP", desc: "Spend 25 MP to raise party damage for 2 group turns." },
    { name: "Emergency Heal", cost: 30, costType: "MP", target: "ally", desc: "Spend 30 MP to restore a medium amount of HP to one ally." }
  ];
  if (id === "kiryu") return [
    { name: "Brawler Rush", cost: 20, costType: "HP", desc: "Spend 20 HP to deal heavy physical damage to one enemy." },
    { name: "Komaki Parry", cost: 25, costType: "HP", desc: "Spend 25 HP. Enemy attacks targeting Kiryu automatically miss and receive counter damage for 1 enemy turn." },
    { name: "Dragon King Essence", cost: 190, costType: "HP", desc: "Spend 190 HP to unleash massive physical damage on one enemy." },
    { name: "Extreme Heat", cost: 20, costType: "MP", desc: "Spend 20 MP. Kiryu's damage is doubled for the next 2 group turns." }
  ];
  return [
    { name: "Missile Drone", cost: 45, costType: "MP", desc: "Spend 45 MP to deal medium damage to one enemy 5 times." },
    { name: "Burst Fire", cost: 35, costType: "MP", desc: "Spend 35 MP to deal medium damage 3 to 5 times to random targets." },
    { name: "Headshot", cost: 30, costType: "MP", desc: "Spend 30 MP to deal heavy damage to one enemy." },
    { name: "Grenade Lob", cost: 50, costType: "MP", desc: "Spend 50 MP to deal medium damage to all enemies." }
  ];
}

async function resolvePartyActions() {
  clearCommands();
  for (const action of state.actionQueue) {
    if (!enemyAlive()) break;
    const actor = getChar(action.actor);
    if (!actor || actor.hp <= 0) continue;
    await performAction(actor, action);
    renderBattle();
    await wait(450);
  }
  state.actionQueue = [];
  if (!enemyAlive()) return winBattle();
  await enemyTurn();
  if (livingParty().length === 0) return partyWipe();
  endRoundBuffTick();
  state.turns++;
  state.currentActorIndex = 0;
  renderBattle();
  nextPartyActor();
}

function damageMultiplier(actor) {
  let mult = 1;
  if (state.partyBuffTurns > 0) mult *= 1.25;
  if (state.partyDebuffTurns > 0) mult *= 0.75;
  if (actor.id === "kiryu" && actor.heatTurns > 0) mult *= 2;
  return mult;
}
async function dealEnemyDamage(actor, base, hits = 1, randomTargets = false) {
  for (let i = 0; i < hits; i++) {
    if (!enemyAlive()) return;
    const dmg = Math.round(base * damageMultiplier(actor));
    state.enemy.hp -= dmg;
    log(`${displayName(actor)} hits for ${dmg} damage!`);
    if (actor.id === "kiryu") audio.random(ASSETS.sfx.kiryuHits, 0.5); else audio.playSfx(ASSETS.sfx.attack, 0.4);
    renderBattle();
    await wait(180);
  }
}
async function performAction(actor, action) {
  if (action.type === "attack") {
    if (actor.id === "kiryu") audio.random(ASSETS.voices.kiryuAttack, 0.5);
    if (actor.id === "shiroko") { audio.random(ASSETS.voices.shirokoAttack, 0.45); audio.playSfx(ASSETS.sfx.shortRapid, 0.45); }
    if (actor.id === "player") audio.playSfx(ASSETS.sfx.attack, 0.45);
    return dealEnemyDamage(actor, actor.id === "kiryu" ? 110 : actor.id === "shiroko" ? 100 : 90);
  }
  if (action.type === "guard") {
    actor.guard = true;
    audio.playSfx(ASSETS.sfx.guard);
    log(`${displayName(actor)} guards.`);
    return;
  }
  if (action.type === "item") return useItem(actor, action);
  if (action.type === "special") return useSpecial(actor, action);
}

async function useSpecial(actor, action) {
  const name = action.special;
  const spend = (amount, type) => { if (type === "HP") actor.hp = Math.max(1, actor.hp - amount); else actor.mp -= amount; };
  switch (name) {
    case "Rush Attack": spend(15,"HP"); return dealEnemyDamage(actor, 35, 3);
    case "Power Strike": spend(15,"HP"); return dealEnemyDamage(actor, 120);
    case "Rally Cry": actor.mp -= 25; state.partyBuffTurns = 2; audio.playSfx(ASSETS.sfx.guard); log(`${state.playerName} rallies the party. Damage increased!`); return;
    case "Emergency Heal": actor.mp -= 30; return healTarget(action.target, 100, `${state.playerName} casts Emergency Heal.`);
    case "Brawler Rush": actor.hp = Math.max(1, actor.hp - 20); audio.random(ASSETS.voices.kiryuAttack); return dealEnemyDamage(actor, 180);
    case "Komaki Parry": actor.hp = Math.max(1, actor.hp - 25); actor.parry = true; audio.playSfx(ASSETS.voices.kiryuParry); log("Kiryu enters a Komaki Parry stance."); return;
    case "Dragon King Essence": actor.hp = Math.max(1, actor.hp - 190); audio.random(ASSETS.voices.kiryuEssence); audio.playSfx(ASSETS.sfx.kiryuEssence); return dealEnemyDamage(actor, 900);
    case "Extreme Heat": actor.mp -= 20; actor.heatTurns = 2; audio.random(ASSETS.voices.kiryuHeat); audio.playSfx(ASSETS.sfx.kiryuExtreme); log("Kiryu enters Extreme Heat. His damage is doubled!"); return;
    case "Missile Drone":
      actor.mp -= 45; audio.random(ASSETS.voices.shirokoDrone); audio.playSfx(ASSETS.sfx.missileDrone); await showDrone(true); audio.playSfx(ASSETS.sfx.launch); await wait(250); audio.playSfx(ASSETS.sfx.explosion); await dealEnemyDamage(actor, 90, 5); await showDrone(false); return;
    case "Burst Fire": actor.mp -= 35; audio.random(ASSETS.voices.shirokoAttack); audio.playSfx(ASSETS.sfx.longRapid); return dealEnemyDamage(actor, 85, randInt(3,5));
    case "Headshot": actor.mp -= 30; audio.random(ASSETS.voices.shirokoAttack); audio.playSfx(ASSETS.sfx.singleFire); return dealEnemyDamage(actor, 280);
    case "Grenade Lob": actor.mp -= 50; audio.random(ASSETS.voices.shirokoAttack); audio.playSfx(ASSETS.sfx.explosion); return dealEnemyDamage(actor, 180);
  }
}

async function showDrone(show) {
  $("droneImage").classList.toggle("hidden", !show);
  await wait(show ? 250 : 100);
}

async function useItem(actor, action) {
  const inv = state.inventory[action.item];
  if (!inv || inv.qty <= 0) return;
  inv.qty--;
  audio.playSfx(ASSETS.sfx.item);
  if (action.item === "lifeStone") return healTarget(action.target, 50, `${displayName(actor)} uses Life Stone.`);
  if (action.item === "staminanSpark") {
    const target = getChar(action.target);
    target.hp = target.maxHp; target.mp = target.maxMp;
    audio.playSfx(ASSETS.sfx.heal);
    log(`${displayName(actor)} uses Staminan Spark on ${displayName(target)}. Fully restored!`);
    return;
  }
  if (action.item === "revivePill") {
    const target = getChar(action.target);
    target.hp = Math.ceil(target.maxHp / 2);
    target.down = false;
    audio.playSfx(ASSETS.sfx.revive);
    log(`${displayName(target)} is revived with half HP!`);
    return;
  }
  if (action.item === "freedomsAdvance") {
    await playFreedomVideo();
    state.enemy.hp -= 999999;
    log("A devastating long-range strike hits all enemies!");
    audio.playSfx(ASSETS.sfx.explosion, 0.8);
  }
}

function healTarget(id, amount, intro) {
  const target = getChar(id);
  target.hp = Math.min(target.maxHp, target.hp + amount);
  audio.playSfx(ASSETS.sfx.heal);
  log(`${intro}<br>${displayName(target)} recovers ${amount} HP.`);
}

async function playFreedomVideo() {
  pauseTimer();
  const overlay = $("videoOverlay");
  const video = $("freedomVideo");
  overlay.classList.remove("hidden");
  video.currentTime = 0;
  await video.play().catch(() => {});
  await new Promise(resolve => { video.onended = resolve; setTimeout(resolve, 4500); });
  overlay.classList.add("hidden");
  startTimer();
}

async function enemyTurn() {
  clearCommands();
  $("enemyImage").classList.add("enemy-turn");
  await wait(300);
  if (state.enemy.id === "monster1") audio.playSfx(ASSETS.voices.monster1, 0.5); else audio.random(ASSETS.voices.boss, 0.55);
  if (state.enemy.id === "monster1") await monster1Action(); else await bossAction();
  $("enemyImage").classList.remove("enemy-turn");
}
async function monster1Action() {
  const move = choice(state.enemy.moves);
  if (move === "Rage Howl") { state.enemy.rage = true; log("Monster lets out a Rage Howl. Its next attack will hit harder!"); return; }
  const target = choice(livingParty());
  const base = move === "Body Slam" ? 40 : 25;
  const dmg = Math.round(base * (state.enemy.rage ? 1.5 : 1));
  state.enemy.rage = false;
  await damageAlly(target, dmg, `Monster uses ${move}!`);
}
async function bossAction() {
  if (!state.enemy.enraged && state.enemy.hp <= 2500) {
    state.enemy.enraged = true;
    log("Menacing Monster becomes enraged. Its damage increases!");
    return;
  }
  const move = choice(state.enemy.moves);
  const mult = state.enemy.enraged ? 1.25 : 1;
  if (move === "Distorted Roar") { state.partyDebuffTurns = 2; log("Menacing Monster uses Distorted Roar. Party damage is reduced!"); return; }
  if (move === "Sweeping Strike") {
    log("Menacing Monster uses Sweeping Strike!");
    for (const ally of livingParty()) await damageAlly(ally, Math.round(40 * mult), "", false);
    return;
  }
  const target = choice(livingParty());
  const dmg = Math.round((move === "Ruin Charge" ? 110 : 70) * mult);
  await damageAlly(target, dmg, `Menacing Monster uses ${move}!`);
}
async function damageAlly(target, amount, intro = "", overwriteLog = true) {
  if (target.id === "kiryu" && target.parry) {
    target.parry = false;
    state.enemy.hp -= 160;
    audio.playSfx(ASSETS.sfx.kiryuHits[0]);
    log(`${intro}<br>Kiryu parries. The attack misses, and the enemy takes 160 counter damage!`);
    renderBattle();
    await wait(500);
    return;
  }
  const actual = Math.round(amount * (target.guard ? 0.5 : 1));
  target.guard = false;
  target.hp -= actual;
  audio.playSfx(ASSETS.sfx.damage);
  if (overwriteLog || intro) log(`${intro}<br>${displayName(target)} takes ${actual} damage.`);
  if (target.hp <= 0) {
    target.hp = 0;
    audio.playSfx(ASSETS.sfx.down, 0.7);
    log(`${displayName(target)} is down!`);
  }
  renderBattle();
  await wait(350);
}
function endRoundBuffTick() {
  if (state.partyBuffTurns > 0) state.partyBuffTurns--;
  if (state.partyDebuffTurns > 0) state.partyDebuffTurns--;
  const kiryu = getChar("kiryu");
  if (kiryu.heatTurns > 0) kiryu.heatTurns--;
  state.party.forEach(p => { p.guard = false; if (p.id !== "kiryu") p.parry = false; });
}

async function winBattle() {
  pauseTimer();
  clearCommands();
  audio.stopMusic();
  audio.playMusic(ASSETS.music.victory, false);
  showVictory(0);
}
function showVictory(step) {
  showScreen("victoryScreen");
  $("victoryText").textContent = step === 0 ? "Victory!" : "Got nothing and no EXP gained, this is just a demo.";
  $("victoryScreen").onclick = async () => {
    audio.playSfx(ASSETS.sfx.menu, 0.25);
    if (step === 0) showVictory(1);
    else {
      $("victoryScreen").onclick = null;
      await fadeCurrent("victoryScreen");
      if (state.battleIndex === 1) startDialogue(postBattleDialogue());
      else startDialogue(postBossDialogue(), true);
    }
  };
}
async function fadeCurrent(id) {
  $(id).classList.add("fade-out");
  await wait(500);
  $(id).classList.remove("active", "fade-out");
}

async function partyWipe() {
  pauseTimer();
  audio.stopMusic();
  audio.playMusic(ASSETS.music.partyWipe, false);
  clearCommands();
  renderBattle();
  log(`${state.playerName}'s party has fallen.<br>Exiting will not record your progress.`);
  addButton("Restart Battle", restartBattle);
  addButton("Exit", exitGameOver);
}
function restartBattle() {
  audio.stopMusic();
  if (state.battleIndex === 1) {
    const name = state.playerName;
    state = freshState(name);
    beginBattle(1);
  } else {
    const cp = state.bossCheckpoint;
    state.party = deepClone(cp.party);
    state.inventory = deepClone(cp.inventory);
    state.turns = cp.turns;
    state.totalBattleTime = cp.totalBattleTime;
    state.enemy = createEnemy("boss");
    state.actionQueue = [];
    state.currentActorIndex = 0;
    beginBattle(2);
  }
}
async function exitGameOver() {
  clearCommands();
  pauseTimer();
  audio.stopMusic();
  showScreen("gameOverScreen");
  const m = audio.playMusic(ASSETS.music.gameOver, false);
  await wait(3500);
  $("gameOverScreen").classList.add("fade-out");
  await wait(900);
  $("gameOverScreen").classList.remove("active", "fade-out");
  resetToLanding();
}

function postBattleDialogue() {
  return [
    { speaker: "Kazuma Kiryu", text: "That thing didn't look human." },
    { speaker: "Sunaookami Shiroko", text: "Enemy signal disappeared. But another one is approaching." },
    { speaker: state.playerName, text: "Another one? I just got here." },
    { speaker: "Kazuma Kiryu", text: "Then stay ready." },
    { speaker: "Sunaookami Shiroko", text: "Same direction. Bigger." },
    { speaker: state.playerName, text: "Crap, here it comes...!" }
  ];
}
function postBossDialogue() {
  return [
    { speaker: "Sunaookami Shiroko", text: "Hostile signal erased." },
    { speaker: "Kazuma Kiryu", text: "Looks like this wasn't the only fight happening." },
    { speaker: state.playerName, text: "You mean there are others?" },
    { speaker: "Sunaookami Shiroko", text: "Multiple signals. Some friendly." },
    { speaker: "Kazuma Kiryu", text: "Then we find them." },
    { speaker: state.playerName, text: "Right. No idea what's beyond this sewer, but sure." }
  ];
}

let dialogue = { lines: [], index: 0, typing: false, fullText: "", timer: null, afterBoss: false };
function startDialogue(lines, afterBoss = false) {
  dialogue = { lines, index: 0, typing: false, fullText: "", timer: null, afterBoss };
  renderVnCharacters();
  showScreen("vnScreen");
  nextDialogueLine();
}
function renderVnCharacters() {
  $("vnCharacters").innerHTML = `
    <img src="${ASSETS.full.kiryu}" alt="Kiryu">
    <img src="${ASSETS.full.shiroko}" alt="Shiroko">
  `;
}
function nextDialogueLine() {
  if (dialogue.index >= dialogue.lines.length) {
    if (dialogue.afterBoss) return endingSequence();
    audio.random(ASSETS.voices.boss, 0.55);
    return beginBattle(2);
  }
  const line = dialogue.lines[dialogue.index++];
  $("vnSpeaker").textContent = line.speaker;
  typeText(line.text);
}
function typeText(text) {
  dialogue.typing = true;
  dialogue.fullText = text;
  $("vnText").textContent = "";
  let i = 0;
  clearInterval(dialogue.timer);
  dialogue.timer = setInterval(() => {
    i++;
    $("vnText").textContent = text.slice(0, i);
    if (i >= text.length) {
      clearInterval(dialogue.timer);
      dialogue.typing = false;
    }
  }, 18);
}
$("vnScreen").addEventListener("click", () => {
  if (!$("vnScreen").classList.contains("active")) return;
  if (dialogue.typing) {
    clearInterval(dialogue.timer);
    $("vnText").textContent = dialogue.fullText;
    dialogue.typing = false;
  } else nextDialogueLine();
});

async function endingSequence() {
  showScreen("toBeContinuedScreen");
  audio.playMusic(ASSETS.music.ending, false);
  await wait(2300);
  await fadeCurrent("toBeContinuedScreen");
  await saveAndShowLeaderboard();
}

async function saveAndShowLeaderboard() {
  const record = {
    playerName: state.playerName.slice(0, 16),
    clearTime: Number(currentTime().toFixed(2)),
    turns: Number(state.turns)
  };

  await saveLeaderboardRecord(record);
  await loadLeaderboard();
  showScreen("leaderboardScreen");
}

async function saveLeaderboardRecord(record) {
  if (firebaseEnabled && db) {
    try {
      await addDoc(collection(db, "leaderboard"), {
        ...record,
        createdAt: serverTimestamp()
      });
      return;
    } catch (error) {
      console.error("Firestore save failed. Saving to localStorage fallback instead.", error);
    }
  }

  const arr = JSON.parse(localStorage.getItem("ecg_leaderboard") || "[]");
  arr.push({ ...record, createdAt: new Date().toISOString() });
  localStorage.setItem("ecg_leaderboard", JSON.stringify(arr));
}

async function loadLeaderboard() {
  let rows = [];

  if (firebaseEnabled && db) {
    try {
      const q = query(collection(db, "leaderboard"), orderBy("clearTime", "asc"), limit(10));
      const snap = await getDocs(q);
      rows = snap.docs
        .map(d => d.data())
        .sort((a,b) => Number(a.clearTime) - Number(b.clearTime) || Number(a.turns) - Number(b.turns))
        .slice(0, 10);
    } catch (error) {
      console.error("Firestore leaderboard read failed. Loading localStorage fallback instead.", error);
      rows = getLocalLeaderboardRows();
    }
  } else {
    rows = getLocalLeaderboardRows();
  }

  $("leaderboardBody").innerHTML = rows.map((r,i) => `<tr><td>${i+1}</td><td>${escapeHtml(r.playerName)}</td><td>${Number(r.clearTime).toFixed(2)}s</td><td>${Number(r.turns)}</td></tr>`).join("") || `<tr><td colspan="4">No clears yet.</td></tr>`;
}

function getLocalLeaderboardRows() {
  return JSON.parse(localStorage.getItem("ecg_leaderboard") || "[]")
    .sort((a,b) => Number(a.clearTime) - Number(b.clearTime) || Number(a.turns) - Number(b.turns))
    .slice(0, 10);
}

function escapeHtml(s) { return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

function resetToLanding() {
  audio.stopMusic();
  state = freshState();
  $("playerName").value = "";
  showScreen("landing");
}

$("playBtn").addEventListener("click", async () => {
  const name = $("playerName").value.trim() || "Player";
  state = freshState(name);
  $("landing").classList.add("fade-out");
  await wait(450);
  $("landing").classList.remove("fade-out");
  beginBattle(1);
});
$("leaderboardBtn").addEventListener("click", async () => {
  await loadLeaderboard();
  showScreen("leaderboardScreen");
});
$("returnLandingBtn").addEventListener("click", resetToLanding);

resetToLanding();
