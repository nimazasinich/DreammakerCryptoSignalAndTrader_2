import { afterEach, vi } from 'vitest';
import 'whatwg-fetch';
import '@testing-library/jest-dom';

afterEach(() => {
  vi.restoreAllMocks();
});
