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

const RESEARCH_TREE = {
  farming: {
    id: 'farming',
    label: 'Fungus Farming',
    cost: { food: 80, wood: 20 },
    description: '+4 Food / tick',
  },
  metallurgy: {
    id: 'metallurgy',
    label: 'Metallurgy',
    cost: { food: 50, wood: 80 },
    description: 'Warriors gain +1 Power',
  },
  logistics: {
    id: 'logistics',
    label: 'Tunnel Logistics',
    cost: { food: 70, wood: 70 },
    description: '+2 Wood / tick and +10 max workers',
  },
};

const INITIAL_COLONIES = [
  { id: 'red', name: 'Crimson Nest', defense: 30, reward: { food: 70, wood: 40 } },
  { id: 'blue', name: 'Azure Nest', defense: 50, reward: { food: 90, wood: 60 } },
  { id: 'gold', name: 'Golden Nest', defense: 80, reward: { food: 130, wood: 100 } },
];

const canAfford = (resources, cost) =>
  Object.entries(cost).every(([key, value]) => resources[key] >= value);

const payCost = (resources, cost) =>
  Object.entries(cost).reduce(
    (next, [key, value]) => ({ ...next, [key]: next[key] - value }),
    resources
  );

export default function App() {
  const [resources, setResources] = useState({ food: 120, wood: 90 });
  const [workers, setWorkers] = useState(20);
  const [workerCap, setWorkerCap] = useState(50);
  const [soldiers, setSoldiers] = useState(6);
  const [techs, setTechs] = useState([]);
  const [colonies, setColonies] = useState(INITIAL_COLONIES);
  const [log, setLog] = useState(['Queen: Build a colony worthy of legend.']);

  const powerPerSoldier = useMemo(
    () => (techs.includes('metallurgy') ? 3 : 2),
    [techs]
  );
  const attackPower = soldiers * powerPerSoldier;

  useEffect(() => {
    const timer = setInterval(() => {
      setResources((prev) => ({
        food: prev.food + 3 + (techs.includes('farming') ? 4 : 0),
        wood: prev.wood + 2 + (techs.includes('logistics') ? 2 : 0),
      }));
    }, TICK_MS);

    return () => clearInterval(timer);
  }, [techs]);

  const addLog = (message) => {
    setLog((prev) => [message, ...prev].slice(0, 7));
  };

  const trainWorker = () => {
    const cost = { food: 8 };
    if (workers >= workerCap) {
      addLog('Nursery full: research Logistics for larger tunnels.');
      return;
    }
    if (!canAfford(resources, cost)) {
      addLog('Not enough food to hatch a worker.');
      return;
    }
    setResources((prev) => payCost(prev, cost));
    setWorkers((prev) => prev + 1);
    addLog('A worker ant has hatched.');
  };

  const trainSoldier = () => {
    const cost = { food: 15, wood: 8 };
    if (!canAfford(resources, cost)) {
      addLog('Not enough resources to train a soldier.');
      return;
    }
    setResources((prev) => payCost(prev, cost));
    setSoldiers((prev) => prev + 1);
    addLog('A soldier joins the army.');
  };

  const researchTech = (techId) => {
    const tech = RESEARCH_TREE[techId];
    if (techs.includes(techId)) {
      addLog(`${tech.label} is already researched.`);
      return;
    }
    if (!canAfford(resources, tech.cost)) {
      addLog(`Not enough resources for ${tech.label}.`);
      return;
    }

    setResources((prev) => payCost(prev, tech.cost));
    setTechs((prev) => [...prev, techId]);
    if (techId === 'logistics') {
      setWorkerCap((prev) => prev + 10);
    }
    addLog(`Research complete: ${tech.label}.`);
  };

  const attackColony = (colonyId) => {
    const target = colonies.find((colony) => colony.id === colonyId);
    if (!target) return;

    const losses = Math.max(1, Math.floor(target.defense / 20));
    if (attackPower < target.defense) {
      const retreatLosses = Math.min(losses, soldiers);
      setSoldiers((prev) => Math.max(0, prev - retreatLosses));
      addLog(`Defeat at ${target.name}. Lost ${retreatLosses} soldiers.`);
      return;
    }

    const winLosses = Math.min(Math.max(1, losses - 1), soldiers);
    setSoldiers((prev) => prev - winLosses);
    setResources((prev) => ({
      food: prev.food + target.reward.food,
      wood: prev.wood + target.reward.wood,
    }));
    setColonies((prev) => prev.filter((colony) => colony.id !== colonyId));
    addLog(
      `Victory at ${target.name}! Plundered ${target.reward.food} food and ${target.reward.wood} wood.`
    );
  };

  const wonGame = colonies.length === 0;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>🐜 Ant Colony Commander</Text>
        <Text style={styles.subtitle}>
          Grow your nest, research technology, and conquer rival colonies.
        </Text>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Colony Status</Text>
          <Text style={styles.metric}>Food: {resources.food}</Text>
          <Text style={styles.metric}>Wood: {resources.wood}</Text>
          <Text style={styles.metric}>
            Workers: {workers} / {workerCap}
          </Text>
          <Text style={styles.metric}>Soldiers: {soldiers}</Text>
          <Text style={styles.metric}>Army Power: {attackPower}</Text>
        </View>

        <View style={styles.row}>
          <ActionButton label="Train Worker" onPress={trainWorker} />
          <ActionButton label="Train Soldier" onPress={trainSoldier} />
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
              >
                <Text style={styles.buttonText}>
                  {tech.label} ({tech.cost.food}F/{tech.cost.wood}W)
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
            colonies.map((colony) => (
              <Pressable
                key={colony.id}
                style={styles.attackBtn}
                onPress={() => attackColony(colony.id)}
              >
                <Text style={styles.buttonText}>
                  Attack {colony.name} (Defense {colony.defense})
                </Text>
              </Pressable>
            ))
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

function ActionButton({ label, onPress }) {
  return (
    <Pressable style={styles.actionBtn} onPress={onPress}>
      <Text style={styles.buttonText}>{label}</Text>
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
  actionBtn: {
    flex: 1,
    backgroundColor: '#466f5c',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
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
  attackBtn: {
    backgroundColor: '#7b3f3f',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
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
  logItem: {
    color: '#d7ebdb',
    fontSize: 13,
  },
});
