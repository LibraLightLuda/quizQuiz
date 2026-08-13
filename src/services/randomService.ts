export interface RandomSource {
  next(): number;
}

export class CryptoRandom implements RandomSource {
  next(): number {
    if (globalThis.crypto?.getRandomValues) {
      const values = new Uint32Array(1);
      globalThis.crypto.getRandomValues(values);
      return values[0] / 0x1_0000_0000;
    }
    return Math.random();
  }
}

export class SeededRandom implements RandomSource {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0 || 1;
  }

  next(): number {
    this.state = (this.state * 1664525 + 1013904223) >>> 0;
    return this.state / 0x1_0000_0000;
  }
}

export const randomInt = (random: RandomSource, min: number, max: number): number =>
  Math.floor(random.next() * (max - min + 1)) + min;

export const pick = <T>(random: RandomSource, values: readonly T[]): T =>
  values[Math.min(values.length - 1, Math.floor(random.next() * values.length))];

export const shuffle = <T>(random: RandomSource, input: readonly T[]): T[] => {
  const values = [...input];
  for (let index = values.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random.next() * (index + 1));
    [values[index], values[other]] = [values[other], values[index]];
  }
  return values;
};

export const createId = (prefix: string): string => {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};
