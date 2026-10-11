const $ = (id) => document.getElementById(id);
const state = { xp: 0, completed: 0, chaosTried: false, days: [], badges: new Set(), current: null, generating: false };
function openEvidencePanel(panel){panel.removeAttribute('hidden');panel.classList.add('evidence-panel-open');panel.scrollIntoView({behavior:'smooth',block:'start'})}
function closeEvidencePanel(panel){panel.setAttribute('hidden','');panel.classList.remove('evidence-panel-open')}
const fallbackQuests = [
 {emoji:'🍃',kicker:'THE ART OF NOTICING',title:'Become a tiny nature detective.',description:'Find three things growing through a crack, between bricks, or somewhere they absolutely weren’t invited. Nature said “watch me.”',xp:50,difficulty:'Easy does it',minutes:10},
 {emoji:'🕵️',kicker:'LOW-STAKES INVESTIGATION',title:'Investigate a suspiciously interesting rock.',description:'Find a rock, leaf, or seed that looks like it has lore. Inspect it like a tiny detective. Please leave living things where they are.',xp:40,difficulty:'Gentle',minutes:5},
 {emoji:'☁️',kicker:'CLOUD WITH A CHANCE OF YAPPING',title:'Find a cloud with a backstory.',description:'Look up safely and find a cloud that resembles something ridiculous. Give it a name, a job, and one deeply inconvenient secret.',xp:45,difficulty:'Easy does it',minutes:5},
 {emoji:'🌼',kicker:'SIDE CHARACTER ENERGY',title:'Compliment the world, quietly.',description:'Notice three small things that are doing their best: a determined plant, warm sunlight, a bird with somewhere to be. No photo required.',xp:50,difficulty:'Soft & chill',minutes:10},
 {emoji:'🧭',kicker:'THE ROAD LESS BORING',title:'Take the scenic two-minute detour.',description:'On a familiar, safe route, take a different path for two minutes. Spot one detail you’ve never noticed. Stay in public, accessible areas.',xp:60,difficulty:'A little brave',minutes:10},
 {emoji:'🐜',kicker:'TINY PLANET, BIG DRAMA',title:'Observe a miniature universe.',description:'Find a patch of ground and watch quietly for one minute. What moves? What grows? You are now a very small documentary crew.',xp:55,difficulty:'Nature nerd',minutes:10},
 {emoji:'🎨',kicker:'COLOR HUNTER',title:'Find a color palette IRL.',description:'Choose a color—orange, purple, or an aggressively specific green. Find three safe, non-living things or plants with that color. Behold: art.',xp:50,difficulty:'Easy does it',minutes:10},
 {emoji:'👂',kicker:'SOUND CHECK',title:'Unlock your ears for a minute.',description:'Pause somewhere safe. Count how many different sounds you can hear without looking at your phone. Bonus: identify the quietest one.',xp:45,difficulty:'Soft & chill',minutes:5},
 {emoji:'🌀',kicker:'CHAOS, BUT MAKE IT WHOLESOME',title:'Walk like you have a side quest.',description:'For the next five minutes, notice only things that would make a good tiny museum exhibit. No collecting, no trespassing—just immaculate curator energy.',xp:70,difficulty:'Certified goof',minutes:5},
 {emoji:'🌳',kicker:'TREE APPRECIATION SOCIETY',title:'Meet a tree (respectfully).',description:'Find a tree from a public path. Notice its shape, bark, and the life around it. Give it an extremely formal title, like Sir Branchington III.',xp:55,difficulty:'Nature nerd',minutes:10}
];
function pickLocal(){const mood=$('mood').value,duration=Number($('duration').value),difficulty=$('difficulty').value;let list=fallbackQuests.filter(q=>q.minutes<=duration);if(!list.length)list=fallbackQuests;const themed=list.filter(q=>mood==='chaotic'?/CHAOS|SIDE CHARACTER|suspicious/i.test(q.kicker+' '+q.title):mood==='chill'?/SOFT|cloud|quiet|sound/i.test(q.kicker+' '+q.title):mood==='nature'?/NATURE|TREE|MINIATURE|rock/i.test(q.kicker+' '+q.title):mood==='social'?/world|compliment|color/i.test(q.kicker+' '+q.title):true);const pool=themed.length?themed:list;let q={...pool[Math.floor(Math.random()*pool.length)]};if(difficulty==='chaos'){q.xp+=15;q.kicker='CHAOS MODE · '+q.kicker;q.difficulty='Lovably unhinged'}else if(difficulty==='gentle'){q.xp=Math.max(25,q.xp-10);q.difficulty='Very gentle'}q.minutes=Math.min(q.minutes,duration);return q}
function paintQuest(q,source){state.current={...q,source,approved:false};$('quest-emoji').textContent=q.emoji||'🌱';$('quest-kicker').textContent=q.kicker||'A LITTLE ADVENTURE';$('quest-title').textContent=q.title;$('quest-description').textContent=q.description;$('quest-xp').textContent=q.xp;$('quest-difficulty').textContent=q.difficulty||'Easy does it';$('quest-time').textContent=q.minutes||$('duration').value;$('feedback').textContent='';$('complete-quest').disabled=false;$('complete-quest').innerHTML='Quest complete <span>✓</span>';closeEvidencePanel($('evidence-panel'));$('evidence-form').reset();$('evidence-preview').hidden=true;$('evidence-preview').innerHTML='';$('evaluation-result').textContent='';$('evaluation-result').className='evaluation-result';$('evaluate-quest').disabled=false;$('evaluate-quest').innerHTML='Evaluate my evidence <span>↗</span>';}
async function generateQuest(chaos=false){if(chaos){$('difficulty').value='chaos';state.chaosTried=true}const local=pickLocal();if(chaos){const q=fallbackQuests.filter(x=>/CHAOS|SIDE CHARACTER|COLOR|CLOUD/i.test(x.kicker+' '+x.title));paintQuest({...q[Math.floor(Math.random()*q.length)],kicker:'CHAOS MODE · '+q[Math.floor(Math.random()*q.length)].kicker,difficulty:'Lovably unhinged',xp:70},'local');$('quest-section').scrollIntoView({behavior:'smooth',block:'start'});updateBadges();return}paintQuest(local,'local');state.generating=true;$('complete-quest').disabled=true;$('complete-quest').setAttribute('aria-label','Quest is still being generated');$('quest-section').scrollIntoView({behavior:'smooth',block:'start'});try{$('reroll').textContent='✦ Asking the open model…';const res=await fetch((window.__HATCHABLE__?.api||'/api')+'/quest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mood:$('mood').value,minutes:Number($('duration').value),difficulty:$('difficulty').value})});if(!res.ok)throw new Error('AI unavailable');const data=await res.json();if(data.quest&&data.quest.title&&data.quest.description){paintQuest(data.quest,data.source||'open-model');if(data.source==='open-model')showToast('Fresh quest from the open-weight model ✨')}}catch(e){/* The offline-friendly local quest deck keeps the game playable. */}finally{state.generating=false;$('complete-quest').disabled=false;$('complete-quest').removeAttribute('aria-label');$('reroll').textContent='↻ Roll another quest'}}
function updateBadges(){const days=state.days.length;const rules=[['🌱','First Frolic','Complete your first quest',state.completed>=1],['🦉','Observant Bean','Complete 3 quests',state.completed>=3],['🌀','Certified Goof','Try chaos mode',state.chaosTried],['🔥','Touch Grass Twice','Frolic on 2 different days',days>=2],['🧭','Plot Armor','Complete 10 quests',state.completed>=10]];let count=0;$('badge-list').innerHTML=rules.map(([emoji,title,desc,ok])=>{if(ok)count++;return `<div class="achievement ${ok?'unlocked':'locked'}"><span>${emoji}</span><div><strong>${title}</strong><small>${desc}</small></div><i>${ok?'✓':'🔒'}</i></div>`}).join('');$('badge-count').textContent=count+' badge'+(count===1?'':'s');$('badge-total').textContent=count+' / 5';$('xp').textContent=state.xp;$('streak').textContent=days+' day'+(days===1?'':'s');$('level-progress').style.width=Math.min(100,state.xp%250/250*100)+'%';const level=Math.floor(state.xp/250)+1;document.querySelector('.level-pill>span').textContent='LEVEL '+String(level).padStart(2,'0');document.querySelector('.level-pill strong').textContent=['Sprout Scout','Curiosity Goblin','Trail Sprite','Outside Legend'][Math.min(level-1,3)];}
function showToast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.remove('show'),2600)}
function celebrateBloom(){if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const layer=document.createElement('div');layer.className='bloom-layer';layer.setAttribute('aria-hidden','true');document.body.appendChild(layer);const flowers=['🌼','🌸','🌺','🌷','✿','❀','🌻'];const count=Math.min(64,Math.max(36,Math.ceil(window.innerWidth/12)));for(let i=0;i<count;i++){const petal=document.createElement('span');petal.className='bloom-petal';petal.textContent=flowers[Math.floor(Math.random()*flowers.length)];petal.style.setProperty('--left',(Math.random()*100)+'%');petal.style.setProperty('--size',(16+Math.random()*22)+'px');petal.style.setProperty('--duration',(2.8+Math.random()*2.8)+'s');petal.style.setProperty('--delay',(Math.random()*.9)+'s');petal.style.setProperty('--sway',((Math.random()-.5)*160)+'px');layer.appendChild(petal)}setTimeout(()=>layer.remove(),7000)}
$('start-quest').addEventListener('click',()=>generateQuest());$('surprise').addEventListener('click',()=>generateQuest());$('reroll').addEventListener('click',()=>generateQuest());$('chaos-mode').addEventListener('click',()=>generateQuest(true));
$('complete-quest').addEventListener('click',event=>{event.preventDefault();if(state.generating){showToast('Your fresh quest is still arriving — one moment 🌱');return}if(!state.current){showToast('Pick a side quest first 🌱');return}if(state.current.approved){showToast('This quest is already approved ✨');return}const panel=$('evidence-panel');$('evidence-title').textContent=state.current.source==='group-camp'?'Show us your crew’s frolic.':'Show us your frolic.';openEvidencePanel(panel);$('complete-quest').setAttribute('aria-expanded','true');$('evaluation-result').className='evaluation-result';$('evaluation-result').textContent='Add a photo or video, write at least 20 characters, and tick both checkboxes to submit your quest.';requestAnimationFrame(()=>setTimeout(()=>$('evidence-file').focus(),150));});
$('cancel-evidence').addEventListener('click',()=>{closeEvidencePanel($('evidence-panel'));$('complete-quest').setAttribute('aria-expanded','false')});
$('evidence-panel').addEventListener('cancel',event=>{event.preventDefault();closeEvidencePanel($('evidence-panel'));$('complete-quest').setAttribute('aria-expanded','false');$('complete-quest').focus({preventScroll:true})});
$('evidence-file').addEventListener('change',()=>{const file=$('evidence-file').files[0];$('evidence-preview').innerHTML='';$('evidence-preview').hidden=true;if(!file)return;$('upload-label').textContent=file.name+' · '+(file.size/1024/1024).toFixed(1)+' MB';if(file.size>10*1024*1024){$('evaluation-result').textContent='That file is too large. Please choose something under 10 MB.';$('evaluation-result').className='evaluation-result error';return}const url=URL.createObjectURL(file);let media;if(file.type.startsWith('video/')){media=document.createElement('video');media.controls=true;media.src=url}else if(file.type.startsWith('image/')){media=document.createElement('img');media.src=url;media.alt='Quest evidence preview'}else return;$('evidence-preview').appendChild(media);$('evidence-preview').hidden=false;$('evaluation-result').textContent='';$('evaluation-result').className='evaluation-result'});
$('evidence-form').addEventListener('submit',async event=>{event.preventDefault();if(!state.current||state.current.approved)return;const file=$('evidence-file').files[0];if(!file)return;const result=$('evaluation-result');const submit=$('evaluate-quest');submit.disabled=true;submit.textContent='Reviewing your evidence…';result.className='evaluation-result';result.textContent='Checking your file, field notes, and safety checklist…';try{let explorerId=localStorage.getItem('frolic-explorer-id');if(!explorerId){explorerId=(crypto.randomUUID?crypto.randomUUID():'frolic_'+Math.random().toString(36).slice(2)+Date.now());localStorage.setItem('frolic-explorer-id',explorerId)}const form=new FormData();form.append('evidence',file);form.append('explorer_id',explorerId);form.append('quest_title',state.current.title);form.append('quest_xp',String(state.current.xp||50));form.append('reflection',$('reflection').value);form.append('noticed_check',$('noticed-check').checked?'true':'false');form.append('safe_check',$('safe-check').checked?'true':'false');const response=await fetch((window.__HATCHABLE__?.api||'/api')+'/submit-quest',{method:'POST',body:form});const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not evaluate this submission.');if(data.status!=='approved'||!data.evaluation?.passed)throw new Error('Your evidence needs another look. Please try again.');state.current.approved=true; await fetch('/api/individual-camp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({explorer_id:explorerId})}).catch(()=>{});if(state.current.source==='group-camp'&&groupCampQuest){groupCampQuest.approved=true;$('group-submit-quest-button').disabled=true;$('group-submit-quest-button').textContent='✓ Group quest submitted'}state.completed++;state.xp+=Number(data.xp_awarded)||Number(state.current.xp)||50;const today=new Date().toISOString().slice(0,10);if(!state.days.includes(today))state.days.push(today);$('feedback').textContent='Evidence checked! +'+(Number(data.xp_awarded)||state.current.xp)+' XP. Go you, little legend. ✨';$('complete-quest').disabled=true;$('complete-quest').textContent='✓ Evidence approved';result.className='evaluation-result success';result.innerHTML='<strong>Looks good — quest approved!</strong><br>'+data.evaluation.checks.map(x=>'✓ '+x).join('<br>')+'<br><br><small>Review checks that evidence is present and complete; it does not independently verify the scene in the photo/video.</small>';$('evidence-panel').scrollIntoView({behavior:'smooth',block:'center'});updateBadges();celebrateBloom();showToast('+'+(Number(data.xp_awarded)||state.current.xp)+' XP unlocked! 🌱')}catch(error){result.className='evaluation-result error';result.textContent=error.message||'Something went wrong. Please try again.'}finally{submit.disabled=false;submit.innerHTML='Evaluate my evidence <span>↗</span>'}});
// Progress is intentionally kept in this browser for the demo; no account or tracking server required.
try{const saved=JSON.parse(localStorage.getItem('frolic-save')||'null');if(saved){state.xp=saved.xp||0;state.completed=saved.completed||0;state.chaosTried=!!saved.chaosTried;state.days=saved.days||[];state.badges=new Set(saved.badges||[]);updateBadges()}}catch(e){}
const save=()=>{try{localStorage.setItem('frolic-save',JSON.stringify({xp:state.xp,completed:state.completed,chaosTried:state.chaosTried,days:state.days,badges:[...state.badges]}))}catch(e){}};
const originalUpdate=updateBadges;updateBadges=function(){originalUpdate();save()};paintQuest(fallbackQuests[0],'local');updateBadges();

// Tiny nature arcade — playful, self-contained mini-games. These do not grant quest XP.
const bingoThings=[['🍃','Interesting leaf'],['🐦','Bird in the sky'],['☁️','Cloud shape'],['🌼','Flower'],['🪨','Cool rock'],['🐜','Tiny insect'],['🌳','Big tree'],['🪶','Feather seen'],['🌈','Two greens']];
function setupBingo(event){event?.preventDefault();const grid=$('bingo-grid');if(!grid)return;const deck=[...bingoThings].sort(()=>Math.random()-.5);grid.innerHTML='';deck.forEach(([emoji,label])=>{const button=document.createElement('button');button.type='button';button.className='bingo-tile';button.innerHTML='<span>'+emoji+'</span>'+label;button.addEventListener('click',()=>{button.classList.toggle('spotted');const count=grid.querySelectorAll('.spotted').length;$('bingo-score').textContent=count+' / 9 spotted';if(count===9)showToast('Nature Bingo! You are observant royalty 🌿')});grid.appendChild(button)});$('bingo-score').textContent='0 / 9 spotted'}
$('bingo-reset')?.addEventListener('click',setupBingo);setupBingo();
const memoryFaces=['🍄','🌻','🐸','🦋','🍄','🌻','🐸','🦋'];
let memoryOpen=[],memoryPairs=0,memoryFlips=0,memoryLock=false;
function setupMemory(event){event?.preventDefault();const grid=$('memory-grid');if(!grid)return;memoryOpen=[];memoryPairs=0;memoryFlips=0;memoryLock=false;const deck=[...memoryFaces].sort(()=>Math.random()-.5);grid.innerHTML='';deck.forEach((face,index)=>{const button=document.createElement('button');button.type='button';button.className='memory-card hidden-card';button.textContent='✳';button.setAttribute('aria-label','Hidden nature card');button.dataset.face=face;button.addEventListener('click',()=>{if(memoryLock||button.classList.contains('matched')||memoryOpen.includes(button))return;button.classList.remove('hidden-card');button.textContent=face;button.setAttribute('aria-label',face);memoryOpen.push(button);memoryFlips++;$('memory-score').textContent=memoryPairs+' pairs · '+memoryFlips+' flips';if(memoryOpen.length===2){if(memoryOpen[0].dataset.face===memoryOpen[1].dataset.face){memoryOpen.forEach(card=>card.classList.add('matched'));memoryPairs++;memoryOpen=[];$('memory-score').textContent=memoryPairs+' pairs · '+memoryFlips+' flips';if(memoryPairs===4)showToast('All pairs found! Big brain, tiny frog 🐸')}else{memoryLock=true;setTimeout(()=>{memoryOpen.forEach(card=>{card.classList.add('hidden-card');card.textContent='✳';card.setAttribute('aria-label','Hidden nature card')});memoryOpen=[];memoryLock=false},650)}}});grid.appendChild(button)});$('memory-score').textContent='0 pairs · 0 flips'}
$('memory-reset')?.addEventListener('click',setupMemory);setupMemory();
const birdQuestions=[
 {q:'Why do many birds fluff up their feathers?',opts:['To trap warm air','To make themselves heavier','To hide their feet'],correct:0,fact:'Fluffed feathers trap a layer of air that helps insulate a bird.'},
 {q:'What is a safe way to watch a wild bird?',opts:['Chase it for a closer look','Stay back and observe quietly','Offer it bread by hand'],correct:1,fact:'Giving wildlife space keeps both you and the animal safer.'},
 {q:'Why do some birds sing at dawn?',opts:['To communicate and defend territory','To wake up flowers','To predict the weather perfectly'],correct:0,fact:'Birdsong can help birds attract mates and signal ownership of territory.'}
];let quizIndex=0,quizAnswered=false,quizScore=0;
function paintQuiz(){const item=birdQuestions[quizIndex];if(!item)return;$('quiz-question').textContent=item.q;document.querySelector('.quiz-count').textContent='QUESTION '+(quizIndex+1)+' / '+birdQuestions.length;$('quiz-feedback').textContent='';$('quiz-next').hidden=true;quizAnswered=false;const opts=$('quiz-options');opts.innerHTML='';item.opts.forEach((option,index)=>{const button=document.createElement('button');button.type='button';button.className='quiz-option';button.textContent=option;button.addEventListener('click',()=>{if(quizAnswered)return;quizAnswered=true;opts.querySelectorAll('button').forEach((b,i)=>{b.disabled=true;if(i===item.correct)b.classList.add('correct')});if(index===item.correct){quizScore++;button.classList.add('correct');$('quiz-feedback').textContent='Correct! '+item.fact}else{$('quiz-feedback').textContent='Not quite! '+item.fact;button.classList.add('wrong')}const next=$('quiz-next');next.hidden=false;next.textContent=quizIndex===birdQuestions.length-1?'Play again ↻':'Next question →'});opts.appendChild(button)})}
$('quiz-next')?.addEventListener('click',event=>{event.preventDefault();if(quizIndex===birdQuestions.length-1){quizIndex=0;quizScore=0}else quizIndex++;paintQuiz();if(quizIndex===0)showToast('Bird quiz reset. Stay curious! 🐦')});paintQuiz();

// Group camping: named invite links, explicit acceptance, and a shareable group code.
let activeInviteToken = '', activeCampCode = '', groupCampQuest = null;
const groupApi = async (payload) => {
  const response = await fetch((window.__HATCHABLE__?.api || '/api') + '/group-camping', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'The camp trail got a little muddy. Try again.');
  return data;
};
function setGroupMessage(message, error = false, target = 'group-message') { const el = $(target); if (!el) return; el.textContent = message; el.className = 'group-message' + (error ? ' error' : ''); }
function inviteUrl(inviteToken) { const url = new URL(window.location.href); url.searchParams.delete('campCode'); url.searchParams.set('campInvite', inviteToken); return url.toString(); }
async function copyText(value, success) { try { await navigator.clipboard.writeText(value); showToast(success); } catch { window.prompt('Copy this link:', value); } }
function renderCamp(data) {
  if (!data || !data.camp) return;
  $('group-create-wrap').hidden = true; $('group-accept-wrap').hidden = true; $('camp-dashboard').hidden = false;
  $('camp-dashboard-name').textContent = data.camp.name;
  $('camp-dashboard-quest').textContent = 'Quest: ' + data.camp.quest_title;
  if (!groupCampQuest || groupCampQuest.title !== data.camp.quest_title) groupCampQuest = {title:data.camp.quest_title,description:data.camp.quest_description||'',xp:50,emoji:'🏕️',kicker:'YOUR CREW, YOUR QUEST',difficulty:'Group quest',minutes:10,source:'group-camp',approved:false};
  $('group-submit-quest-button').disabled = !!groupCampQuest.approved;
  $('group-submit-quest-button').innerHTML = groupCampQuest.approved ? '✓ Group quest submitted' : '📸 Submit group quest <span>↗</span>';
  const location = (data.camp.location || '').trim(); const locationUrl = (data.camp.location_url || '').trim();
  $('camp-location-display').hidden = !location && !locationUrl; $('camp-location-name').textContent = location || 'Map pin shared by host';
  const validMapUrl = locationUrl.startsWith('https://') || locationUrl.startsWith('http://'); $('camp-location-link').hidden = !validMapUrl; $('camp-location-link').href = validMapUrl ? locationUrl : '#';
  $('camp-code').textContent = data.camp.invite_code;
  const invites = data.invites || []; $('invite-count').textContent = invites.length + ' invite' + (invites.length === 1 ? '' : 's') + ' · ' + invites.filter(i => i.status === 'accepted').length + ' accepted';
  const list = $('group-invite-list'); list.innerHTML = '';
  if (!invites.length) { list.innerHTML = '<p class="empty-invites">No invites yet. Add your first camp buddy! 🌼</p>'; return; }
  invites.forEach(invite => {
    const row = document.createElement('div'); row.className = 'group-invite-row';
    const person = document.createElement('div'); person.className = 'group-invite-person';
    const avatar = document.createElement('span'); avatar.className = 'group-invite-avatar'; avatar.textContent = invite.status === 'accepted' ? '🌼' : '💌';
    const details = document.createElement('div'); const name = document.createElement('strong'); name.textContent = invite.invitee_name; const stateLine = document.createElement('small'); stateLine.textContent = invite.status === 'accepted' ? 'They’re in! Ready to frolic.' : 'Waiting for their yes…'; details.append(name,stateLine); person.append(avatar,details);
    const actions = document.createElement('div'); actions.className = 'invite-actions'; const badge = document.createElement('span'); badge.className = 'invite-status' + (invite.status === 'accepted' ? ' accepted' : ''); badge.textContent = invite.status === 'accepted' ? 'ACCEPTED ✓' : 'PENDING'; actions.appendChild(badge);
    if (invite.status !== 'accepted') { const copy = document.createElement('button'); copy.type = 'button'; copy.className = 'mini-button'; copy.textContent = 'Copy invite link'; copy.addEventListener('click', () => copyText(inviteUrl(invite.invite_token), 'Invite link copied! Send it to ' + invite.invitee_name + ' 💌')); actions.appendChild(copy); }
    row.append(person,actions); list.appendChild(row);
  });
}
async function refreshCamp() { const hostToken = localStorage.getItem('frolic-group-host-token'); if (!hostToken) return; try { renderCamp(await groupApi({action:'details',host_token:hostToken})); } catch (error) { setGroupMessage(error.message, true); } }
function openGroupPanel() {
  const panel = $('group-camping-panel'); panel.hidden = false;
  $('group-open-button')?.setAttribute('aria-expanded','true'); $('group-hero-button')?.setAttribute('aria-expanded','true');
  panel.scrollIntoView({behavior:'smooth',block:'start'});
  const quest = state.current || fallbackQuests[0]; $('group-quest-title').textContent = quest.title; $('group-quest-description').textContent = quest.description;
  const hostToken = localStorage.getItem('frolic-group-host-token');
  if (hostToken) { $('group-create-wrap').hidden = true; $('group-accept-wrap').hidden = true; $('camp-dashboard').hidden = false; refreshCamp(); }
  else { $('group-create-wrap').hidden = false; $('camp-dashboard').hidden = true; }
}
$('group-open-button')?.addEventListener('click', openGroupPanel); $('group-hero-button')?.addEventListener('click', openGroupPanel);
$('group-submit-quest-button')?.addEventListener('click', () => {
  if (!groupCampQuest) { setGroupMessage('Create or refresh your camp first, then submit the group quest.',true); return; }
  if (groupCampQuest.approved) { showToast('Your group quest is already submitted 🌿'); return; }
  state.current = {...groupCampQuest, approved:false};
  $('evidence-title').textContent = 'Show us your crew’s frolic.';
  openEvidencePanel($('evidence-panel'));
  $('evaluation-result').textContent = 'Upload evidence from your group quest, add a field note, and complete the safety checks.';
  $('evaluation-result').className = 'evaluation-result';
  $('evidence-panel').scrollIntoView({behavior:'smooth',block:'start'});
  $('complete-quest').setAttribute('aria-expanded','true');
});
$('group-close-button')?.addEventListener('click', () => {
  $('group-camping-panel').hidden = true;
  $('group-open-button')?.setAttribute('aria-expanded','false'); $('group-hero-button')?.setAttribute('aria-expanded','false');
});
$('group-create-form')?.addEventListener('submit', async event => {
  event.preventDefault(); const button = $('create-camp-button'); button.disabled = true; button.textContent = 'Setting up camp…';
  try { const quest = state.current || fallbackQuests[0]; const data = await groupApi({action:'create',name:$('camp-name').value,host_name:$('host-name').value,location:$('camp-location').value,location_url:$('camp-location-url').value,quest_title:quest.title,quest_description:quest.description});
    localStorage.setItem('frolic-group-host-token',data.host_token); renderCamp(data); celebrateBloom(); setGroupMessage('Camp created! Invite your crew with a personal link or the group code. 🌿');
  } catch (error) { setGroupMessage(error.message,true); } finally { button.disabled = false; button.innerHTML = 'Create your camp <span>↗</span>'; }
});
$('group-invite-form')?.addEventListener('submit', async event => {
  event.preventDefault(); const button = $('send-invite-button'); button.disabled = true; button.textContent = 'Making invite…';
  try { const data = await groupApi({action:'invite',host_token:localStorage.getItem('frolic-group-host-token'),invitee_name:$('invitee-name').value}); $('invitee-name').value = ''; await refreshCamp(); setGroupMessage('Invite ready! Copy the link beside your friend’s name and send it to them. 💌');
  } catch (error) { setGroupMessage(error.message,true); } finally { button.disabled = false; button.innerHTML = 'Create invite link <span>↗</span>'; }
});
$('copy-camp-code')?.addEventListener('click', () => copyText($('camp-code').textContent, 'Group code copied! Share it with your crew 🌱')); $('refresh-camp-button')?.addEventListener('click', async () => { await refreshCamp(); showToast('Camp crew refreshed 🌿'); });
async function previewInvite(tokenValue) {
  activeInviteToken = tokenValue || ''; activeCampCode = ''; $('group-camping-panel').hidden = false; $('group-create-wrap').hidden = true; $('camp-dashboard').hidden = true; $('group-accept-wrap').hidden = false; $('group-camping-panel').scrollIntoView({behavior:'smooth',block:'start'});
  try { const data = await groupApi({action:'preview_invite',invite_token:activeInviteToken}); const invite = data.invite; $('accept-camp-name').textContent = invite.camp_name + ' wants you on the team!'; $('accept-camp-details').textContent = invite.host_name + ' invited you to “' + invite.quest_title + '”. ' + (invite.quest_description || 'A tiny outdoor quest is waiting.') + (invite.location ? ' Meet at: ' + invite.location + '.' : ''); const inviteMap = (invite.location_url || '').trim(); const inviteMapValid = inviteMap.startsWith('https://') || inviteMap.startsWith('http://'); $('accept-location-link').hidden = !inviteMapValid; $('accept-location-link').href = inviteMapValid ? inviteMap : '#'; if (!$('guest-name').value) $('guest-name').value = invite.invitee_name || '';
    if (invite.status === 'accepted') { setGroupMessage('This invitation has already been accepted. You’re all set!', false, 'accept-message'); $('accept-invite-button').disabled = true; } else { $('accept-invite-button').disabled = false; setGroupMessage('Your spot is waiting. Add your name and accept to join the crew.',false,'accept-message'); }
  } catch (error) { setGroupMessage(error.message,true,'accept-message'); $('accept-invite-button').disabled = true; }
}
$('group-code-form')?.addEventListener('submit', async event => {
  event.preventDefault(); try { const code = $('group-code-input').value.trim().toUpperCase(); const data = await groupApi({action:'preview_code',invite_code:code}); activeCampCode = data.invite_code; activeInviteToken = ''; $('accept-camp-name').textContent = data.invite.camp_name + ' is inviting you in!'; $('accept-camp-details').textContent = data.invite.host_name + ' is gathering a crew for “' + data.invite.quest_title + '”. ' + (data.invite.quest_description || 'A tiny outdoor quest awaits.') + (data.invite.location ? ' Meet at: ' + data.invite.location + '.' : ''); const codeMap = (data.invite.location_url || '').trim(); const codeMapValid = codeMap.startsWith('https://') || codeMap.startsWith('http://'); $('accept-location-link').hidden = !codeMapValid; $('accept-location-link').href = codeMapValid ? codeMap : '#'; $('accept-invite-button').disabled = false; setGroupMessage('Camp found! Add your name below and accept to join.',false,'accept-message');
  } catch (error) { setGroupMessage(error.message,true,'accept-message'); }
});
$('group-accept-form')?.addEventListener('submit', async event => {
  event.preventDefault(); const button = $('accept-invite-button'); button.disabled = true; button.textContent = 'Joining the crew…';
  try { const data = await groupApi({action:'accept',invite_token:activeInviteToken,invite_code:activeCampCode,guest_name:$('guest-name').value}); setGroupMessage('You’re in, ' + data.guest_name + '! Your crew has been notified when the host refreshes their camp list. See you outside! 🏕️',false,'accept-message'); celebrateBloom(); button.textContent = '✓ Invitation accepted';
  } catch (error) { setGroupMessage(error.message,true,'accept-message'); button.disabled = false; button.innerHTML = 'Accept invitation <span>✓</span>'; }
});
(function checkGroupInviteLink() { const params = new URLSearchParams(window.location.search); const tokenValue = params.get('campInvite'); const code = params.get('campCode'); if (tokenValue) { previewInvite(tokenValue); } else if (code) { $('group-camping-panel').hidden = false; $('group-create-wrap').hidden = true; $('camp-dashboard').hidden = true; $('group-accept-wrap').hidden = false; $('group-code-input').value = code; $('group-code-form').requestSubmit(); } })();

// A little flock takes off wherever you click. Kept lightweight and decorative.
(function addFrolicBirds(){
  const layer=document.createElement('div');
  layer.className='bird-burst-layer';
  layer.setAttribute('aria-hidden','true');
  document.body.appendChild(layer);
  const birds=['🐦','🐦‍⬛','🐤','🕊️'];
  let lastBurst=0;
  document.addEventListener('pointerdown',event=>{
    if(event.button!==0||event.target.closest('input,select,textarea'))return;
    const now=Date.now();
    if(now-lastBurst<180)return;
    lastBurst=now;
    const x=event.clientX,y=event.clientY;
    const ripple=document.createElement('i');
    ripple.className='click-ripple';ripple.style.setProperty('--x',x+'px');ripple.style.setProperty('--y',y+'px');layer.appendChild(ripple);
    setTimeout(()=>ripple.remove(),700);
    for(let i=0;i<4;i++){
      const bird=document.createElement('span');
      bird.className='frolic-bird';bird.textContent=birds[(Math.random()*birds.length)|0];
      const angle=(-Math.PI/2)+(i/4)*Math.PI*2+(Math.random()-.5)*.55;
      const distance=65+Math.random()*95;
      bird.style.setProperty('--x',x+'px');bird.style.setProperty('--y',y+'px');
      bird.style.setProperty('--dx',Math.cos(angle)*distance+'px');bird.style.setProperty('--dy',Math.sin(angle)*distance+'px');
      bird.style.setProperty('--dur',(1.35+Math.random()*.75)+'s');bird.style.setProperty('--size',(19+Math.random()*12)+'px');
      layer.appendChild(bird);setTimeout(()=>bird.remove(),2300);
    }
    for(let i=0;i<2;i++){
      const sparkle=document.createElement('span');sparkle.className='click-sparkle';sparkle.textContent=i?'✦':'✳';
      sparkle.style.setProperty('--x',x+'px');sparkle.style.setProperty('--y',y+'px');
      sparkle.style.setProperty('--dx',(Math.random()-.5)*90+'px');sparkle.style.setProperty('--dy',(Math.random()-.5)*90+'px');
      layer.appendChild(sparkle);setTimeout(()=>sparkle.remove(),850);
    }
  },{passive:true});
})();