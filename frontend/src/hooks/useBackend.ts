// Hooks for backend REST API calls.
// TODO: replace BASE_URL after backend is deployed.

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

export async function fetchLcList(address: string) {
  // TODO: GET /api/lc/:address
  return { data: [], stub: true, address };
}

export async function fetchYieldApy() {
  // TODO: GET /api/yield/apy
  return { sui: 0, usdc: 0, stub: true };
}

export async function fetchTreasuryHealth() {
  // TODO: GET /api/treasury/health
  return { availableSui: 0, pendingSui: 0, healthRatio: 0, stub: true };
}

export { BASE_URL };
