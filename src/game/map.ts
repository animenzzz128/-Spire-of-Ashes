import { rng } from './rng';
import { MapNode, NodeType } from './types';

export const TOTAL_FLOORS = 15;

export function generateSpireMap(): MapNode[] {
  const floors: MapNode[][] = [];

  // Floor 1..14 have 3-4 nodes distributed across cols 0..6
  for (let floor = 1; floor <= 14; floor++) {
    const count = floor === 1 ? 3 : floor === 8 ? 3 : floor === 14 ? 3 : rng('map') < 0.55 ? 4 : 3;
    const colsPool = [0, 1, 2, 3, 4, 5, 6];
    const chosenCols: number[] = [];

    if (count === 3) {
      chosenCols.push(1, 3, 5);
    } else {
      chosenCols.push(0, 2, 4, 6);
    }
    // Add slight organic jitter while keeping order
    for (let i = 0; i < chosenCols.length; i++) {
      const jitter = rng('map') < 0.35 ? (rng('map') < 0.5 ? -1 : 1) : 0;
      const candidate = chosenCols[i] + jitter;
      if (
        candidate >= 0 &&
        candidate <= 6 &&
        !chosenCols.includes(candidate) &&
        colsPool.includes(candidate)
      ) {
        chosenCols[i] = candidate;
      }
    }
    chosenCols.sort((a, b) => a - b);

    const floorNodes: MapNode[] = chosenCols.map((col) => ({
      id: `f${floor}_c${col}`,
      floor,
      col,
      type: pickNodeType(floor),
      nextIds: [],
      visited: false,
    }));

    floors.push(floorNodes);
  }

  // Floor 15: single Boss node at center col 3
  const bossNode: MapNode = {
    id: 'f15_c3',
    floor: 15,
    col: 3,
    type: 'boss',
    nextIds: [],
    visited: false,
  };
  floors.push([bossNode]);

  // Connect each floor to next floor cleanly (every node has >=1 outgoing and every node on floor>=2 has >=1 incoming)
  for (let i = 0; i < floors.length - 1; i++) {
    const curr = floors[i];
    const next = floors[i + 1];

    const incomingCount = new Map<string, number>();
    next.forEach((n) => incomingCount.set(n.id, 0));

    curr.forEach((node) => {
      // Sort next nodes by horizontal distance
      const sortedNext = [...next].sort(
        (a, b) => Math.abs(a.col - node.col) - Math.abs(b.col - node.col)
      );
      // Connect to closest node
      const primary = sortedNext[0];
      node.nextIds.push(primary.id);
      incomingCount.set(primary.id, (incomingCount.get(primary.id) || 0) + 1);

      // 45% chance to also branch to second-closest node if within distance 2
      if (sortedNext.length > 1 && Math.abs(sortedNext[1].col - node.col) <= 2 && rng('map') < 0.45) {
        if (!node.nextIds.includes(sortedNext[1].id)) {
          node.nextIds.push(sortedNext[1].id);
          incomingCount.set(sortedNext[1].id, (incomingCount.get(sortedNext[1].id) || 0) + 1);
        }
      }
    });

    // Guarantee no orphan nodes in next floor
    next.forEach((target) => {
      if ((incomingCount.get(target.id) || 0) === 0) {
        const closestPrev = [...curr].sort(
          (a, b) => Math.abs(a.col - target.col) - Math.abs(b.col - target.col)
        )[0];
        if (!closestPrev.nextIds.includes(target.id)) {
          closestPrev.nextIds.push(target.id);
        }
      }
    });
  }

  return floors.flat();
}

function pickNodeType(floor: number): NodeType {
  if (floor === 1) return 'monster';
  if (floor === 8) return 'treasure';
  if (floor === 14) return 'rest';

  const r = rng('map');
  if (floor <= 4) {
    if (r < 0.56) return 'monster';
    if (r < 0.84) return 'event';
    return 'shop';
  }
  if (floor <= 10) {
    if (r < 0.40) return 'monster';
    if (r < 0.60) return 'event';
    if (r < 0.76) return 'elite';
    if (r < 0.90) return 'rest';
    return 'shop';
  }
  // Upper floors 11-13
  if (r < 0.36) return 'monster';
  if (r < 0.56) return 'elite';
  if (r < 0.74) return 'rest';
  if (r < 0.88) return 'event';
  return 'shop';
}
