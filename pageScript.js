// An infinite string cannot be allocated in JavaScript:
// "9".repeat(Infinity) throws RangeError. Generate 9s lazily instead.
function* infiniteNines() {
  while (true) {
    yield "9";
  }
}

// Expose the generator without allocating an unbounded string.
globalThis.infiniteNines = infiniteNines;
