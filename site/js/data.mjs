const FILES = {
  federal: "/data/federal-2026.json",
  fica: "/data/fica-2026.json",
  states: "/data/states-2026.json",
  local: "/data/local-2026.json",
  payroll: "/data/state-payroll-2026.json",
};

let pending;

export function getTables() {
  if (!pending) {
    pending = Promise.all(
      Object.entries(FILES).map(async ([key, url]) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Could not load ${url}`);
        return [key, await response.json()];
      }),
    ).then((entries) => Object.fromEntries(entries));
  }
  return pending;
}

export function localsForState(tables, stateId) {
  return (tables.local.jurisdictions || [])
    .filter((row) => row.state === stateId && row.method !== "reference")
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function sortedStates(tables) {
  return [...tables.states.states].sort((a, b) => a.name.localeCompare(b.name));
}
