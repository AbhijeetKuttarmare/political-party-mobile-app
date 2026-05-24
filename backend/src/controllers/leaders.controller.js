const db     = require("../config/database");
const logger = require("../middleware/logger");
const multer = require("multer");
const XLSX   = require("xlsx");
const path   = require("path");
const fs     = require("fs");

const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.(xlsx|xls|csv)$/i.test(file.originalname);
    cb(ok ? null : new Error("Only Excel (.xlsx/.xls) or CSV files allowed"), ok);
  },
});

exports.importCabinetUpload = excelUpload.single("excel");

/* ─── Photo upload multer ───────────────────────────────────── */
const leadersUploadDir = path.join(__dirname, "../../../uploads/leaders");
if (!fs.existsSync(leadersUploadDir)) fs.mkdirSync(leadersUploadDir, { recursive: true });

const photoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, leadersUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `leader_${req.params.id}_${Date.now()}${ext}`);
  },
});

const photoUpload = multer({
  storage: photoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.(jpg|jpeg|png|webp|gif)$/i.test(file.originalname);
    cb(ok ? null : new Error("Only image files allowed (jpg, png, webp)"), ok);
  },
});

exports.uploadPhotoMiddleware = photoUpload.single("photo");

/* ─── POST /api/leaders/:id/photo ───────────────────────────── */
exports.uploadPhoto = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Image file required" });
    const photoUrl = `/uploads/leaders/${req.file.filename}`;
    const result = await db.query(
      "UPDATE party_leaders SET photo_url = $1 WHERE id = $2 RETURNING id, photo_url",
      [photoUrl, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Leader not found" });
    logger.info(`[LEADERS] Photo uploaded for id=${req.params.id}`);
    res.json({ photo_url: photoUrl });
  } catch (err) { next(err); }
};

/* ─── POST /api/leaders/import-cabinet  (Excel upload) ─────── */
exports.importCabinet = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Excel file required" });

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet    = workbook.Sheets[workbook.SheetNames[0]];
    const rows     = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (!rows.length) return res.status(422).json({ error: "Excel file is empty" });

    // Flexible column matching: exact first, then partial (case-insensitive)
    const colKeys = Object.keys(rows[0]).map(k => k.trim().toLowerCase());
    logger.info(`[CABINET] Excel columns detected: ${colKeys.join(", ")}`);

    function col(row, ...keys) {
      const rowKeys = Object.keys(row);
      // 1. Exact match (case-insensitive)
      for (const k of rowKeys) {
        if (keys.some(key => k.trim().toLowerCase() === key.toLowerCase())) {
          return String(row[k] ?? "").trim();
        }
      }
      // 2. Partial / contains match (e.g. "Minister Name" inside "Sr. Minister Name")
      for (const k of rowKeys) {
        const kl = k.trim().toLowerCase();
        if (keys.some(key => kl.includes(key.toLowerCase()) || key.toLowerCase().includes(kl))) {
          return String(row[k] ?? "").trim();
        }
      }
      return "";
    }

    const members = rows
      .map(row => ({
        sr_no:       parseInt(col(row, "Sr No", "Sr_No", "SrNo", "No", "S.No", "Serial", "Sr.", "Sl No")) || null,
        name:        col(row, "Minister Name", "Name", "MinisterName", "Minister", "Full Name", "Mantri Name", "नाव"),
        designation: col(row, "Position", "Designation", "Role", "Post", "Designation/Role", "पद", "Mantri"),
        department:  col(row, "Department", "Portfolio", "Ministry", "Dept", "विभाग", "Vibhag", "Kharата", "Department/Ministry"),
        party:       col(row, "Party", "Political Party", "Party Name", "Paksha", "पक्ष", "Alliance", "Party/Alliance"),
      }))
      .filter(m => m.name.length > 1);

    if (!members.length) return res.status(422).json({ error: "No valid rows found. Check column headers match: Sr No, Minister Name, Position, Department, Party" });

    // Hard-delete old cabinet entries so re-import never hits the unique constraint
    await db.query("DELETE FROM party_leaders WHERE category = 'cabinet'");

    const inserted = [];
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      const { rows: [row] } = await db.query(
        `INSERT INTO party_leaders (name, designation, category, sort_order, department, party, sr_no)
         VALUES ($1, $2, 'cabinet', $3, $4, $5, $6)
         RETURNING id, name, designation, category, photo_url, sort_order, department, party, sr_no`,
        [m.name, m.designation || "Cabinet Minister", i + 1, m.department || null, m.party || null, m.sr_no]
      );
      inserted.push(row);
    }

    logger.info(`[CABINET] Imported ${inserted.length} cabinet members from Excel by ${req.user.name}`);
    res.status(201).json({ count: inserted.length, members: inserted });
  } catch (err) { next(err); }
};

/* ─── GET /api/leaders ─────────────────────────────────────── */
exports.getAll = async (req, res, next) => {
  try {
    const { category } = req.query;
    const params = [];
    let query = `
      SELECT id, name, designation, category, photo_url, sort_order, department, party, sr_no, is_active, created_at, updated_at
      FROM party_leaders
      WHERE is_active = true
    `;
    if (category) { params.push(category); query += ` AND category = $${params.length}`; }
    query += " ORDER BY sort_order ASC, name ASC";
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) { next(err); }
};

/* ─── GET /api/leaders/:id ─────────────────────────────────── */
exports.getById = async (req, res, next) => {
  try {
    const result = await db.query(
      "SELECT id, name, designation, category, photo_url, sort_order FROM party_leaders WHERE id = $1",
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Leader not found" });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

/* ─── POST /api/leaders ────────────────────────────────────── */
exports.create = async (req, res, next) => {
  try {
    const { name, designation, category = "national", photo_url, sort_order = 0 } = req.body;
    if (!name?.trim() || !designation?.trim()) {
      return res.status(400).json({ error: "name and designation are required" });
    }
    const result = await db.query(
      `INSERT INTO party_leaders (name, designation, category, photo_url, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name.trim(), designation.trim(), category, photo_url || null, sort_order]
    );
    logger.info(`[LEADERS] Created: ${name} by ${req.user.name}`);
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

/* ─── PUT /api/leaders/:id ─────────────────────────────────── */
exports.update = async (req, res, next) => {
  try {
    const { name, designation, category, photo_url, sort_order, is_active } = req.body;
    const result = await db.query(
      `UPDATE party_leaders
       SET name        = COALESCE($1, name),
           designation = COALESCE($2, designation),
           category    = COALESCE($3, category),
           photo_url   = $4,
           sort_order  = COALESCE($5, sort_order),
           is_active   = COALESCE($6, is_active)
       WHERE id = $7
       RETURNING *`,
      [name?.trim() || null, designation?.trim() || null, category || null,
       photo_url ?? null, sort_order ?? null, is_active ?? null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Leader not found" });
    logger.info(`[LEADERS] Updated id=${req.params.id} by ${req.user.name}`);
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

/* ─── DELETE /api/leaders/cabinet/all ─────────────────────── */
exports.removeAllCabinet = async (req, res, next) => {
  try {
    const result = await db.query(
      "DELETE FROM party_leaders WHERE category = 'cabinet' RETURNING id"
    );
    logger.info(`[CABINET] Bulk deleted ${result.rowCount} cabinet members by ${req.user.name}`);
    res.json({ deleted: result.rowCount });
  } catch (err) { next(err); }
};

/* ─── DELETE /api/leaders/:id ──────────────────────────────── */
exports.remove = async (req, res, next) => {
  try {
    const result = await db.query(
      "UPDATE party_leaders SET is_active = false WHERE id = $1 RETURNING id, name",
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Leader not found" });
    logger.info(`[LEADERS] Deactivated: ${result.rows[0].name} by ${req.user.name}`);
    res.json({ message: "Leader removed", leader: result.rows[0] });
  } catch (err) { next(err); }
};
