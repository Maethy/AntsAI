import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const TICK_MS = 1000;
const ENEMY_ATTACK_MS = 18000;
const SOLDIER_TYPES = ['cutter', 'stinger', 'shield'];
const TYPE_LABELS = {
  cutter: 'Cutter',
  stinger: 'Stinger',
  shield: 'Shield',
};
const TYPE_ICONS = {
  cutter: '⚔️',
  stinger: '🗡️',
  shield: '🛡️',
};
const TYPE_ADVANTAGE = {
  cutter: 'shield',
  shield: 'stinger',
  stinger: 'cutter',
};

const INITIAL_COLONIES = [
  {
    id: 'red',
    name: 'Crimson Nest',
    defense: 25,
    reward: { food: 100, wood: 70 },
    army: { cutter: 7, stinger: 5, shield: 6 },
  },
  {
    id: 'blue',
    name: 'Azure Nest',
    defense: 35,
    reward: { food: 130, wood: 100 },
    army: { cutter: 9, stinger: 8, shield: 8 },
  },
  {
    id: 'gold',
    name: 'Golden Nest',
    defense: 50,
    reward: { food: 180, wood: 130 },
    army: { cutter: 11, stinger: 12, shield: 10 },
  },
];

const BUILDING_DATA = {
  granary: {
    label: 'Granary',
    icon: '🏚️',
    maxLevel: 4,
    benefitText: '+110 food storage / level',
    costForLevel: (level) => ({ food: 40 + level * 30, wood: 45 + level * 35 }),
  },
  lumberyard: {
    label: 'Lumberyard',
    icon: '🪵',
    maxLevel: 4,
    benefitText: '+90 wood storage / level',
    costForLevel: (level) => ({ food: 30 + level * 25, wood: 50 + level * 35 }),
  },
  nursery: {
    label: 'Nursery',
    icon: '🥚',
    maxLevel: 4,
    benefitText: '+12 worker cap / level',
    costForLevel: (level) => ({ food: 55 + level * 30, wood: 35 + level * 25 }),
  },
};

const RESEARCH_TREE = {
  metallurgy: {
    id: 'metallurgy',
    label: 'Metallurgy',
    icon: '🔬',
    cost: { food: 90, wood: 80 },
    description: 'Soldiers gain +0.25 base power',
  },
  scoutTraining: {
    id: 'scoutTraining',
    label: 'Scout Training',
    icon: '🧭',
    cost: { food: 80, wood: 60 },
    description: '+18% scout success chance',
  },
  spyNetwork: {
    id: 'spyNetwork',
    label: 'Spy Network',
    icon: '🕸️',
    cost: { food: 120, wood: 110 },
    description: '+20% scout success chance',
  },
};

const canAfford = (resources, cost) =>
  Object.entries(cost).every(([key, value]) => resources[key] >= value);

const payCost = (resources, cost) =>
  Object.entries(cost).reduce(
    (next, [key, value]) => ({ ...next, [key]: next[key] - value }),
    resources
  );

const sumArmy = (army) => SOLDIER_TYPES.reduce((sum, type) => sum + (army[type] ?? 0), 0);

const calcArmyPower = (army, enemyArmy, techs) => {
  const basePower = 1.2 + (techs.includes('metallurgy') ? 0.25 : 0);
  return SOLDIER_TYPES.reduce((total, type) => {
    const count = army[type] ?? 0;
    const target = TYPE_ADVANTAGE[type];
    const bonus = (enemyArmy[target] ?? 0) * 0.08;
    return total + count * (basePower + bonus);
  }, 0);
};

const capResources = (values, caps) => ({
  food: Math.min(values.food, caps.food),
  wood: Math.min(values.wood, caps.wood),
});

const trimArmy = (army) =>
  SOLDIER_TYPES.reduce((next, type) => ({ ...next, [type]: Math.max(0, army[type] ?? 0) }), {});

export default function App() {
  const [resources, setResources] = useState({ food: 140, wood: 130 });
  const [workers, setWorkers] = useState(18);
  const [workerCap, setWorkerCap] = useState(40);
  const [soldiers, setSoldiers] = useState({ cutter: 3, stinger: 3, shield: 3 });
  const [scouts, setScouts] = useState(1);
  const [techs, setTechs] = useState([]);
  const [buildings, setBuildings] = useState({ granary: 1, lumberyard: 1, nursery: 1 });
  const [resourceCaps, setResourceCaps] = useState({ food: 280, wood: 240 });
  const [colonies, setColonies] = useState(INITIAL_COLONIES);
  const [intel, setIntel] = useState({});
  const [log, setLog] = useState(['Queen: Build, scout, and defend the nest.']);
  const [queenAlive, setQueenAlive] = useState(true);

  const totalSoldiers = useMemo(() => sumArmy(soldiers), [soldiers]);

  const scoutSuccessChance = useMemo(() => {
    let chance = 0.5;
    if (techs.includes('scoutTraining')) chance += 0.18;
    if (techs.includes('spyNetwork')) chance += 0.2;
    return Math.min(0.95, chance);
  }, [techs]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!queenAlive) return;
      const foodGain = 2 + workers * 0.45;
      const woodGain = 1 + workers * 0.3;
      setResources((prev) => capResources({ food: prev.food + foodGain, wood: prev.wood + woodGain }, resourceCaps));
    }, TICK_MS);

    return () => clearInterval(timer);
  }, [workers, resourceCaps, queenAlive]);

  useEffect(() => {
    const enemyTimer = setInterval(() => {
      if (!queenAlive || colonies.length === 0) return;
      enemyAttack();
    }, ENEMY_ATTACK_MS);

    return () => clearInterval(enemyTimer);
  });

  const addLog = (message) => {
    setLog((prev) => [message, ...prev].slice(0, 10));
  };

  const updateBuildingEffects = (nextBuildings) => {
    setResourceCaps({
      food: 170 + nextBuildings.granary * 110,
      wood: 150 + nextBuildings.lumberyard * 90,
    });
    setWorkerCap(28 + nextBuildings.nursery * 12);
  };

  const trainWorker = () => {
    const cost = { food: 14 };
    if (workers >= workerCap) {
      addLog('🥚 Nursery full. Upgrade the nursery to raise worker cap.');
      return;
    }
    if (!canAfford(resources, cost)) {
      addLog('❌ Not enough food to hatch a worker (cost: 14 food).');
      return;
    }

    setResources((prev) => payCost(prev, cost));
    setWorkers((prev) => prev + 1);
    addLog('👷 Worker hatched. More workers gather resources faster.');
  };

  const trainSoldier = (type) => {
    const costs = {
      cutter: { food: 18, wood: 8 },
      stinger: { food: 16, wood: 10 },
      shield: { food: 20, wood: 12 },
    };
    const cost = costs[type];
    if (!canAfford(resources, cost)) {
      addLog(`❌ Not enough resources for ${TYPE_LABELS[type]} (cost: ${cost.food}F/${cost.wood}W).`);
      return;
    }

    setResources((prev) => payCost(prev, cost));
    setSoldiers((prev) => ({ ...prev, [type]: prev[type] + 1 }));
    addLog(`${TYPE_ICONS[type]} ${TYPE_LABELS[type]} trained.`);
  };

  const trainScout = () => {
    const cost = { food: 22, wood: 6 };
    if (!canAfford(resources, cost)) {
      addLog('❌ Not enough resources for scout (cost: 22F/6W).');
      return;
    }

    setResources((prev) => payCost(prev, cost));
    setScouts((prev) => prev + 1);
    addLog('🕵️ Scout ant prepared for reconnaissance.');
  };

  const researchTech = (techId) => {
    const tech = RESEARCH_TREE[techId];
    if (!tech || techs.includes(techId)) return;

    if (!canAfford(resources, tech.cost)) {
      addLog(`❌ Not enough resources for ${tech.label}.`);
      return;
    }

    setResources((prev) => payCost(prev, tech.cost));
    setTechs((prev) => [...prev, techId]);
    addLog(`${tech.icon} Research complete: ${tech.label}.`);
  };

  const upgradeBuilding = (buildingId) => {
    const building = BUILDING_DATA[buildingId];
    if (!building) return;

    const level = buildings[buildingId];
    if (level >= building.maxLevel) {
      addLog(`${building.icon} ${building.label} is already at max level.`);
      return;
    }

    const cost = building.costForLevel(level + 1);
    if (!canAfford(resources, cost)) {
      addLog(`❌ Not enough resources for ${building.label} upgrade.`);
      return;
    }

    setResources((prev) => payCost(prev, cost));
    setBuildings((prev) => {
      const next = { ...prev, [buildingId]: prev[buildingId] + 1 };
      updateBuildingEffects(next);
      return next;
    });

    addLog(`${building.icon} Upgraded ${building.label} to level ${level + 1}.`);
  };

  const applyCasualties = (ratio) => {
    const casualties = SOLDIER_TYPES.reduce((next, type) => {
      const current = soldiers[type];
      const loss = Math.min(current, Math.max(0, Math.floor(current * ratio)));
      return { ...next, [type]: loss };
    }, {});

    const nextArmy = SOLDIER_TYPES.reduce(
      (next, type) => ({ ...next, [type]: soldiers[type] - casualties[type] }),
      {}
    );

    setSoldiers(trimArmy(nextArmy));
    return casualties;
  };

  const scoutColony = (colonyId) => {
    if (scouts <= 0) {
      addLog('🕵️ No idle scouts. Train a scout ant first.');
      return;
    }

    const target = colonies.find((colony) => colony.id === colonyId);
    if (!target) return;

    setScouts((prev) => prev - 1);
    const success = Math.random() < scoutSuccessChance;

    if (!success) {
      addLog(`💥 Scout failed at ${target.name}. The ant was lost.`);
      return;
    }

    setScouts((prev) => prev + 1);
    setIntel((prev) => ({
      ...prev,
      [colonyId]: {
        defense: target.defense,
        army: target.army,
        lastSeen: Date.now(),
      },
    }));
    addLog(`✅ Scout report from ${target.name}: defense ${target.defense} confirmed.`);
  };

  const attackColony = (colonyId) => {
    const colony = colonies.find((entry) => entry.id === colonyId);
    if (!colony || totalSoldiers <= 0) {
      addLog('⚠️ No soldiers available for attack.');
      return;
    }

    const playerPower = calcArmyPower(soldiers, colony.army, techs);
    const enemyPower = calcArmyPower(colony.army, soldiers, []) + colony.defense;

    if (playerPower >= enemyPower) {
      const casualtyRatio = Math.min(0.8, enemyPower / Math.max(1, playerPower) * 0.35);
      const casualties = applyCasualties(casualtyRatio);
      const totalLosses = sumArmy(casualties);
      setResources((prev) =>
        capResources(
          { food: prev.food + colony.reward.food, wood: prev.wood + colony.reward.wood },
          resourceCaps
        )
      );
      setColonies((prev) => prev.filter((entry) => entry.id !== colonyId));
      addLog(
        `🏆 Victory at ${colony.name}. Lost ${totalLosses} soldiers, gained ${colony.reward.food}F/${colony.reward.wood}W.`
      );
      return;
    }

    const casualtyRatio = Math.min(1, enemyPower / Math.max(1, playerPower) * 0.45);
    const casualties = applyCasualties(casualtyRatio);
    addLog(`💀 Defeat at ${colony.name}. Lost ${sumArmy(casualties)} soldiers.`);
  };

  const enemyAttack = () => {
    const attacker = colonies[Math.floor(Math.random() * colonies.length)];
    if (!attacker) return;

    const playerDefense = calcArmyPower(soldiers, attacker.army, techs) + workers * 0.35;
    const attackerPower = calcArmyPower(attacker.army, soldiers, []) + attacker.defense * 0.5;

    if (playerDefense >= attackerPower) {
      const soldierLossRatio = Math.min(0.7, attackerPower / Math.max(1, playerDefense) * 0.25);
      const losses = applyCasualties(soldierLossRatio);
      addLog(`🛡️ Defended against ${attacker.name}. Lost ${sumArmy(losses)} soldiers.`);
      return;
    }

    const soldierLossRatio = Math.min(1, attackerPower / Math.max(1, playerDefense) * 0.4);
    const losses = applyCasualties(soldierLossRatio);
    const workerLosses = Math.min(workers, Math.max(1, Math.floor(attackerPower / 10)));
    const stolenFood = Math.min(resources.food, Math.floor(resources.food * 0.2));
    const stolenWood = Math.min(resources.wood, Math.floor(resources.wood * 0.2));

    setWorkers((prev) => Math.max(0, prev - workerLosses));
    setResources((prev) => ({ food: prev.food - stolenFood, wood: prev.wood - stolenWood }));

    const buildingIds = Object.keys(buildings);
    const damagedId = buildingIds[Math.floor(Math.random() * buildingIds.length)];
    if (buildings[damagedId] > 1) {
      const nextBuildings = { ...buildings, [damagedId]: buildings[damagedId] - 1 };
      setBuildings(nextBuildings);
      updateBuildingEffects(nextBuildings);
      addLog(
        `🔥 ${attacker.name} raided us! Lost ${sumArmy(losses)} soldiers, ${workerLosses} workers, ${stolenFood}F/${stolenWood}W, and ${BUILDING_DATA[damagedId].label} was damaged.`
      );
    } else {
      addLog(
        `🔥 ${attacker.name} raided us! Lost ${sumArmy(losses)} soldiers, ${workerLosses} workers, and ${stolenFood}F/${stolenWood}W.`
      );
    }
  };

  useEffect(() => {
    if (queenAlive && workers <= 0 && totalSoldiers <= 0) {
      setQueenAlive(false);
      addLog('👑 The queen has fallen. Your colony is lost.');
    }
  }, [workers, totalSoldiers, queenAlive]);

  const wonGame = colonies.length === 0;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>🐜 Ant Colony Commander</Text>
        <Text style={styles.subtitle}>
          Workers scale resource income, storage comes from buildings, and scouting reveals enemy defenses.
        </Text>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Colony Status</Text>
          <Text style={styles.metric}>🍖 Food: {Math.floor(resources.food)} / {resourceCaps.food}</Text>
          <Text style={styles.metric}>🪵 Wood: {Math.floor(resources.wood)} / {resourceCaps.wood}</Text>
          <Text style={styles.metric}>👷 Workers: {workers} / {workerCap}</Text>
          <Text style={styles.metric}>🕵️ Scouts: {scouts}</Text>
          <Text style={styles.metric}>⚔️ Soldiers: {totalSoldiers} ({soldiers.cutter}C/{soldiers.stinger}S/{soldiers.shield}D)</Text>
          {!queenAlive && <Text style={styles.defeat}>☠️ Game Over: the queen has been killed.</Text>}
        </View>

        <View style={styles.row}>
          <ActionButton label="👷 Train Worker (14F)" onPress={trainWorker} disabled={!queenAlive} />
          <ActionButton label="🕵️ Train Scout (22F/6W)" onPress={trainScout} disabled={!queenAlive} />
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Soldier Training (rock-paper-scissors style)</Text>
          <Text style={styles.techDesc}>⚔️ Cutter &gt; 🛡️ Shield, 🛡️ Shield &gt; 🗡️ Stinger, 🗡️ Stinger &gt; ⚔️ Cutter</Text>
          <View style={styles.rowWrap}>
            {SOLDIER_TYPES.map((type) => (
              <ActionButton
                key={type}
                compact
                label={`${TYPE_ICONS[type]} ${TYPE_LABELS[type]}`}
                subLabel={
                  type === 'cutter' ? '(18F/8W)' : type === 'stinger' ? '(16F/10W)' : '(20F/12W)'
                }
                onPress={() => trainSoldier(type)}
                disabled={!queenAlive}
              />
            ))}
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Buildings (expand maximum storage)</Text>
          {Object.entries(BUILDING_DATA).map(([id, data]) => {
            const lvl = buildings[id];
            const atMax = lvl >= data.maxLevel;
            const nextCost = data.costForLevel(lvl + 1);
            return (
              <Pressable
                key={id}
                style={[styles.techBtn, atMax && styles.techDone]}
                onPress={() => upgradeBuilding(id)}
                disabled={!queenAlive}
              >
                <Text style={styles.buttonText}>
                  {data.icon} Upgrade {data.label} (Lv {lvl}/{data.maxLevel})
                </Text>
                <Text style={styles.techDesc}>
                  {atMax ? 'Max level reached' : `Cost ${nextCost.food}F/${nextCost.wood}W • ${data.benefitText}`}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Research</Text>
          {Object.values(RESEARCH_TREE).map((tech) => {
            const complete = techs.includes(tech.id);
            return (
              <Pressable
                key={tech.id}
                style={[styles.techBtn, complete && styles.techDone]}
                onPress={() => researchTech(tech.id)}
                disabled={!queenAlive}
              >
                <Text style={styles.buttonText}>
                  {tech.icon} {tech.label} ({tech.cost.food}F/{tech.cost.wood}W)
                </Text>
                <Text style={styles.techDesc}>{complete ? 'Completed' : tech.description}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Enemy Colonies</Text>
          {wonGame ? (
            <Text style={styles.victory}>👑 You conquered every colony!</Text>
          ) : (
            colonies.map((colony) => {
              const report = intel[colony.id];
              return (
                <View key={colony.id} style={styles.enemyCard}>
                  <Text style={styles.metric}>🏰 {colony.name}</Text>
                  <Text style={styles.techDesc}>
                    Defense: {report ? report.defense : 'Unknown (scout required)'}
                  </Text>
                  <View style={styles.row}>
                    <ActionButton
                      compact
                      label="🧭 Scout"
                      onPress={() => scoutColony(colony.id)}
                      disabled={!queenAlive}
                    />
                    <ActionButton
                      compact
                      label="⚔️ Attack"
                      onPress={() => attackColony(colony.id)}
                      disabled={!queenAlive}
                    />
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Battle Log</Text>
          {log.map((entry, index) => (
            <Text key={`${entry}-${index}`} style={styles.logItem}>
              • {entry}
            </Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionButton({ label, subLabel, onPress, disabled, compact }) {
  return (
    <Pressable style={[styles.actionBtn, compact && styles.actionBtnCompact, disabled && styles.btnDisabled]} onPress={onPress} disabled={disabled}>
      <Text style={styles.buttonText}>{label}</Text>
      {subLabel ? <Text style={styles.subButtonText}>{subLabel}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#101915',
  },
  container: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  title: {
    color: '#effbee',
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#aac8af',
    textAlign: 'center',
    marginBottom: 4,
  },
  panel: {
    backgroundColor: '#1a2a24',
    borderWidth: 1,
    borderColor: '#2d453b',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  panelTitle: {
    color: '#dcf2e0',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  metric: {
    color: '#e3f1e6',
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#466f5c',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  actionBtnCompact: {
    flex: 0,
    minWidth: 94,
  },
  btnDisabled: {
    opacity: 0.55,
  },
  subButtonText: {
    color: '#ddf5e2',
    fontSize: 11,
    marginTop: 2,
  },
  techBtn: {
    backgroundColor: '#365746',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  techDone: {
    opacity: 0.6,
  },
  techDesc: {
    color: '#cbe4d0',
    marginTop: 2,
    fontSize: 12,
  },
  buttonText: {
    color: '#f4fff6',
    fontWeight: '700',
  },
  victory: {
    color: '#ffe999',
    fontSize: 16,
    fontWeight: '700',
  },
  defeat: {
    color: '#ffb1b1',
    fontSize: 15,
    fontWeight: '700',
  },
  enemyCard: {
    backgroundColor: '#2a3f34',
    borderRadius: 10,
    padding: 9,
    marginBottom: 8,
    gap: 4,
  },
  logItem: {
    color: '#d7ebdb',
    fontSize: 13,
  },
});
