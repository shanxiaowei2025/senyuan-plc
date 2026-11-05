-- 旧库可能仅执行过最初的建表脚本，使用 IF NOT EXISTS 支持安全补建。
CREATE INDEX IF NOT EXISTS "sy_plc_createdAt_id_idx" ON "sy_plc"("createdAt", "id");
CREATE INDEX IF NOT EXISTS "sy_plc_modelD2040_createdAt_id_idx" ON "sy_plc"("modelD2040", "createdAt", "id");
