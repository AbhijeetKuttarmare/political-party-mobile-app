-- =============================================================
-- Maharashtra All Election Types — District-level areas
-- Adds VP, MC, PS, GP, NP areas for all 36 districts
-- derived from the ZP district-level areas already seeded.
-- Run via: node backend/migrate.js
-- =============================================================

-- ─── VP (Vidhan Parishad) ─────────────────────────────────────
-- Upper house; NCP-SP performs similarly to VS, slight edge rural
INSERT INTO areas (id, name, sub_label, election_id, district_id,
                   total_voters, total_booths, ncp_vote_share, ncp_status,
                   coverage_pct, active_volunteers)
SELECT
  REPLACE(a.id, 'zp-', 'vp-'),
  a.name,
  REPLACE(a.sub_label, 'Zilla Parishad', 'Vidhan Parishad'),
  'vp',
  a.district_id,
  a.total_voters,
  a.total_booths,
  GREATEST(0, ROUND(a.ncp_vote_share - 3, 1)),
  CASE
    WHEN GREATEST(0, a.ncp_vote_share - 3) >= 55 THEN 'strong'
    WHEN GREATEST(0, a.ncp_vote_share - 3) >= 40 THEN 'swing'
    WHEN GREATEST(0, a.ncp_vote_share - 3) >= 30 THEN 'weak'
    ELSE 'critical'
  END,
  a.coverage_pct,
  a.active_volunteers
FROM areas a
WHERE a.id LIKE 'zp-%' AND a.election_id = 'zp'
ON CONFLICT (id) DO NOTHING;

-- ─── MC (Municipal Corporation) ───────────────────────────────
-- Urban voters only; NCP-SP weaker in cities vs rural
-- Uses ~60% of district voters (urban portion) and -10% vote share
INSERT INTO areas (id, name, sub_label, election_id, district_id,
                   total_voters, total_booths, ncp_vote_share, ncp_status,
                   coverage_pct, active_volunteers)
SELECT
  REPLACE(a.id, 'zp-', 'mc-'),
  a.name,
  REPLACE(a.sub_label, 'Zilla Parishad', 'Municipal Corporation'),
  'mc',
  a.district_id,
  ROUND(a.total_voters * 0.60),
  ROUND(a.total_booths * 0.60),
  GREATEST(0, ROUND(a.ncp_vote_share - 10, 1)),
  CASE
    WHEN GREATEST(0, a.ncp_vote_share - 10) >= 55 THEN 'strong'
    WHEN GREATEST(0, a.ncp_vote_share - 10) >= 40 THEN 'swing'
    WHEN GREATEST(0, a.ncp_vote_share - 10) >= 30 THEN 'weak'
    ELSE 'critical'
  END,
  GREATEST(0, a.coverage_pct - 8),
  ROUND(a.active_volunteers * 0.60)
FROM areas a
WHERE a.id LIKE 'zp-%' AND a.election_id = 'zp'
ON CONFLICT (id) DO NOTHING;

-- ─── PS (Panchayat Samiti) ────────────────────────────────────
-- Block-level rural councils; NCP-SP strongest here
-- Uses ~70% of district voters (semi-rural) and +3% vote share
INSERT INTO areas (id, name, sub_label, election_id, district_id,
                   total_voters, total_booths, ncp_vote_share, ncp_status,
                   coverage_pct, active_volunteers)
SELECT
  REPLACE(a.id, 'zp-', 'ps-'),
  a.name,
  REPLACE(a.sub_label, 'Zilla Parishad', 'Panchayat Samiti'),
  'ps',
  a.district_id,
  ROUND(a.total_voters * 0.70),
  ROUND(a.total_booths * 0.70),
  LEAST(98, ROUND(a.ncp_vote_share + 3, 1)),
  CASE
    WHEN LEAST(98, a.ncp_vote_share + 3) >= 55 THEN 'strong'
    WHEN LEAST(98, a.ncp_vote_share + 3) >= 40 THEN 'swing'
    WHEN LEAST(98, a.ncp_vote_share + 3) >= 30 THEN 'weak'
    ELSE 'critical'
  END,
  LEAST(99, a.coverage_pct + 5),
  ROUND(a.active_volunteers * 0.70)
FROM areas a
WHERE a.id LIKE 'zp-%' AND a.election_id = 'zp'
ON CONFLICT (id) DO NOTHING;

-- ─── GP (Gram Panchayat) ──────────────────────────────────────
-- Village level; NCP-SP most competitive here (rural strongholds)
-- Uses ~40% of district voters (village portion) and +5% vote share
INSERT INTO areas (id, name, sub_label, election_id, district_id,
                   total_voters, total_booths, ncp_vote_share, ncp_status,
                   coverage_pct, active_volunteers)
SELECT
  REPLACE(a.id, 'zp-', 'gp-'),
  a.name,
  REPLACE(a.sub_label, 'Zilla Parishad', 'Gram Panchayat'),
  'gp',
  a.district_id,
  ROUND(a.total_voters * 0.40),
  ROUND(a.total_booths * 0.40),
  LEAST(98, ROUND(a.ncp_vote_share + 5, 1)),
  CASE
    WHEN LEAST(98, a.ncp_vote_share + 5) >= 55 THEN 'strong'
    WHEN LEAST(98, a.ncp_vote_share + 5) >= 40 THEN 'swing'
    WHEN LEAST(98, a.ncp_vote_share + 5) >= 30 THEN 'weak'
    ELSE 'critical'
  END,
  LEAST(99, a.coverage_pct + 8),
  ROUND(a.active_volunteers * 0.40)
FROM areas a
WHERE a.id LIKE 'zp-%' AND a.election_id = 'zp'
ON CONFLICT (id) DO NOTHING;

-- ─── NP (Nagar Panchayat) ─────────────────────────────────────
-- Small town councils; between MC and GP in urban-rural mix
-- Uses ~25% of district voters (small-town portion) and -2% vote share
INSERT INTO areas (id, name, sub_label, election_id, district_id,
                   total_voters, total_booths, ncp_vote_share, ncp_status,
                   coverage_pct, active_volunteers)
SELECT
  REPLACE(a.id, 'zp-', 'np-'),
  a.name,
  REPLACE(a.sub_label, 'Zilla Parishad', 'Nagar Panchayat'),
  'np',
  a.district_id,
  ROUND(a.total_voters * 0.25),
  ROUND(a.total_booths * 0.25),
  GREATEST(0, ROUND(a.ncp_vote_share - 2, 1)),
  CASE
    WHEN GREATEST(0, a.ncp_vote_share - 2) >= 55 THEN 'strong'
    WHEN GREATEST(0, a.ncp_vote_share - 2) >= 40 THEN 'swing'
    WHEN GREATEST(0, a.ncp_vote_share - 2) >= 30 THEN 'weak'
    ELSE 'critical'
  END,
  a.coverage_pct,
  ROUND(a.active_volunteers * 0.25)
FROM areas a
WHERE a.id LIKE 'zp-%' AND a.election_id = 'zp'
ON CONFLICT (id) DO NOTHING;
