export const createPseudoRandom = (seed = Date.now()) => {
  let state = seed >>> 0 || 1;

  return () => {
    // Xorshift32 variant
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 1000) / 1000;
  };
};

export default createPseudoRandom;
