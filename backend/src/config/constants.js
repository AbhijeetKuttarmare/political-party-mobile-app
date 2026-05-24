/*
 * config/constants.js — App-wide constants
 */

const ROLES = {
  SUPER_ADMIN:     "super_admin",     // full system access, user management
  STATE_LEADER:    "state_leader",    // sees ALL Maharashtra, no system settings
  DISTRICT_LEADER: "district_leader", // sees own district only
  TALUKA_LEADER:   "taluka_leader",   // sees own taluka/area only
  VILLAGE_LEADER:  "village_leader",  // manages all booths & campaigns in own village
  BOOTH_LEADER:    "booth_leader",    // leads a polling booth, above booth_worker
  BOOTH_WORKER:    "booth_worker",    // sees own assigned booth only
  KARYAKARTA:      "karyakarta",      // grassroots party worker, basic access
  OBSERVER:        "observer",        // read-only across all data, no writes
};

const BOOTH_STATUS = {
  STRONG:   "strong",
  SWING:    "swing",
  WEAK:     "weak",
  CRITICAL: "critical",
};

const SURVEY_RESPONSES = {
  NCP:        "ncp",
  UNDECIDED:  "undecided",
  OPPOSITION: "opposition",
  REFUSED:    "refused",
};

const ELECTION_IDS = ["ls", "vs", "vp", "mc", "zp", "ps", "gp", "np"];

const PAGINATION = {
  DEFAULT_LIMIT: 30,
  MAX_LIMIT:     100,
};

module.exports = { ROLES, BOOTH_STATUS, SURVEY_RESPONSES, ELECTION_IDS, PAGINATION };
