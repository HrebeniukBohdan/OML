export class MutableString {
  private value: string;

  constructor(value: string) {
    this.value = value;
  }

  get(index: number): string {
    if (index < 0 || index >= this.value.length) {
      throw new Error(`Index out of bounds`);
    }
    return this.value[index];
  }

  set(index: number, char: string): void {
    if (index < 0 || index >= this.value.length) {
      throw new Error(`Index out of bounds`);
    }
    if (char.length !== 1) {
      throw new Error(`Value for string assignment must be a single character`);
    }
    const chars = this.value.split('');
    chars[index] = char;
    this.value = chars.join('');
  }

  toString(): string {
    return this.value;
  }
}
