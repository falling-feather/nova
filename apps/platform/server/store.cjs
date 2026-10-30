'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { randomBytes, randomUUID, createHash, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const { readProgress } = require('../../../shared/linkage/course-links.js');
const { validRecordKey, validArtifact } = require('../../../shared/linkage/storage-contract.js');
const derive = promisify(scrypt);
const digest = value => createHash('sha256').update(value).digest('hex');
const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const MAX_PAYLOAD = 24 * 1024 * 1024;
class InputError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
function username(value) {
  if (typeof value !== 'string') throw new InputError('请输入账号。');
  const normalized = value.normalize('NFKC').toLowerCase().trim();
  if (!/^[a-z0-9_]{3,24}$/.test(normalized)) throw new InputError('账号需为3—24位字母、数字或下划线。');
  return normalized;
}
function password(value) {
  if (typeof value !== 'string' || value.length < 8 || value.length > 128) throw new InputError('密码需为8—128个字符。');
  return value;
}
async function hashPassword(value) {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password(value), salt, 64, SCRYPT);
  return salt + ':' + key.toString('hex');
}
async function verifyPassword(value, encoded) {
  password(value);
  const [salt, expected] = encoded.split(':');
  const key = await derive(value, salt, 64, SCRYPT);
  return timingSafeEqual(key, Buffer.from(expected, 'hex'));
}
const publicUser = row => ({ id: row.id, username: row.username, displayName: row.display_name });
const emptyPayload = () => ({ records: {}, summary: null, artifacts: {} });
function validatePayload(value, chapter) {
  const object = o => o && typeof o === 'object' && !Array.isArray(o);
  if (!object(value) || !object(value.records) || !object(value.artifacts)) throw new InputError('存档封装无效。');
  const entries = Object.entries(value.records);
  if (entries.length > 40) throw new InputError('一个章节最多保存40项原始记录。');
  for (const [key, raw] of entries) {
    if (!validRecordKey(key) || (raw !== null && typeof raw !== 'string')) throw new InputError('存档键或原文无效。');
  }
  if (value.summary !== null) {
    if (typeof value.summary !== 'string' || readProgress({ getItem: () => value.summary }, chapter).status !== 'ok') throw new InputError('续学摘要不符合原进度协议。');
  }
  const artifacts = Object.entries(value.artifacts);
  if (artifacts.length > 50) throw new InputError('本章最多同步50件导出作品，请保留原章完整项目。');
  for (const [id, artifact] of artifacts) {
    if (!validArtifact(artifact) || artifact.id !== id) throw new InputError('作品传输信息无效。');
  }
  const payload = { records: value.records, summary: value.summary, artifacts: value.artifacts };
  if (Buffer.byteLength(JSON.stringify(payload)) > MAX_PAYLOAD) throw new InputError('本章记录超过24 MiB，请先导出。', 413);
  return payload;
}
class PlatformStore {
  constructor(file, { now = Date.now } = {}) {
    if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
    this.now = now;
    this.db = new DatabaseSync(file, { timeout: 5000 });
    this.db.exec(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL, password_hash TEXT NOT NULL, recovery_hash TEXT NOT NULL, created_at INTEGER NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS chapters (user_id TEXT NOT NULL REFERENCES users(id), chapter INTEGER NOT NULL,
        revision INTEGER NOT NULL, payload TEXT NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY(user_id,chapter)) STRICT;
      CREATE TABLE IF NOT EXISTS operations (user_id TEXT NOT NULL REFERENCES users(id), operation_id TEXT NOT NULL,
        request_hash TEXT NOT NULL, chapter INTEGER NOT NULL, revision INTEGER NOT NULL, PRIMARY KEY(user_id,operation_id)) STRICT;
      CREATE TABLE IF NOT EXISTS history (user_id TEXT NOT NULL REFERENCES users(id), chapter INTEGER NOT NULL,
        revision INTEGER NOT NULL, payload TEXT NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY(user_id,chapter,revision)) STRICT;
      CREATE TABLE IF NOT EXISTS conflicts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), chapter INTEGER NOT NULL,
        operation_id TEXT NOT NULL, request_hash TEXT NOT NULL, payload TEXT NOT NULL, created_at INTEGER NOT NULL, UNIQUE(user_id,operation_id)) STRICT;
      PRAGMA user_version=1;`);
  }
  close() { if (this.db.isOpen) this.db.close(); }
  async register({ username: name, displayName, password: secret }) {
    name = username(name);
    const display = typeof displayName === 'string' ? displayName.trim() : name;
    if (!display || display.length > 32) throw new InputError('昵称需为1—32个字符。');
    if (this.db.prepare('SELECT id FROM users WHERE username=?').get(name)) throw new InputError('这个账号已被使用，请换一个。', 409);
    const encoded = await hashPassword(secret);
    const id = randomUUID(), recoveryCode = randomBytes(24).toString('base64url');
    try { this.db.prepare('INSERT INTO users VALUES (?,?,?,?,?,?)').run(id, name, display, encoded, digest(recoveryCode), this.now()); }
    catch (error) { if (error.code === 'ERR_SQLITE_ERROR' && error.message.includes('UNIQUE')) throw new InputError('这个账号已被使用，请换一个。', 409); throw error; }
    return { user: { id, username: name, displayName: display }, recoveryCode };
  }
  async login(name, secret) {
    const row = this.db.prepare('SELECT * FROM users WHERE username=?').get(username(name));
    // Unknown accounts still perform the same expensive derivation.
    const encoded = row?.password_hash ?? '00000000000000000000000000000000:' + '00'.repeat(64);
    return (await verifyPassword(secret, encoded)) && row ? publicUser(row) : null;
  }
  async recover(name, code, secret) {
    if (typeof code !== 'string' || code.length > 100) throw new InputError('恢复码无效。');
    const row = this.db.prepare('SELECT * FROM users WHERE username=? AND recovery_hash=?').get(username(name), digest(code));
    const encoded = await hashPassword(secret);
    if (!row) return null;
    const recoveryCode = randomBytes(24).toString('base64url');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = this.db.prepare('UPDATE users SET password_hash=?,recovery_hash=? WHERE id=? AND recovery_hash=?').run(encoded, digest(recoveryCode), row.id, digest(code));
      if (result.changes !== 1) { this.db.exec('ROLLBACK'); return null; }
      this.db.prepare('DELETE FROM sessions WHERE user_id=?').run(row.id);
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    return { user: publicUser(row), recoveryCode };
  }
  createSession(userId) {
    const token = randomBytes(32).toString('base64url');
    this.db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(this.now());
    this.db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(digest(token), userId, this.now() + 14 * 86400000);
    return token;
  }
  session(token) {
    if (!token || typeof token !== 'string' || token.length > 100) return null;
    const row = this.db.prepare('SELECT users.* FROM users JOIN sessions ON sessions.user_id=users.id WHERE token_hash=? AND expires_at>?').get(digest(token), this.now());
    return row ? publicUser(row) : null;
  }
  logout(token) { if (token) this.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(token)); }
  load(userId, chapter) {
    const row = this.db.prepare('SELECT * FROM chapters WHERE user_id=? AND chapter=?').get(userId, chapter);
    return row ? { chapter, revision: row.revision, payload: JSON.parse(row.payload), updatedAt: row.updated_at }
      : { chapter, revision: 0, payload: emptyPayload(), updatedAt: null };
  }
  list(userId) {
    return this.db.prepare('SELECT * FROM chapters WHERE user_id=? ORDER BY updated_at DESC').all(userId).map(row => {
      const payload = JSON.parse(row.payload);
      return { chapter: row.chapter, revision: row.revision, updatedAt: row.updated_at, summary: payload.summary,
        recordCount: Object.values(payload.records).filter(raw => raw !== null).length,
        artifacts: Object.values(payload.artifacts).map(({ data, ...metadata }) => metadata) };
    });
  }
  save(userId, chapter, baseRevision, operationId, value) {
    if (!Number.isInteger(chapter) || chapter < 1 || chapter > 13 || !Number.isSafeInteger(baseRevision) || baseRevision < 0 || typeof operationId !== 'string' || !/^[a-zA-Z0-9_-]{12,100}$/.test(operationId)) throw new InputError('章节、修订号或操作ID无效。');
    const payload = validatePayload(value, chapter);
    const raw = JSON.stringify(payload), hash = digest(JSON.stringify({ chapter, baseRevision, payload }));
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const operation = this.db.prepare('SELECT * FROM operations WHERE user_id=? AND operation_id=?').get(userId, operationId);
      if (operation) {
        if (operation.request_hash !== hash) throw new InputError('操作ID已用于另一份内容。', 409);
        this.db.exec('COMMIT'); return { chapter, revision: operation.revision, replayed: true };
      }
      const current = this.load(userId, chapter);
      if (current.revision !== baseRevision) {
        const old = this.db.prepare('SELECT * FROM conflicts WHERE user_id=? AND operation_id=?').get(userId, operationId);
        if (old && old.request_hash !== hash) throw new InputError('操作ID已用于另一份冲突内容。', 409);
        const id = old?.id ?? randomUUID();
        if (!old) this.db.prepare('INSERT INTO conflicts VALUES (?,?,?,?,?,?,?)').run(id, userId, chapter, operationId, hash, raw, this.now());
        this.db.exec('COMMIT'); return { conflict: true, conflictId: id, remote: current };
      }
      const previousCheckpoint=this.db.prepare('SELECT updated_at FROM history WHERE user_id=? AND chapter=? ORDER BY revision DESC LIMIT 1').get(userId,chapter);
      if(current.revision>0&&Buffer.byteLength(JSON.stringify(current.payload))<=16*1024*1024&&(!previousCheckpoint||this.now()-previousCheckpoint.updated_at>=300000)){
        this.db.prepare('INSERT INTO history VALUES (?,?,?,?,?)').run(userId,chapter,current.revision,JSON.stringify(current.payload),this.now());
        this.pruneHistory(userId);
      }
      const revision = current.revision + 1, updatedAt = this.now();
      this.db.prepare('INSERT INTO chapters VALUES (?,?,?,?,?) ON CONFLICT(user_id,chapter) DO UPDATE SET revision=excluded.revision,payload=excluded.payload,updated_at=excluded.updated_at').run(userId, chapter, revision, raw, updatedAt);
      this.db.prepare('INSERT INTO operations VALUES (?,?,?,?,?)').run(userId, operationId, hash, chapter, revision);
      this.db.prepare('DELETE FROM operations WHERE user_id=? AND rowid NOT IN (SELECT rowid FROM operations WHERE user_id=? ORDER BY rowid DESC LIMIT 1000)').run(userId,userId);
      this.db.exec('COMMIT'); return { chapter, revision, updatedAt };
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  pruneHistory(userId){
    const rows=this.db.prepare('SELECT rowid,chapter,length(CAST(payload AS BLOB)) AS bytes FROM history WHERE user_id=? ORDER BY updated_at DESC,rowid DESC').all(userId);
    const counts=new Map(),bytes=new Map();let total=0;
    for(const row of rows){const count=(counts.get(row.chapter)||0)+1,size=(bytes.get(row.chapter)||0)+row.bytes;
      if(count>3||size>16*1024*1024||total+row.bytes>32*1024*1024)this.db.prepare('DELETE FROM history WHERE rowid=?').run(row.rowid);
      else{counts.set(row.chapter,count);bytes.set(row.chapter,size);total+=row.bytes;}
    }
  }
  history(userId, chapter, {limit=3,before=Number.MAX_SAFE_INTEGER,includePayload=true}={}) {
    if(!Number.isInteger(limit)||limit<1||limit>10||!Number.isSafeInteger(before)||before<1)throw new InputError('恢复点分页参数无效。');
    const fields=includePayload?'revision,payload,updated_at':'revision,updated_at,length(CAST(payload AS BLOB)) AS bytes';
    return this.db.prepare(`SELECT ${fields} FROM history WHERE user_id=? AND chapter=? AND revision<? ORDER BY revision DESC LIMIT ?`).all(userId,chapter,before,limit)
      .map(row=>({revision:row.revision,updatedAt:row.updated_at,...(includePayload?{payload:JSON.parse(row.payload)}:{bytes:row.bytes})}));
  }
  conflicts(userId, chapter) { return this.db.prepare('SELECT id,payload,created_at FROM conflicts WHERE user_id=? AND chapter=? ORDER BY created_at').all(userId, chapter).map(row => ({ id: row.id, payload: JSON.parse(row.payload), createdAt: row.created_at })); }
}
module.exports = { PlatformStore, InputError, validatePayload, MAX_PAYLOAD };
