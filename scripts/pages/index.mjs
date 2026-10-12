import { cityPages } from "./cities.mjs";
import { guidePages } from "./guides.mjs";
import { homePages } from "./home.mjs";
import { infoPages } from "./info.mjs";
import { salaryPages } from "./salary.mjs";
import { statePages } from "./states.mjs";
import { toolPages } from "./tools.mjs";

export function buildPages(ctx) {
  return [...homePages(ctx), ...toolPages(ctx), ...statePages(ctx), ...cityPages(ctx), ...salaryPages(ctx), ...guidePages(ctx), ...infoPages(ctx)];
}
