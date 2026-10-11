import { db } from 'hatchable';
import crypto from 'node:crypto';

export const access = 'public';
export const methods = ['POST'];
const token = (bytes = 18) => crypto.randomBytes(bytes).toString('hex');
const clean = (value, max = 100) => typeof value === 'string' ? value.trim().slice(0, max) : '';

async function campDetails(campId) {
  const campResult = await db.query('SELECT id, name, quest_title, quest_description, host_name, invite_code, location, location_url, created_at FROM group_camps WHERE id = $1', [campId]);
  if (!campResult.rows.length) return null;
  const invitesResult = await db.query('SELECT id, invitee_name, invite_token, status, created_at, accepted_at FROM group_camp_invites WHERE camp_id = $1 ORDER BY created_at ASC', [campId]);
  return { camp: campResult.rows[0], invites: invitesResult.rows };
}

export default async function (req, res) {
  const body = req.body || {};
  const action = clean(body.action, 24);
  if (action === 'create') {
    const name = clean(body.name, 80), hostName = clean(body.host_name, 60), questTitle = clean(body.quest_title, 120), questDescription = clean(body.quest_description, 500), location = clean(body.location, 180), locationUrl = clean(body.location_url, 500);
    if (!name || !hostName || !questTitle) return res.status(400).json({ error: 'Add your name, a camp name, and a quest to start your group camp.' });
    const safeLocationUrl = /^https?:\/\//i.test(locationUrl) ? locationUrl : '';
    const result = await db.query('INSERT INTO group_camps (name, quest_title, quest_description, host_name, invite_code, host_token, location, location_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, name, quest_title, quest_description, host_name, invite_code, location, location_url, created_at', [name, questTitle, questDescription, hostName, token(5).toUpperCase(), token(24), location, safeLocationUrl]);
    const camp = result.rows[0];
    const hostTokenResult = await db.query('SELECT host_token FROM group_camps WHERE id = $1', [camp.id]);
    return res.status(201).json({ camp, host_token: hostTokenResult.rows[0].host_token, invites: [] });
  }
  if (action === 'invite') {
    const hostToken = clean(body.host_token, 100), inviteeName = clean(body.invitee_name, 60);
    if (!hostToken || !inviteeName) return res.status(400).json({ error: 'Enter a friend name to invite.' });
    const host = await db.query('SELECT id FROM group_camps WHERE host_token = $1', [hostToken]);
    if (!host.rows.length) return res.status(403).json({ error: 'Host key is not valid. Reopen the camp on the device that created it.' });
    const count = await db.query('SELECT count(*)::int AS total FROM group_camp_invites WHERE camp_id = $1', [host.rows[0].id]);
    if (count.rows[0].total >= 30) return res.status(429).json({ error: 'This camp is full of potential adventurers (30 invites max).' });
    const inviteToken = token(24);
    await db.query('INSERT INTO group_camp_invites (camp_id, invitee_name, invite_token) VALUES ($1,$2,$3)', [host.rows[0].id, inviteeName, inviteToken]);
    return res.status(201).json({ invite_token: inviteToken, invitee_name: inviteeName, status: 'pending' });
  }
  if (action === 'preview_invite') {
    const inviteToken = clean(body.invite_token, 100);
    if (!inviteToken) return res.status(400).json({ error: 'This invite link is missing its invitation code.' });
    const found = await db.query('SELECT i.id, i.invitee_name, i.status, c.name AS camp_name, c.quest_title, c.quest_description, c.host_name, c.location, c.location_url FROM group_camp_invites i JOIN group_camps c ON c.id = i.camp_id WHERE i.invite_token = $1', [inviteToken]);
    if (!found.rows.length) return res.status(404).json({ error: 'Invitation not found. Ask your friend for a fresh link.' });
    return res.json({ invite: found.rows[0] });
  }
  if (action === 'preview_code') {
    const inviteCode = clean(body.invite_code, 20).toUpperCase();
    const found = await db.query('SELECT id, name AS camp_name, quest_title, quest_description, host_name, location, location_url FROM group_camps WHERE invite_code = $1', [inviteCode]);
    if (!found.rows.length) return res.status(404).json({ error: 'No camp found with that code. Double-check with your friend.' });
    return res.json({ invite: found.rows[0], invite_code: inviteCode });
  }
  if (action === 'accept') {
    const inviteToken = clean(body.invite_token, 100), inviteCode = clean(body.invite_code, 20).toUpperCase(), guestName = clean(body.guest_name, 60);
    if (!guestName || (!inviteToken && !inviteCode)) return res.status(400).json({ error: 'Add your name and an invite link or group code to join.' });
    if (!inviteToken && inviteCode) {
      const camp = await db.query('SELECT id FROM group_camps WHERE invite_code = $1', [inviteCode]);
      if (!camp.rows.length) return res.status(404).json({ error: 'No camp found with that code.' });
      const joined = await db.query("INSERT INTO group_camp_invites (camp_id, invitee_name, invite_token, status, accepted_at) VALUES ($1,$2,$3,'accepted',now()) RETURNING camp_id, invitee_name", [camp.rows[0].id, guestName, token(24)]);
      return res.json({ accepted: true, guest_name: joined.rows[0].invitee_name, ...(await campDetails(joined.rows[0].camp_id)) });
    }
    const updated = await db.query("UPDATE group_camp_invites SET invitee_name = $2, status = 'accepted', accepted_at = now() WHERE invite_token = $1 AND status = 'pending' RETURNING camp_id, invitee_name", [inviteToken, guestName]);
    if (!updated.rows.length) {
      const existing = await db.query('SELECT status FROM group_camp_invites WHERE invite_token = $1', [inviteToken]);
      if (!existing.rows.length) return res.status(404).json({ error: 'This invitation is no longer valid.' });
      return res.status(409).json({ error: 'This invitation has already been accepted.' });
    }
    return res.json({ accepted: true, guest_name: updated.rows[0].invitee_name, ...(await campDetails(updated.rows[0].camp_id)) });
  }
  if (action === 'details') {
    const hostToken = clean(body.host_token, 100);
    if (!hostToken) return res.status(400).json({ error: 'Host key is missing.' });
    const found = await db.query('SELECT id FROM group_camps WHERE host_token = $1', [hostToken]);
    if (!found.rows.length) return res.status(404).json({ error: 'Camp not found on this device.' });
    return res.json(await campDetails(found.rows[0].id));
  }
  return res.status(400).json({ error: 'Choose create, invite, preview_invite, accept, or details.' });
}