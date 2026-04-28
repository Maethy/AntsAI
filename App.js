import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

const TICK_MS = 1000;
const RAID_MIN_DELAY_MS = 30000;
const RAID_MAX_DELAY_MS = 600000;
const ENEMY_GROWTH_MS = 25000;
const SOLDIER_TYPES = ['cutter', 'stinger', 'shield'];
const WORKER_TYPES = ['farmer', 'woodcutter', 'miner', 'builder'];
const TABS = ['overview', 'units', 'buildings', 'technology', 'enemies'];

const TYPE_LABELS = { cutter: 'Cutter', stinger: 'Stinger', shield: 'Shield' };
const TYPE_ICONS = { cutter: '⚔️', stinger: '🗡️', shield: '🛡️' };
const TYPE_ADVANTAGE = { cutter: 'shield', shield: 'stinger', stinger: 'cutter' };
const WORKER_LABELS = { farmer: 'Farmer', woodcutter: 'Woodcutter', miner: 'Stone Miner', builder: 'Builder' };
const WORKER_ICONS = { farmer: '🌾', woodcutter: '🪵', miner: '⛏️', builder: '🧱' };

const createInitialColonies = () => [
  {
    id: 'red',
    name: 'Crimson Nest',
    defense: 18,
    reward: { food: 80, wood: 70, stone: 50 },
    army: { cutter: 3, stinger: 3, shield: 3 },
    workers: { farmer: 6, woodcutter: 6, miner: 6, builder: 1 },
    scientists: 1,
    buildings: { fortifications: 1 },
  },
  {
    id: 'blue',
    name: 'Azure Nest',
    defense: 18,
    reward: { food: 80, wood: 70, stone: 50 },
    army: { cutter: 3, stinger: 3, shield: 3 },
    workers: { farmer: 6, woodcutter: 6, miner: 6, builder: 1 },
    scientists: 1,
    buildings: { fortifications: 1 },
  },
  {
    id: 'gold',
    name: 'Golden Nest',
    defense: 18,
    reward: { food: 80, wood: 70, stone: 50 },
    army: { cutter: 3, stinger: 3, shield: 3 },
    workers: { farmer: 6, woodcutter: 6, miner: 6, builder: 1 },
    scientists: 1,
    buildings: { fortifications: 1 },
  },
];

const BUILDING_DATA = {
  granary: { label: 'Granary', icon: '🏚️', maxLevel: 4, benefitText: '+110 food cap / level', costForLevel: (l) => ({ food: 40 + l * 30, wood: 45 + l * 35, stone: 20 + l * 10 }) },
  lumberyard: { label: 'Lumberyard', icon: '🪵', maxLevel: 4, benefitText: '+100 wood cap / level', costForLevel: (l) => ({ food: 30 + l * 20, wood: 50 + l * 30, stone: 18 + l * 10 }) },
  quarry: { label: 'Quarry Depot', icon: '🪨', maxLevel: 4, benefitText: '+95 stone cap / level', costForLevel: (l) => ({ food: 35 + l * 20, wood: 35 + l * 20, stone: 35 + l * 25 }) },
  nursery: { label: 'Nursery', icon: '🥚', maxLevel: 99, benefitText: '+12 worker cap / level, +1 worker training slot / level', costForLevel: (l) => ({ food: 55 + l * 30, wood: 35 + l * 25, stone: 15 + l * 12 }) },
  barracks: { label: 'Barracks', icon: '🏯', maxLevel: 99, benefitText: '+1 simultaneous soldier training / level', costForLevel: (l) => ({ food: 75 + l * 28, wood: 70 + l * 30, stone: 40 + l * 20 }) },
  academy: { label: 'Academy', icon: '📚', maxLevel: 99, benefitText: '+1 simultaneous technology research / level', costForLevel: (l) => ({ food: 80 + l * 30, wood: 60 + l * 28, stone: 55 + l * 24 }) },
  watchtower: { label: 'Watch Tower', icon: '🗼', maxLevel: 5, benefitText: 'Up to 5 assigned scouts detect raids', costForLevel: (l) => ({ food: 70 + l * 35, wood: 60 + l * 40, stone: 45 + l * 25 }) },
  fortifications: { label: 'Fortifications', icon: '🧱', maxLevel: 5, benefitText: '+3% defensive advantage / level', costForLevel: (l) => ({ food: 50 + l * 20, wood: 50 + l * 25, stone: 60 + l * 35 }) },
};

const RESEARCH_TREE = {
  metallurgy: { id: 'metallurgy', label: 'Metallurgy', icon: '🔬', cost: { food: 90, wood: 80, stone: 55, research: 35 }, description: 'All soldiers +0.15 power' },
  cutterDrills: { id: 'cutterDrills', label: 'Cutter Drills', icon: '⚔️', cost: { food: 70, wood: 60, stone: 35, research: 25 }, description: 'Cutter ants +0.35 power' },
  stingerVenom: { id: 'stingerVenom', label: 'Stinger Venom', icon: '🗡️', cost: { food: 70, wood: 65, stone: 35, research: 25 }, description: 'Stinger ants +0.35 power' },
  shieldWall: { id: 'shieldWall', label: 'Shield Wall', icon: '🛡️', cost: { food: 80, wood: 70, stone: 40, research: 30 }, description: 'Shield ants +0.35 power' },
  rapidTraining: { id: 'rapidTraining', label: 'Rapid Training', icon: '🏃', cost: { food: 120, wood: 100, stone: 70, research: 45 }, description: '-25% troop/scout/scientist training time' },
  modularConstruction: { id: 'modularConstruction', label: 'Modular Construction', icon: '🏗️', cost: { food: 120, wood: 110, stone: 80, research: 45 }, description: '-25% building time' },
  fastResearch: { id: 'fastResearch', label: 'Fast Research', icon: '📘', cost: { food: 130, wood: 120, stone: 80, research: 55 }, description: '-25% research time' },
  scoutTraining: { id: 'scoutTraining', label: 'Scout Training', icon: '🧭', cost: { food: 80, wood: 60, stone: 40, research: 30 }, description: '+18% scout success chance' },
  spyNetwork: { id: 'spyNetwork', label: 'Spy Network', icon: '🕸️', cost: { food: 120, wood: 110, stone: 65, research: 55 }, description: '+20% scout success chance' },
};

const canAfford = (resources, cost) => Object.entries(cost).every(([k, v]) => resources[k] >= v);
const payCost = (resources, cost) => Object.entries(cost).reduce((next, [k, v]) => ({ ...next, [k]: next[k] - v }), resources);
const countArmyUnits = (army) => SOLDIER_TYPES.reduce((sum, t) => sum + (army[t] ?? 0), 0);
const sumWorkers = (workers) => WORKER_TYPES.reduce((sum, t) => sum + (workers[t] ?? 0), 0);
const formatArmy = (army) => SOLDIER_TYPES.map((t) => `${TYPE_LABELS[t]}:${army[t] ?? 0}`).join(' | ');
const formatCountdown = (ms) => `${Math.floor(Math.max(0, ms) / 60000)}:${Math.floor((Math.max(0, ms) % 60000) / 1000).toString().padStart(2, '0')}`;
const withMarkup = (cost) => Object.fromEntries(Object.entries(cost).map(([k, v]) => [k, Math.ceil(v * 1.2)]));

const calcArmyPower = (army, enemyArmy, techs) => {
  const base = 1.2 + (techs.includes('metallurgy') ? 0.15 : 0);
  return SOLDIER_TYPES.reduce((total, type) => {
    const advantageBonus = (enemyArmy[TYPE_ADVANTAGE[type]] ?? 0) * 0.08;
    const typeBonus =
      (type === 'cutter' && techs.includes('cutterDrills') ? 0.35 : 0) +
      (type === 'stinger' && techs.includes('stingerVenom') ? 0.35 : 0) +
      (type === 'shield' && techs.includes('shieldWall') ? 0.35 : 0);
    return total + (army[type] ?? 0) * (base + advantageBonus + typeBonus);
  }, 0);
};

const capResources = (values, caps) => ({
  food: Math.min(values.food, caps.food),
  wood: Math.min(values.wood, caps.wood),
  stone: Math.min(values.stone, caps.stone),
  research: values.research,
});

const nowMs = () => Date.now();

const getQueueKey = (job) => {
  if (job.kind === 'worker') return `worker:${job.payload.type}`;
  if (job.kind === 'soldier') return `soldier:${job.payload.type}`;
  if (job.kind === 'building') return `building:${job.payload.id}`;
  if (job.kind === 'tech') return `tech:${job.payload.id}`;
  return job.kind;
};

const getQueueLane = (kind) => {
  if (kind === 'soldier') return 'soldier';
  if (kind === 'building') return 'building';
  if (kind === 'tech') return 'tech';
  if (kind === 'worker' || kind === 'scout' || kind === 'scientist') return 'worker';
  return kind;
};

export default function App() {
  const { width } = useWindowDimensions();
  const isBrowserWide = Platform.OS === 'web' && width >= 900;
  const [resources, setResources] = useState({ food: 160, wood: 160, stone: 120, research: 0 });
  const [workers, setWorkers] = useState({ farmer: 6, woodcutter: 6, miner: 6, builder: 1 });
  const [scientists, setScientists] = useState(1);
  const [workerCap, setWorkerCap] = useState(40);
  const [soldiers, setSoldiers] = useState({ cutter: 3, stinger: 3, shield: 3 });
  const [scouts, setScouts] = useState(2);
  const [watchtowerScouts, setWatchtowerScouts] = useState(0);
  const [techs, setTechs] = useState([]);
  const [buildings, setBuildings] = useState({ granary: 1, lumberyard: 1, quarry: 1, nursery: 1, barracks: 1, academy: 1, watchtower: 0, fortifications: 1 });
  const [resourceCaps, setResourceCaps] = useState({ food: 300, wood: 280, stone: 230 });
  const [colonies, setColonies] = useState(createInitialColonies());
  const [intel, setIntel] = useState({});
  const [colonyLog, setColonyLog] = useState(['Queen: Grow wisely. Enemies grow too.']);
  const [combatLog, setCombatLog] = useState(['Combat reports will appear here.']);
  const [queenAlive, setQueenAlive] = useState(true);
  const [raidPlan, setRaidPlan] = useState(null);
  const [pendingJobs, setPendingJobs] = useState([]);
  const [expeditions, setExpeditions] = useState([]);
  const [expeditionDrafts, setExpeditionDrafts] = useState({});
  const [activeTab, setActiveTab] = useState('overview');

  const totalSoldiers = useMemo(() => countArmyUnits(soldiers), [soldiers]);
  const totalWorkers = useMemo(() => sumWorkers(workers), [workers]);

  const addColonyLog = (m) => setColonyLog((p) => [m, ...p].slice(0, 12));
  const addCombatLog = (m) => setCombatLog((p) => [m, ...p].slice(0, 14));

  const scoutSuccessChance = useMemo(() => {
    let c = 0.5;
    if (techs.includes('scoutTraining')) c += 0.18;
    if (techs.includes('spyNetwork')) c += 0.2;
    return Math.min(0.95, c);
  }, [techs]);

  const defensiveBonus = useMemo(() => 0.05 + buildings.fortifications * 0.03, [buildings.fortifications]);
  const rates = useMemo(
    () => ({
      food: (1 + workers.farmer * 0.6) / 2,
      wood: (1 + workers.woodcutter * 0.55) / 2,
      stone: (0.8 + workers.miner * 0.5) / 2,
      research: (scientists * 0.75) / 2,
    }),
    [workers, scientists]
  );
  const queueCaps = useMemo(
    () => ({
      worker: Math.max(1, buildings.nursery),
      soldier: Math.max(1, buildings.barracks),
      tech: Math.max(1, buildings.academy),
      building: Math.max(1, workers.builder),
    }),
    [buildings.nursery, buildings.barracks, buildings.academy, workers.builder]
  );

  const enqueueJob = (job) => {
    const queueKey = getQueueKey(job);
    const lane = getQueueLane(job.kind);
    const queuedForType = pendingJobs.filter((entry) => entry.queueKey === queueKey).length;
    if (queuedForType >= 10) {
      addColonyLog(`🧾 Queue full for ${job.label} (max 10).`);
      return false;
    }
    const activeInLane = pendingJobs.filter((entry) => getQueueLane(entry.kind) === lane).length;
    const laneCap = queueCaps[lane] ?? 1;
    if (activeInLane >= laneCap) {
      addColonyLog(`⛔ ${lane} queue is full (${activeInLane}/${laneCap}).`);
      return false;
    }
    setPendingJobs((prev) => [
      ...prev,
      {
        ...job,
        queueKey,
        id: `${job.kind}-${nowMs()}-${Math.random()}`,
        startedAt: nowMs(),
        completesAt: nowMs() + job.durationMs,
      },
    ]);
    addColonyLog(`⏳ ${job.label} started (${Math.round(job.durationMs / 1000)}s).`);
    return true;
  };

  useEffect(() => {
    const timer = setInterval(() => {
      if (!queenAlive) return;
      setResources((prev) =>
        capResources(
          {
            food: prev.food + rates.food,
            wood: prev.wood + rates.wood,
            stone: prev.stone + rates.stone,
            research: prev.research + rates.research,
          },
          resourceCaps
        )
      );
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [rates, resourceCaps, queenAlive]);

  useEffect(() => {
    const growth = setInterval(() => {
      setColonies((prev) =>
        prev.map((colony) => ({
          ...colony,
          workers: {
            farmer: colony.workers.farmer + 1,
            woodcutter: colony.workers.woodcutter + 1,
            miner: colony.workers.miner + 1,
            builder: colony.workers.builder + (Math.random() < 0.4 ? 1 : 0),
          },
          scientists: colony.scientists + 1,
          army: {
            cutter: colony.army.cutter + (Math.random() < 0.5 ? 1 : 0),
            stinger: colony.army.stinger + (Math.random() < 0.5 ? 1 : 0),
            shield: colony.army.shield + (Math.random() < 0.5 ? 1 : 0),
          },
          buildings: { ...colony.buildings, fortifications: colony.buildings.fortifications + (Math.random() < 0.45 ? 1 : 0) },
          defense: colony.defense + 2,
          reward: {
            food: colony.reward.food + 10,
            wood: colony.reward.wood + 10,
            stone: colony.reward.stone + 8,
          },
        }))
      );
      addColonyLog('📈 Enemy colonies expanded and became stronger.');
    }, ENEMY_GROWTH_MS);
    return () => clearInterval(growth);
  }, []);

  const scheduleNextRaid = () => {
    if (!queenAlive || colonies.length === 0) {
      setRaidPlan(null);
      return;
    }
    const delay = RAID_MIN_DELAY_MS + Math.floor(Math.random() * (RAID_MAX_DELAY_MS - RAID_MIN_DELAY_MS + 1));
    const attacker = colonies[Math.floor(Math.random() * colonies.length)];
    const sentArmy = SOLDIER_TYPES.reduce((next, type) => {
      const available = attacker.army[type] ?? 0;
      const sent = Math.min(available, Math.max(1, Math.floor(available * 0.6)));
      return { ...next, [type]: sent };
    }, {});
    const attackerDefBonus = 0.05 + (attacker.buildings.fortifications ?? 0) * 0.03;
    const attackPower = calcArmyPower(sentArmy, { cutter: 0, stinger: 0, shield: 0 }, []) * (1 + attackerDefBonus);
    setColonies((prev) =>
      prev.map((colony) =>
        colony.id === attacker.id
          ? {
              ...colony,
              army: SOLDIER_TYPES.reduce(
                (next, type) => ({ ...next, [type]: Math.max(0, colony.army[type] - sentArmy[type]) }),
                {}
              ),
            }
          : colony
      )
    );
    setRaidPlan({
      attackerId: attacker.id,
      attackAt: Date.now() + delay,
      detected: false,
      attackArmy: sentArmy,
      attackPower,
    });
  };

  useEffect(() => {
    if (!raidPlan && queenAlive && colonies.length > 0) scheduleNextRaid();
  }, [raidPlan, queenAlive, colonies.length]);

  const updateBuildingEffects = (next) => {
    setResourceCaps({ food: 190 + next.granary * 110, wood: 180 + next.lumberyard * 100, stone: 150 + next.quarry * 95 });
    setWorkerCap(28 + next.nursery * 12);
    setWatchtowerScouts((prev) => Math.min(prev, Math.min(5, next.watchtower)));
  };

  const trainWorker = (type) => {
    if (totalWorkers >= workerCap) return addColonyLog('🥚 Worker cap reached. Upgrade nursery.');
    const cost = withMarkup({ food: 14 });
    if (!canAfford(resources, cost)) return addColonyLog('❌ Not enough food for worker.');
    setResources((prev) => payCost(prev, cost));
    const baseDuration = 15000;
    const durationMs = techs.includes('rapidTraining') ? Math.round(baseDuration * 0.75) : baseDuration;
    const started = enqueueJob({
      kind: 'worker',
      label: `${WORKER_LABELS[type]}`,
      durationMs,
      payload: { type },
    });
    if (!started) setResources((prev) => ({ ...prev, food: prev.food + cost.food }));
  };

  const trainScientist = () => {
    const cost = withMarkup({ food: 24, wood: 12, stone: 10 });
    if (!canAfford(resources, cost)) return addColonyLog('❌ Not enough resources for scientist.');
    setResources((prev) => payCost(prev, cost));
    const durationMs = techs.includes('rapidTraining') ? Math.round(30000 * 0.75) : 30000;
    const started = enqueueJob({ kind: 'scientist', label: 'Scientist', durationMs, payload: {} });
    if (!started) setResources((prev) => ({ ...prev, food: prev.food + cost.food, wood: prev.wood + cost.wood, stone: prev.stone + cost.stone }));
  };

  const trainScout = () => {
    const cost = withMarkup({ food: 22, wood: 6, stone: 4 });
    if (!canAfford(resources, cost)) return addColonyLog('❌ Not enough resources for scout.');
    setResources((prev) => payCost(prev, cost));
    const durationMs = techs.includes('rapidTraining') ? Math.round(20000 * 0.75) : 20000;
    const started = enqueueJob({ kind: 'scout', label: 'Scout', durationMs, payload: {} });
    if (!started) setResources((prev) => ({ ...prev, food: prev.food + cost.food, wood: prev.wood + cost.wood, stone: prev.stone + cost.stone }));
  };

  const trainSoldier = (type) => {
    const costs = {
      cutter: withMarkup({ food: 18, wood: 8, stone: 5 }),
      stinger: withMarkup({ food: 16, wood: 10, stone: 5 }),
      shield: withMarkup({ food: 20, wood: 12, stone: 8 }),
    };
    if (!canAfford(resources, costs[type])) return addColonyLog(`❌ Not enough resources for ${TYPE_LABELS[type]}.`);
    setResources((prev) => payCost(prev, costs[type]));
    const baseDuration = type === 'shield' ? 60000 : type === 'cutter' ? 50000 : 45000;
    const durationMs = techs.includes('rapidTraining') ? Math.round(baseDuration * 0.75) : baseDuration;
    const started = enqueueJob({ kind: 'soldier', label: TYPE_LABELS[type], durationMs, payload: { type } });
    if (!started) setResources((prev) => ({ ...prev, food: prev.food + costs[type].food, wood: prev.wood + costs[type].wood, stone: prev.stone + costs[type].stone }));
  };

  const researchTech = (id) => {
    const tech = RESEARCH_TREE[id];
    if (!tech || techs.includes(id)) return;
    const cost = withMarkup(tech.cost);
    if (!canAfford(resources, cost)) return addColonyLog(`❌ Need resources + research points for ${tech.label}.`);
    setResources((prev) => payCost(prev, cost));
    const durationMsRaw = Math.min(180000, Math.max(45000, tech.cost.research * 2000));
    const durationMs = techs.includes('fastResearch') ? Math.round(durationMsRaw * 0.75) : durationMsRaw;
    const started = enqueueJob({ kind: 'tech', label: tech.label, durationMs, payload: { id } });
    if (!started) setResources((prev) => ({ ...prev, food: prev.food + cost.food, wood: prev.wood + cost.wood, stone: prev.stone + cost.stone, research: prev.research + cost.research }));
  };

  const upgradeBuilding = (id) => {
    const data = BUILDING_DATA[id];
    const level = buildings[id];
    if (level >= data.maxLevel) return addColonyLog(`${data.icon} ${data.label} at max level.`);
    if (pendingJobs.some((job) => job.kind === 'building' && job.payload?.id === id)) {
      addColonyLog(`⛔ ${data.label} is already being upgraded.`);
      return;
    }
    const cost = withMarkup(data.costForLevel(level + 1));
    if (!canAfford(resources, cost)) return addColonyLog(`❌ Not enough resources for ${data.label}.`);
    setResources((prev) => payCost(prev, cost));
    const durationMsRaw = Math.min(180000, Math.max(30000, (level + 1) * 30000));
    const durationMs = techs.includes('modularConstruction') ? Math.round(durationMsRaw * 0.75) : durationMsRaw;
    const started = enqueueJob({ kind: 'building', label: data.label, durationMs, payload: { id } });
    if (!started) setResources((prev) => ({ ...prev, food: prev.food + cost.food, wood: prev.wood + cost.wood, stone: prev.stone + cost.stone }));
  };

  const assignScoutToWatchtower = () => {
    const limit = Math.min(5, buildings.watchtower);
    if (buildings.watchtower <= 0) return addColonyLog('🗼 Build watch tower first.');
    if (watchtowerScouts >= limit) return addColonyLog(`🗼 Watch tower scout limit: ${limit}.`);
    if (scouts <= 0) return addColonyLog('🕵️ No idle scouts.');
    setScouts((p) => p - 1);
    setWatchtowerScouts((p) => p + 1);
  };

  const unassignScoutFromWatchtower = () => {
    if (watchtowerScouts <= 0) return;
    setScouts((p) => p + 1);
    setWatchtowerScouts((p) => p - 1);
  };

  const applyCasualties = (ratio) => {
    const losses = {};
    SOLDIER_TYPES.forEach((type) => {
      losses[type] = Math.min(soldiers[type], Math.floor(soldiers[type] * ratio));
    });
    setSoldiers((prev) => ({ cutter: prev.cutter - losses.cutter, stinger: prev.stinger - losses.stinger, shield: prev.shield - losses.shield }));
    return losses;
  };

  const scoutColony = (id) => {
    if (scouts <= 0) return addColonyLog('🕵️ No idle scouts.');
    const target = colonies.find((c) => c.id === id);
    if (!target) return;
    setScouts((p) => p - 1);
    if (Math.random() >= scoutSuccessChance) return addColonyLog(`💥 Scout failed at ${target.name}.`);
    setScouts((p) => p + 1);
    setIntel((prev) => ({ ...prev, [id]: { defense: target.defense, army: target.army, workers: target.workers, scientists: target.scientists } }));
    addColonyLog(`✅ Scout report: ${target.name} defense ${target.defense}, army ${formatArmy(target.army)}.`);
  };

  const attackColony = (id) => {
    const target = colonies.find((c) => c.id === id);
    if (!target || totalSoldiers <= 0) return;
    const draft = expeditionDrafts[id] ?? { cutter: 0, stinger: 0, shield: 0 };
    const sentArmy = SOLDIER_TYPES.reduce(
      (next, type) => ({ ...next, [type]: Math.max(0, Math.min(soldiers[type], draft[type] ?? 0)) }),
      {}
    );
    if (countArmyUnits(sentArmy) <= 0) {
      addColonyLog('⚠️ Select at least one troop to launch expedition.');
      return;
    }
    setSoldiers((prev) =>
      SOLDIER_TYPES.reduce((next, type) => ({ ...next, [type]: Math.max(0, prev[type] - sentArmy[type]) }), {})
    );
    setExpeditions((prev) => [
      ...prev,
      {
        id: `exp-${nowMs()}`,
        targetId: id,
        sentArmy,
        startedAt: nowMs(),
        durationMs: 30000,
        resolvesAt: nowMs() + 30000,
      },
    ]);
    setExpeditionDrafts((prev) => ({ ...prev, [id]: { cutter: 0, stinger: 0, shield: 0 } }));
    addCombatLog(`🚶 Expedition sent to ${target.name}. Army detached from colony for 30s.`);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const now = nowMs();
      setPendingJobs((prev) => {
        const done = prev.filter((job) => job.completesAt <= now);
        if (done.length === 0) return prev;
        done.forEach((job) => {
          if (job.kind === 'worker') {
            setWorkers((w) => ({ ...w, [job.payload.type]: w[job.payload.type] + 1 }));
            addColonyLog(`${WORKER_ICONS[job.payload.type]} ${WORKER_LABELS[job.payload.type]} ready.`);
          } else if (job.kind === 'scientist') {
            setScientists((s) => s + 1);
            addColonyLog('🧪 Scientist ready.');
          } else if (job.kind === 'scout') {
            setScouts((s) => s + 1);
            addColonyLog('🕵️ Scout ready.');
          } else if (job.kind === 'soldier') {
            setSoldiers((army) => ({ ...army, [job.payload.type]: army[job.payload.type] + 1 }));
            addColonyLog(`${TYPE_ICONS[job.payload.type]} ${TYPE_LABELS[job.payload.type]} ready.`);
          } else if (job.kind === 'tech') {
            setTechs((t) => [...t, job.payload.id]);
            addColonyLog(`🔬 ${RESEARCH_TREE[job.payload.id].label} completed.`);
          } else if (job.kind === 'building') {
            setBuildings((b) => {
              const next = { ...b, [job.payload.id]: b[job.payload.id] + 1 };
              updateBuildingEffects(next);
              return next;
            });
            addColonyLog(`🏗️ ${BUILDING_DATA[job.payload.id].label} upgrade completed.`);
          }
        });
        return prev.filter((job) => job.completesAt > now);
      });

      setExpeditions((prev) => {
        const resolving = prev.filter((e) => e.resolvesAt <= now);
        if (resolving.length === 0) return prev;
        resolving.forEach((exp) => {
          const target = colonies.find((c) => c.id === exp.targetId);
          if (!target) {
            setSoldiers((army) => SOLDIER_TYPES.reduce((next, type) => ({ ...next, [type]: army[type] + exp.sentArmy[type] }), {}));
            return;
          }
          const enemyDefBonus = 0.05 + (target.buildings.fortifications ?? 0) * 0.03;
          const ourPower = calcArmyPower(exp.sentArmy, target.army, techs);
          const enemyPower = calcArmyPower(target.army, exp.sentArmy, []) * (1 + enemyDefBonus);
          if (ourPower >= enemyPower) {
            const lossRatio = Math.min(0.8, (enemyPower / Math.max(1, ourPower)) * 0.35);
            const survivors = SOLDIER_TYPES.reduce((next, type) => ({ ...next, [type]: Math.max(0, exp.sentArmy[type] - Math.floor(exp.sentArmy[type] * lossRatio)) }), {});
            setSoldiers((army) => SOLDIER_TYPES.reduce((next, type) => ({ ...next, [type]: army[type] + survivors[type] }), {}));
            setResources((r) => capResources({ food: r.food + target.reward.food, wood: r.wood + target.reward.wood, stone: r.stone + target.reward.stone, research: r.research }, resourceCaps));
            setColonies((c) => c.filter((col) => col.id !== exp.targetId));
            addCombatLog(`🏆 Expedition won at ${target.name}. Surviving troops returned.`);
          } else {
            const survivors = SOLDIER_TYPES.reduce((next, type) => ({ ...next, [type]: Math.max(0, exp.sentArmy[type] - Math.floor(exp.sentArmy[type] * 0.8)) }), {});
            setSoldiers((army) => SOLDIER_TYPES.reduce((next, type) => ({ ...next, [type]: army[type] + survivors[type] }), {}));
            addCombatLog(`💀 Expedition failed at ${target.name}. Few troops returned.`);
          }
        });
        return prev.filter((e) => e.resolvesAt > now);
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [colonies, techs, resourceCaps]);

  const enemyAttack = (attackerId, attackArmy) => {
    const attacker = colonies.find((c) => c.id === attackerId);
    if (!attacker) return;
    const enemyDefBonus = 0.05 + (attacker.buildings.fortifications ?? 0) * 0.03;
    const raidArmy = attackArmy ?? attacker.army;
    const ourPower = (calcArmyPower(soldiers, raidArmy, techs) + totalWorkers * 0.2) * (1 + defensiveBonus);
    const enemyPower = calcArmyPower(raidArmy, soldiers, []) * (1 + enemyDefBonus);
    addCombatLog(`⚠️ Raid ${attacker.name}: Our ${ourPower.toFixed(1)} vs Enemy ${enemyPower.toFixed(1)} | Our def ${(defensiveBonus * 100).toFixed(1)}%.`);

    if (ourPower >= enemyPower) {
      const ratio = Math.min(0.7, (enemyPower / Math.max(1, ourPower)) * 0.25);
      const losses = applyCasualties(ratio);
      addCombatLog(`🛡️ Defended raid. Soldier losses C:${losses.cutter} S:${losses.stinger} D:${losses.shield}.`);
      return;
    }

    const ratio = Math.min(1, (enemyPower / Math.max(1, ourPower)) * 0.4);
    const losses = applyCasualties(ratio);
    const workerLosses = Math.min(totalWorkers, Math.max(1, Math.floor(enemyPower / 9)));
    const split = { farmer: 0, woodcutter: 0, miner: 0 };
    let remaining = workerLosses;
    WORKER_TYPES.forEach((type) => {
      const hit = Math.min(workers[type], Math.ceil(remaining / (WORKER_TYPES.length - WORKER_TYPES.indexOf(type))));
      split[type] = hit;
      remaining -= hit;
    });
    setWorkers((prev) => ({ farmer: Math.max(0, prev.farmer - split.farmer), woodcutter: Math.max(0, prev.woodcutter - split.woodcutter), miner: Math.max(0, prev.miner - split.miner) }));

    let stolen = { food: 0, wood: 0, stone: 0 };
    setResources((prev) => {
      stolen = { food: Math.min(prev.food, Math.floor(prev.food * 0.2)), wood: Math.min(prev.wood, Math.floor(prev.wood * 0.2)), stone: Math.min(prev.stone, Math.floor(prev.stone * 0.2)) };
      return { ...prev, food: prev.food - stolen.food, wood: prev.wood - stolen.wood, stone: prev.stone - stolen.stone };
    });

    addCombatLog(`🔥 Defense failed. Soldiers lost C:${losses.cutter} S:${losses.stinger} D:${losses.shield}. Workers lost ${workerLosses}. Stolen ${stolen.food}F/${stolen.wood}W/${stolen.stone}S.`);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      if (!raidPlan || !queenAlive || colonies.length === 0) return;
      const remaining = raidPlan.attackAt - Date.now();
      if (remaining <= 0) {
        enemyAttack(raidPlan.attackerId, raidPlan.attackArmy);
        scheduleNextRaid();
        return;
      }
      if (!raidPlan.detected && buildings.watchtower > 0 && watchtowerScouts > 0) {
        const detectionWindowMs = watchtowerScouts * 60000;
        if (remaining <= detectionWindowMs) {
          setRaidPlan((prev) => (prev ? { ...prev, detected: true } : prev));
          const a = colonies.find((c) => c.id === raidPlan.attackerId);
          if (a) addCombatLog(`👁️ Watch tower alert: ${a.name} incoming with ${formatArmy(raidPlan.attackArmy ?? a.army)} (Attack power ${(raidPlan.attackPower ?? 0).toFixed(1)}).`);
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [raidPlan, colonies, queenAlive, buildings.watchtower, watchtowerScouts, workers, soldiers, techs, defensiveBonus]);

  useEffect(() => {
    if (queenAlive && totalWorkers <= 0 && totalSoldiers <= 0) {
      setQueenAlive(false);
      addCombatLog('👑 All workers and soldiers lost. The queen has fallen.');
    }
  }, [totalWorkers, totalSoldiers, queenAlive]);

  const incomingRaid = raidPlan ? colonies.find((c) => c.id === raidPlan.attackerId) : null;
  const adjustExpeditionDraft = (colonyId, type, delta) => {
    setExpeditionDrafts((prev) => {
      const current = prev[colonyId] ?? { cutter: 0, stinger: 0, shield: 0 };
      const nextValue = Math.max(0, Math.min(soldiers[type], current[type] + delta));
      return { ...prev, [colonyId]: { ...current, [type]: nextValue } };
    });
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>🐜 Ant Colony Commander</Text>
        <Text style={styles.subtitle}>Enemies start at your level and now evolve over time.</Text>

        {raidPlan?.detected && incomingRaid ? (
          <View style={styles.raidPopup}>
            <Text style={styles.raidPopupTitle}>🚨 Incoming Raid Detected</Text>
            <Text style={styles.raidPopupText}>{incomingRaid.name} arrives in {formatCountdown(raidPlan.attackAt - Date.now())}</Text>
            <Text style={styles.raidPopupText}>Army: {formatArmy(raidPlan.attackArmy ?? incomingRaid.army)} | Attack power {(raidPlan.attackPower ?? 0).toFixed(1)}</Text>
          </View>
        ) : null}

        <View style={[styles.statusRow, isBrowserWide && styles.statusRowWide]}>
          <View style={[styles.panel, styles.statusPanel]}>
            <Text style={styles.panelTitle}>Colony Status</Text>
            <Text style={styles.metric}>🍖 Food: {Math.floor(resources.food)} / {resourceCaps.food} (+{rates.food.toFixed(1)}/s)</Text>
            <Text style={styles.metric}>🪵 Wood: {Math.floor(resources.wood)} / {resourceCaps.wood} (+{rates.wood.toFixed(1)}/s)</Text>
            <Text style={styles.metric}>🪨 Stone: {Math.floor(resources.stone)} / {resourceCaps.stone} (+{rates.stone.toFixed(1)}/s)</Text>
            <Text style={styles.metric}>🧪 Research Points: {Math.floor(resources.research)} (+{rates.research.toFixed(1)}/s)</Text>
            <Text style={styles.metric}>🌾 Farmers: {workers.farmer} | 🪵 Woodcutters: {workers.woodcutter} | ⛏️ Miners: {workers.miner} | 🧱 Builders: {workers.builder}</Text>
            <Text style={styles.metric}>🧪 Scientists: {scientists}</Text>
            <Text style={styles.metric}>⚔️ Soldiers: {totalSoldiers} ({soldiers.cutter}/{soldiers.stinger}/{soldiers.shield})</Text>
            <Text style={styles.metric}>🛡️ Defensive advantage: {(defensiveBonus * 100).toFixed(1)}%</Text>
            <Text style={styles.techDesc}>Queue slots → Workers {queueCaps.worker}, Soldiers {queueCaps.soldier}, Tech {queueCaps.tech}, Buildings {queueCaps.building}</Text>
            {!queenAlive && <Text style={styles.defeat}>☠️ Game Over</Text>}
          </View>

          <View style={[styles.panel, styles.progressPanel]}>
            <Text style={styles.panelTitle}>In Progress</Text>
            <ScrollView style={styles.progressScroll}>
              {pendingJobs.length === 0 && expeditions.length === 0 ? (
                <Text style={styles.techDesc}>No active jobs or expeditions.</Text>
              ) : (
                <>
                  {['worker', 'soldier', 'tech', 'building'].map((lane) => {
                    const laneJobs = pendingJobs.filter((job) => getQueueLane(job.kind) === lane);
                    if (laneJobs.length === 0) return null;
                    return (
                      <Text key={`lane-${lane}`} style={styles.metric}>
                        {lane.toUpperCase()} ({laneJobs.length}/{queueCaps[lane] ?? 1})
                      </Text>
                    );
                  })}
                  {pendingJobs.map((job) => {
                    const total = Math.max(1, job.completesAt - job.startedAt);
                    const elapsed = Math.max(0, Date.now() - job.startedAt);
                    const progress = Math.max(0, Math.min(1, elapsed / total));
                    return (
                      <View key={job.id} style={styles.progressRow}>
                        <Text style={styles.techDesc}>⏳ {job.label} ({Math.round(progress * 100)}%)</Text>
                        <View style={styles.progressTrack}>
                          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                        </View>
                      </View>
                    );
                  })}
                  {expeditions.map((exp) => {
                    const total = Math.max(1, exp.durationMs ?? exp.resolvesAt - exp.startedAt);
                    const elapsed = Math.max(0, Date.now() - exp.startedAt);
                    const progress = Math.max(0, Math.min(1, elapsed / total));
                    return (
                      <View key={exp.id} style={styles.progressRow}>
                        <Text style={styles.techDesc}>⚔️ Expedition ({Math.round(progress * 100)}%)</Text>
                        <View style={styles.progressTrack}>
                          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                        </View>
                      </View>
                    );
                  })}
                </>
              )}
            </ScrollView>
          </View>
        </View>

        <View style={styles.tabRow}>
          {TABS.map((tab) => (
            <Pressable key={tab} style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]} onPress={() => setActiveTab(tab)}>
              <Text style={styles.buttonText}>{tab.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>

        {activeTab === 'overview' && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Overview</Text>
            {Object.entries(BUILDING_DATA).map(([id, data]) => (
              <Text key={id} style={styles.metric}>{data.icon} {data.label} Lv {buildings[id]}</Text>
            ))}
            <Text style={styles.techDesc}>Active jobs: {pendingJobs.length}</Text>
            {pendingJobs.slice(0, 4).map((job) => (
              <Text key={job.id} style={styles.techDesc}>⏳ {job.label} - {formatCountdown(job.completesAt - nowMs())}</Text>
            ))}
            <Text style={styles.techDesc}>Active expeditions: {expeditions.length}</Text>
          </View>
        )}

        {activeTab === 'units' && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Units</Text>
            <View style={styles.rowWrap}>
              {WORKER_TYPES.map((type) => (
                <ActionButton key={type} compact label={`${WORKER_ICONS[type]} ${WORKER_LABELS[type]}`} subLabel="(17F)" onPress={() => trainWorker(type)} disabled={!queenAlive} />
              ))}
              <ActionButton compact label="🧪 Scientist" subLabel="(29F/15W/12S)" onPress={trainScientist} disabled={!queenAlive} />
              <ActionButton compact label="🕵️ Scout" subLabel="(27F/8W/5S)" onPress={trainScout} disabled={!queenAlive} />
            </View>
            <View style={styles.rowWrap}>
              {SOLDIER_TYPES.map((type) => (
                <ActionButton key={type} compact label={`${TYPE_ICONS[type]} ${TYPE_LABELS[type]}`} subLabel={type === 'cutter' ? '(22F/10W/6S)' : type === 'stinger' ? '(20F/12W/6S)' : '(24F/15W/10S)'} onPress={() => trainSoldier(type)} disabled={!queenAlive} />
              ))}
            </View>
          </View>
        )}

        {activeTab === 'buildings' && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Buildings</Text>
            {Object.entries(BUILDING_DATA).map(([id, data]) => {
              const level = buildings[id];
              const maxed = level >= data.maxLevel;
              const cost = withMarkup(data.costForLevel(level + 1));
              const actionLabel =
                id === 'watchtower' && level === 0
                  ? `${data.icon} Build ${data.label}`
                  : `${data.icon} Upgrade ${data.label} (Lv ${level}/${data.maxLevel})`;
              return (
                <Pressable key={id} style={[styles.techBtn, maxed && styles.techDone]} onPress={() => upgradeBuilding(id)}>
                  <Text style={styles.buttonText}>{actionLabel}</Text>
                  <Text style={styles.techDesc}>{maxed ? 'Max level reached' : `Cost ${cost.food}F/${cost.wood}W/${cost.stone}S • ${data.benefitText}`}</Text>
                </Pressable>
              );
            })}
            <View style={styles.row}>
              <ActionButton compact label="➕ Assign Scout" onPress={assignScoutToWatchtower} disabled={!queenAlive} />
              <ActionButton compact label="➖ Recall Scout" onPress={unassignScoutFromWatchtower} disabled={!queenAlive} />
            </View>
            <Text style={styles.techDesc}>Watch tower scouts: {watchtowerScouts}/{Math.min(5, buildings.watchtower)}</Text>
          </View>
        )}

        {activeTab === 'technology' && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Technology</Text>
            {Object.values(RESEARCH_TREE).map((tech) => {
              const complete = techs.includes(tech.id);
              const cost = withMarkup(tech.cost);
              return (
                <Pressable key={tech.id} style={[styles.techBtn, complete && styles.techDone]} onPress={() => researchTech(tech.id)}>
                  <Text style={styles.buttonText}>{tech.icon} {tech.label} ({cost.food}F/{cost.wood}W/{cost.stone}S/{cost.research}RP)</Text>
                  <Text style={styles.techDesc}>{complete ? 'Completed' : tech.description}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {activeTab === 'enemies' && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Enemies</Text>
            {colonies.map((colony) => {
              const report = intel[colony.id];
              return (
                <View key={colony.id} style={styles.enemyCard}>
                  <Text style={styles.metric}>🏰 {colony.name}</Text>
                  <Text style={styles.techDesc}>Defense: {report ? report.defense : 'Unknown'}</Text>
                  <Text style={styles.techDesc}>Army: {report ? formatArmy(report.army) : 'Unknown'}</Text>
                  <Text style={styles.techDesc}>Growth: Workers {sumWorkers(colony.workers)} | Scientists {colony.scientists}</Text>
                  <Text style={styles.techDesc}>Detach troops for this expedition:</Text>
                  {SOLDIER_TYPES.map((type) => {
                    const draft = expeditionDrafts[colony.id]?.[type] ?? 0;
                    return (
                      <View key={`${colony.id}-${type}`} style={styles.row}>
                        <Text style={styles.techDesc}>{TYPE_LABELS[type]}: {draft}</Text>
                        <ActionButton compact label="➖" onPress={() => adjustExpeditionDraft(colony.id, type, -1)} disabled={!queenAlive} />
                        <ActionButton compact label="➕" onPress={() => adjustExpeditionDraft(colony.id, type, 1)} disabled={!queenAlive} />
                      </View>
                    );
                  })}
                  <View style={styles.row}>
                    <ActionButton compact label="🧭 Scout" onPress={() => scoutColony(colony.id)} disabled={!queenAlive} />
                    <ActionButton compact label="⚔️ Attack" onPress={() => attackColony(colony.id)} disabled={!queenAlive} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.panel}><Text style={styles.panelTitle}>Combat Log</Text>{combatLog.map((e, i) => <Text key={`c-${i}`} style={styles.logItem}>• {e}</Text>)}</View>
        <View style={styles.panel}><Text style={styles.panelTitle}>Colony Log</Text>{colonyLog.map((e, i) => <Text key={`l-${i}`} style={styles.logItem}>• {e}</Text>)}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionButton({ label, subLabel, onPress, disabled, compact }) {
  return (
    <Pressable
      style={[styles.actionBtn, compact && styles.actionBtnCompact, disabled && styles.btnDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      accessibilityHint={subLabel ? `Info: ${subLabel}` : 'Tap to execute this action.'}
    >
      <Text style={styles.buttonText}>{label}</Text>
      {subLabel ? <Text style={styles.subButtonText}>{subLabel}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#101915' },
  container: { padding: 16, paddingBottom: 32, gap: 12 },
  title: { color: '#effbee', fontSize: 30, fontWeight: '700', textAlign: 'center' },
  subtitle: { color: '#aac8af', textAlign: 'center', marginBottom: 4 },
  raidPopup: { alignSelf: 'center', backgroundColor: '#8d2d2d', borderColor: '#d57171', borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, minWidth: '88%' },
  raidPopupTitle: { color: '#ffe9e9', fontWeight: '700', textAlign: 'center' },
  raidPopupText: { color: '#ffe9e9', textAlign: 'center', fontSize: 12 },
  panel: { backgroundColor: '#1a2a24', borderWidth: 1, borderColor: '#2d453b', borderRadius: 12, padding: 12, gap: 6 },
  statusRow: { gap: 12 },
  statusRowWide: { flexDirection: 'row', alignItems: 'stretch' },
  statusPanel: { flex: 1 },
  progressPanel: { flex: 1, minHeight: 230, maxHeight: 230 },
  progressScroll: { flex: 1 },
  panelTitle: { color: '#dcf2e0', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  metric: { color: '#e3f1e6', fontSize: 15 },
  row: { flexDirection: 'row', gap: 8 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tabButton: { backgroundColor: '#2f5343', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  tabButtonActive: { backgroundColor: '#4e7d67' },
  actionBtn: { flex: 1, backgroundColor: '#466f5c', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center' },
  actionBtnCompact: { flex: 0, minWidth: 118 },
  btnDisabled: { opacity: 0.55 },
  subButtonText: { color: '#ddf5e2', fontSize: 11, marginTop: 2 },
  techBtn: { backgroundColor: '#365746', borderRadius: 10, padding: 10, marginBottom: 6 },
  techDone: { opacity: 0.6 },
  techDesc: { color: '#cbe4d0', marginTop: 2, fontSize: 12 },
  progressRow: { gap: 4, marginBottom: 6 },
  progressTrack: { height: 8, backgroundColor: '#2d453b', borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: '#6ecf9c' },
  defeat: { color: '#ffb1b1', fontSize: 15, fontWeight: '700' },
  enemyCard: { backgroundColor: '#2a3f34', borderRadius: 10, padding: 9, marginBottom: 8, gap: 4 },
  logItem: { color: '#d7ebdb', fontSize: 13 },
});
