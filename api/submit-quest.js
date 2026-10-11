import { db, storage } from 'hatchable';
import crypto from 'node:crypto';

export const access = 'public';
export const methods = ['POST'];

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']);

function validSignature(bytes, type) {
  if (!bytes || bytes.length < 4) return false;
  const b = Array.from(bytes.slice(0, 16));
  if (type === 'image/jpeg') return b[0]===255 && b[1]===216 && b[2]===255;
  if (type === 'image/png') return b[0]===137 && b[1]===80 && b[2]===78 && b[3]===71;
  if (type === 'image/gif') return String.fromCharCode(...b.slice(0,3))==='GIF';
  if (type === 'image/webp') return String.fromCharCode(...b.slice(0,4))==='RIFF' && String.fromCharCode(...b.slice(8,12))==='WEBP';
  if (type === 'video/webm') return b[0]===26 && b[1]===69 && b[2]===223 && b[3]===163;
  if (type === 'video/mp4' || type === 'video/quicktime') return String.fromCharCode(...b.slice(4,8))==='ftyp';
  return false;
}

export default async function (req, res) {
  const body = req.body || {};
  const file = (req.files || []).find(f => f.field === 'evidence');
  const explorer = typeof body.explorer_id === 'string' ? body.explorer_id.slice(0, 80) : '';
  const title = typeof body.quest_title === 'string' ? body.quest_title.trim().slice(0, 120) : '';
  const reflection = typeof body.reflection === 'string' ? body.reflection.trim().slice(0, 1000) : '';
  const safeCheck = body.safe_check === 'true' || body.safe_check === 'on';
  const noticedCheck = body.noticed_check === 'true' || body.noticed_check === 'on';
  const requestedXp = Math.max(25, Math.min(90, Math.round(Number(body.quest_xp) || 50)));

  if (!/^[a-zA-Z0-9_-]{12,80}$/.test(explorer)) return res.status(400).json({error:'Explorer session is missing. Refresh the page and try again.'});
  if (!title) return res.status(400).json({error:'Quest title is required.'});
  if (!file) return res.status(400).json({error:'Add a photo or video as your quest evidence.'});
  if (!ALLOWED.has(file.contentType)) return res.status(415).json({error:'Use a JPG, PNG, WEBP, GIF, MP4, MOV, or WEBM file.'});
  if (!file.buffer || file.buffer.length > MAX_BYTES) return res.status(413).json({error:'Keep each photo or video under 10 MB.'});
  if (!validSignature(file.buffer, file.contentType)) return res.status(415).json({error:'That file does not look like a supported photo or video.'});
  if (reflection.length < 20) return res.status(400).json({error:'Write at least 20 characters about what you noticed.'});
  if (!safeCheck || !noticedCheck) return res.status(400).json({error:'Complete both reflection checkboxes before evaluation.'});

  const recent = await db.query(
    "SELECT count(*)::int AS total FROM quest_submissions WHERE explorer_id = $1 AND created_at > now() - interval '1 hour'",
    [explorer]
  );
  if ((recent.rows[0]?.total || 0) >= 8) return res.status(429).json({error:'That is a lot of frolicking! Try submitting again a little later.'});

  const ext = ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov'})[file.contentType];
  const key = 'quest-evidence/' + explorer + '/' + crypto.randomUUID() + '.' + ext;
  await storage.put(key, file.buffer, file.contentType);

  // Completeness review: the file signature/type, reflection, and both safety/observation checks must pass.
  // This is a transparent evidence-completeness check, not AI verification of what the media depicts.
  const note = 'Evidence file validated; reflection provided; observation and safety checks confirmed.';
  const saved = await db.query(
    "INSERT INTO quest_submissions (explorer_id, quest_title, media_key, media_type, media_bytes, reflection, checklist_complete, evaluation_status, evaluation_note, xp_awarded) VALUES ($1,$2,$3,$4,$5,$6,true,'approved',$7,$8) RETURNING id, created_at",
    [explorer,title,key,file.contentType,file.buffer.length,reflection,note,requestedXp]
  );
  const url = await storage.url(key);
  return res.status(201).json({
    submission_id: saved.rows[0].id,
    status: 'approved',
    evaluation: { passed: true, checks: ['Supported photo/video format','Reflection is complete','Observation checklist complete','Safety checklist complete'], note },
    xp_awarded: requestedXp,
    media_url: url
  });
}