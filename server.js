import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import multer from 'multer';
import { GridFSBucket, MongoClient, ObjectId } from 'mongodb';

const app = express();
const port = Number(process.env.PORT || 10000);
const mongoUri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'frolic';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const allowedMedia = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']);

const fallback = [
  { emoji: '🍃', kicker: 'THE ART OF NOTICING', title: 'Become a tiny nature detective.', description: "Find three things growing through a crack, between bricks, or somewhere they absolutely weren't invited. Nature said watch me.", xp: 50, difficulty: 'Easy does it', minutes: 10 },
  { emoji: '☁️', kicker: 'CLOUD WITH A CHANCE OF YAPPING', title: 'Find a cloud with a backstory.', description: 'Look up safely and find a cloud that resembles something ridiculous. Give it a name, a job, and one deeply inconvenient secret.', xp: 45, difficulty: 'Gentle', minutes: 5 },
  { emoji: '🕵️', kicker: 'LOW-STAKES INVESTIGATION', title: 'Investigate a suspiciously interesting rock.', description: 'Find a rock, leaf, or seed that looks like it has lore. Inspect it like a tiny detective. Please leave living things where they are.', xp: 40, difficulty: 'Gentle', minutes: 5 },
  { emoji: '🎨', kicker: 'COLOR HUNTER', title: 'Find a color palette IRL.', description: 'Choose a color and find three safe things around you that match it. Behold: art. No collecting required.', xp: 50, difficulty: 'Easy does it', minutes: 10 },
  { emoji: '🌳', kicker: 'TREE APPRECIATION SOCIETY', title: 'Meet a tree (respectfully).', description: 'Find a tree from a public path. Notice its shape, bark, and the life around it. Give it an extremely formal title, like Sir Branchington III.', xp: 55, difficulty: 'Nature nerd', minutes: 10 }
];

let database;
let mediaBucket;
let connectionPromise;

async function getDatabase() {
  if (!mongoUri) throw new Error('MONGODB_URI is not configured.');
  if (!connectionPromise) {
    const client = new MongoClient(mongoUri);
    connectionPromise = client.connect().then(() => {
      database = client.db(dbName);
      mediaBucket = new GridFSBucket(database, { bucketName: 'questEvidence' });
      return database;
    });
  }
  return connectionPromise;
}

function clean(value, max = 100) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function token(bytes = 18) {
  return crypto.randomBytes(bytes).toString('hex');
}

function validSignature(buffer, type) {
  if (!buffer || buffer.length < 4) return false;
  const bytes = [...buffer.subarray(0, 16)];
  if (type === 'image/jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type === 'image/png') return bytes.slice(0, 4).join() === '137,80,78,71';
  if (type === 'image/gif') return buffer.subarray(0, 3).toString() === 'GIF';
  if (type === 'image/webp') return buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP';
  if (type === 'video/webm') return bytes.slice(0, 4).join() === '26,69,223,163';
  return (type === 'video/mp4' || type === 'video/quicktime') && buffer.subarray(4, 8).toString() === 'ftyp';
}

async function questFromModel(mood, minutes, difficulty, safeFallback) {
  if (!process.env.HF_TOKEN) return { quest: safeFallback, source: 'local-fallback' };
  try {
    const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.HF_TOKEN}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(18000),
      body: JSON.stringify({
        model: 'Qwen/Qwen2.5-7B-Instruct',
        temperature: difficulty === 'chaos' ? 1.05 : 0.85,
        max_tokens: 280,
        messages: [
          { role: 'system', content: 'You are Frolic, a witty outdoor side-quest designer. Return ONLY valid JSON with keys emoji,kicker,title,description,xp,difficulty,minutes. Create one achievable, safe outdoor mission. Never suggest trespassing, touching wildlife, eating plants, unsafe roads, or approaching strangers.' },
          { role: 'user', content: `Create a fresh outdoor quest. Mood: ${mood}. Time limit: ${minutes} minutes. Difficulty: ${difficulty}. Return JSON only.` }
        ]
      })
    });
    if (!response.ok) throw new Error(`Hugging Face returned ${response.status}`);
    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '';
    const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    if (typeof parsed.title !== 'string' || typeof parsed.description !== 'string') throw new Error('Invalid model response');
    return {
      source: 'open-model',
      model: 'Qwen/Qwen2.5-7B-Instruct',
      quest: {
        emoji: String(parsed.emoji || '🌱').slice(0, 8),
        kicker: String(parsed.kicker || 'A LITTLE ADVENTURE').slice(0, 50),
        title: parsed.title.slice(0, 100),
        description: parsed.description.slice(0, 320),
        xp: Math.max(25, Math.min(90, Math.round(Number(parsed.xp) || 50))),
        difficulty: String(parsed.difficulty || difficulty).slice(0, 40),
        minutes: Math.max(1, Math.min(minutes, Math.round(Number(parsed.minutes) || minutes)))
      }
    };
  } catch {
    return { quest: safeFallback, source: 'local-fallback', note: 'The open model is unavailable right now; here is a quest so the adventure can continue.' };
  }
}

app.use(express.json({ limit: '1mb' }));
app.use(express.static('public'));

app.get('/health', async (_req, res) => {
  try {
    const db = await getDatabase();
    await db.command({ ping: 1 });
    res.json({ ok: true, service: 'frolic', database: 'mongodb-atlas' });
  } catch (error) {
    res.status(503).json({ ok: false, error: error.message });
  }
});

app.post('/api/quest', async (req, res) => {
  const mood = ['curious', 'chaotic', 'chill', 'social', 'nature'].includes(req.body?.mood) ? req.body.mood : 'curious';
  const minutes = [5, 10, 20, 30].includes(Number(req.body?.minutes)) ? Number(req.body.minutes) : 10;
  const difficulty = ['gentle', 'normal', 'chaos'].includes(req.body?.difficulty) ? req.body.difficulty : 'normal';
  const options = fallback.filter((item) => item.minutes <= minutes);
  const safeFallback = { ...(options.length ? options : fallback)[Math.floor(Math.random() * (options.length ? options : fallback).length)], minutes };
  res.json(await questFromModel(mood, minutes, difficulty, safeFallback));
});

app.post('/api/submit-quest', upload.single('evidence'), async (req, res) => {
  const explorerId = clean(req.body?.explorer_id, 80);
  const title = clean(req.body?.quest_title, 120);
  const reflection = clean(req.body?.reflection, 1000);
  const file = req.file;
  const safeCheck = req.body?.safe_check === 'true' || req.body?.safe_check === 'on';
  const noticedCheck = req.body?.noticed_check === 'true' || req.body?.noticed_check === 'on';
  const requestedXp = Math.max(25, Math.min(90, Math.round(Number(req.body?.quest_xp) || 50)));
  if (!/^[a-zA-Z0-9_-]{12,80}$/.test(explorerId)) return res.status(400).json({ error: 'Explorer session is missing. Refresh the page and try again.' });
  if (!title) return res.status(400).json({ error: 'Quest title is required.' });
  if (!file || !allowedMedia.has(file.mimetype)) return res.status(415).json({ error: 'Add a supported JPG, PNG, WEBP, GIF, MP4, MOV, or WEBM file.' });
  if (!validSignature(file.buffer, file.mimetype)) return res.status(415).json({ error: 'That file does not look like a supported photo or video.' });
  if (reflection.length < 20 || !safeCheck || !noticedCheck) return res.status(400).json({ error: 'Complete the reflection and both safety/observation checks before evaluation.' });
  const db = await getDatabase();
  const recent = await db.collection('questSubmissions').countDocuments({ explorerId, createdAt: { $gt: new Date(Date.now() - 60 * 60 * 1000) } });
  if (recent >= 8) return res.status(429).json({ error: 'That is a lot of frolicking! Try submitting again a little later.' });
  const mediaId = new ObjectId();
  await new Promise((resolve, reject) => {
    const stream = mediaBucket.openUploadStreamWithId(mediaId, `quest-evidence/${explorerId}/${mediaId}`, { contentType: file.mimetype, metadata: { explorerId } });
    stream.on('finish', resolve).on('error', reject).end(file.buffer);
  });
  const note = 'Evidence file validated; reflection provided; observation and safety checks confirmed.';
  const saved = await db.collection('questSubmissions').insertOne({ explorerId, questTitle: title, mediaId, mediaType: file.mimetype, mediaBytes: file.size, reflection, checklistComplete: true, evaluationStatus: 'approved', evaluationNote: note, xpAwarded: requestedXp, createdAt: new Date() });
  res.status(201).json({ submission_id: saved.insertedId, status: 'approved', evaluation: { passed: true, checks: ['Supported photo/video format', 'Reflection is complete', 'Observation checklist complete', 'Safety checklist complete'], note }, xp_awarded: requestedXp, media_url: `/media/${mediaId}` });
});

app.get('/media/:id', async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(404).end();
  const file = await (await getDatabase()).collection('questEvidence.files').findOne({ _id: new ObjectId(req.params.id) });
  if (!file) return res.status(404).end();
  res.type(file.contentType);
  mediaBucket.openDownloadStream(file._id).on('error', () => res.status(404).end()).pipe(res);
});

async function campDetails(db, campId) {
  const camp = await db.collection('groupCamps').findOne({ _id: campId });
  if (!camp) return null;
  const invites = await db.collection('groupCampInvites').find({ campId }).sort({ createdAt: 1 }).toArray();
  return {
    camp: {
      id: camp._id,
      name: camp.name,
      quest_title: camp.questTitle,
      quest_description: camp.questDescription,
      host_name: camp.hostName,
      invite_code: camp.inviteCode,
      location: camp.location,
      location_url: camp.locationUrl,
      created_at: camp.createdAt
    },
    invites: invites.map((invite) => ({
      id: invite._id,
      invitee_name: invite.inviteeName,
      invite_token: invite.inviteToken,
      status: invite.status,
      created_at: invite.createdAt,
      accepted_at: invite.acceptedAt
    }))
  };
}

app.post('/api/group-camping', async (req, res) => {
  const db = await getDatabase();
  const body = req.body || {};
  const action = clean(body.action, 24);
  if (action === 'create') {
    const name = clean(body.name, 80), hostName = clean(body.host_name, 60), questTitle = clean(body.quest_title, 120), questDescription = clean(body.quest_description, 500);
    if (!name || !hostName || !questTitle) return res.status(400).json({ error: 'Add your name, a camp name, and a quest to start your group camp.' });
    const camp = { name, questTitle, questDescription, hostName, inviteCode: token(5).toUpperCase(), hostToken: token(24), location: clean(body.location, 180), locationUrl: /^https?:\/\//i.test(clean(body.location_url, 500)) ? clean(body.location_url, 500) : '', createdAt: new Date() };
    const result = await db.collection('groupCamps').insertOne(camp);
    return res.status(201).json({
      camp: {
        id: result.insertedId,
        name: camp.name,
        quest_title: camp.questTitle,
        quest_description: camp.questDescription,
        host_name: camp.hostName,
        invite_code: camp.inviteCode,
        location: camp.location,
        location_url: camp.locationUrl,
        created_at: camp.createdAt
      },
      host_token: camp.hostToken,
      invites: []
    });
  }
  if (action === 'invite') {
    const camp = await db.collection('groupCamps').findOne({ hostToken: clean(body.host_token, 100) });
    if (!camp) return res.status(403).json({ error: 'Host key is not valid. Reopen the camp on the device that created it.' });
    if (await db.collection('groupCampInvites').countDocuments({ campId: camp._id }) >= 30) return res.status(429).json({ error: 'This camp is full of potential adventurers (30 invites max).' });
    const invite = { campId: camp._id, inviteeName: clean(body.invitee_name, 60), inviteToken: token(24), status: 'pending', createdAt: new Date() };
    await db.collection('groupCampInvites').insertOne(invite);
    return res.status(201).json({ invite_token: invite.inviteToken, invitee_name: invite.inviteeName, status: invite.status });
  }
  if (action === 'preview_invite') {
    const invite = await db.collection('groupCampInvites').findOne({ inviteToken: clean(body.invite_token, 100) });
    const camp = invite && await db.collection('groupCamps').findOne({ _id: invite.campId });
    if (!invite || !camp) return res.status(404).json({ error: 'Invitation not found. Ask your friend for a fresh link.' });
    return res.json({ invite: { ...invite, camp_name: camp.name, quest_title: camp.questTitle, quest_description: camp.questDescription, host_name: camp.hostName, location: camp.location, location_url: camp.locationUrl } });
  }
  if (action === 'preview_code') {
    const camp = await db.collection('groupCamps').findOne({ inviteCode: clean(body.invite_code, 20).toUpperCase() });
    if (!camp) return res.status(404).json({ error: 'No camp found with that code. Double-check with your friend.' });
    return res.json({ invite: { camp_name: camp.name, quest_title: camp.questTitle, quest_description: camp.questDescription, host_name: camp.hostName, location: camp.location, location_url: camp.locationUrl }, invite_code: camp.inviteCode });
  }
  if (action === 'accept') {
    const guestName = clean(body.guest_name, 60);
    const invite = clean(body.invite_token, 100) ? await db.collection('groupCampInvites').findOne({ inviteToken: clean(body.invite_token, 100), status: 'pending' }) : null;
    const camp = invite ? await db.collection('groupCamps').findOne({ _id: invite.campId }) : await db.collection('groupCamps').findOne({ inviteCode: clean(body.invite_code, 20).toUpperCase() });
    if (!guestName || !camp) return res.status(404).json({ error: 'Add your name and a valid invite link or group code to join.' });
    if (invite) await db.collection('groupCampInvites').updateOne({ _id: invite._id }, { $set: { inviteeName: guestName, status: 'accepted', acceptedAt: new Date() } });
    else await db.collection('groupCampInvites').insertOne({ campId: camp._id, inviteeName: guestName, inviteToken: token(24), status: 'accepted', createdAt: new Date(), acceptedAt: new Date() });
    return res.json({ accepted: true, guest_name: guestName, ...(await campDetails(db, camp._id)) });
  }
  if (action === 'details') {
    const camp = await db.collection('groupCamps').findOne({ hostToken: clean(body.host_token, 100) });
    if (!camp) return res.status(404).json({ error: 'Camp not found on this device.' });
    return res.json(await campDetails(db, camp._id));
  }
  return res.status(400).json({ error: 'Choose create, invite, preview_invite, accept, or details.' });
});

app.post('/api/individual-camp', async (req, res) => {
  const db = await getDatabase();
  const explorerId = clean(req.body?.explorer_id, 80);
  if (!/^[a-zA-Z0-9_-]{12,80}$/.test(explorerId)) return res.status(400).json({ error: 'Explorer session is missing. Refresh the page and try again.' });
  const profile = {
    explorerId,
    displayName: clean(req.body?.display_name, 60) || 'Outdoor explorer',
    homeBase: clean(req.body?.home_base, 120),
    updatedAt: new Date()
  };
  await db.collection('individualCamps').updateOne(
    { explorerId },
    { $set: profile, $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  );
  const history = await db.collection('questSubmissions')
    .find({ explorerId })
    .sort({ createdAt: -1 })
    .limit(20)
    .project({ _id: 0, questTitle: 1, reflection: 1, xpAwarded: 1, createdAt: 1 })
    .toArray();
  return res.json({ camp: profile, history });
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Keep each photo or video under 10 MB.' });
  console.error(error);
  res.status(500).json({ error: 'The Frolic service could not complete that request.' });
});

app.listen(port, () => console.log(`Frolic listening on port ${port}`));
