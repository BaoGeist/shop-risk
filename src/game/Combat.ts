export interface CombatResult {
  attackerLosses: number;
  defenderLosses: number;
  attackerDice: number[];
  defenderDice: number[];
}

export function rollDice(count: number): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1).sort(
    (a, b) => b - a,
  );
}

export function resolveCombat(
  attackerDiceCount: number,
  defenderDiceCount: number,
): CombatResult {
  const attackerDice = rollDice(attackerDiceCount);
  const defenderDice = rollDice(defenderDiceCount);

  let attackerLosses = 0;
  let defenderLosses = 0;
  const pairs = Math.min(attackerDice.length, defenderDice.length);

  for (let i = 0; i < pairs; i++) {
    if (attackerDice[i] > defenderDice[i]) {
      defenderLosses++;
    } else {
      attackerLosses++; // ties go to defender
    }
  }

  return { attackerLosses, defenderLosses, attackerDice, defenderDice };
}
