/**
 * The 2026 rate tables for the browser. tables.mjs is written by the page
 * generator from src/data/*.json, so the calculator needs no network request
 * after the page has loaded.
 */
import TABLES from "./tables.mjs";

export function getTables() {
  return TABLES;
}

export function localsForState(tables, stateId) {
  return (tables.local.jurisdictions || [])
    .filter((row) => row.state === stateId && row.method !== "reference")
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function sortedStates(tables) {
  return [...tables.states.states].sort((a, b) => a.name.localeCompare(b.name));
}

export function findLocal(tables, id) {
  return (tables.local.jurisdictions || []).find((row) => row.id === id) || null;
}

export function findState(tables, id) {
  return tables.states.states.find((row) => row.id === id) || null;
}
