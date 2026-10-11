export const access = "public";
export const methods = ["POST"];

const fallback = [
  { emoji: "🍃", kicker: "THE ART OF NOTICING", title: "Become a tiny nature detective.", description: "Find three things growing through a crack, between bricks, or somewhere they absolutely weren't invited. Nature said watch me.", xp: 50, difficulty: "Easy does it", minutes: 10 },
  { emoji: "☁️", kicker: "CLOUD WITH A CHANCE OF YAPPING", title: "Find a cloud with a backstory.", description: "Look up safely and find a cloud that resembles something ridiculous. Give it a name, a job, and one deeply inconvenient secret.", xp: 45, difficulty: "Gentle", minutes: 5 },
  { emoji: "🕵️", kicker: "LOW-STAKES INVESTIGATION", title: "Investigate a suspiciously interesting rock.", description: "Find a rock, leaf, or seed that looks like it has lore. Inspect it like a tiny detective. Please leave living things where they are.", xp: 40, difficulty: "Gentle", minutes: 5 },
  { emoji: "🎨", kicker: "COLOR HUNTER", title: "Find a color palette IRL.", description: "Choose a color and find three safe things around you that match it. Behold: art. No collecting required.", xp: 50, difficulty: "Easy does it", minutes: 10 },
  { emoji: "🌳", kicker: "TREE APPRECIATION SOCIETY", title: "Meet a tree (respectfully).", description: "Find a tree from a public path. Notice its shape, bark, and the life around it. Give it an extremely formal title, like Sir Branchington III.", xp: 55, difficulty: "Nature nerd", minutes: 10 }
];

export default async function (req, res) {
  const body = req.body || {};
  const mood = ["curious", "chaotic", "chill", "social", "nature"].includes(body.mood) ? body.mood : "curious";
  const minutes = [5, 10, 20, 30].includes(Number(body.minutes)) ? Number(body.minutes) : 10;
  const difficulty = ["gentle", "normal", "chaos"].includes(body.difficulty) ? body.difficulty : "normal";
  const local = fallback.filter(q => q.minutes <= minutes);
  const safeFallback = (local.length ? local : fallback)[Math.floor(Math.random() * (local.length ? local : fallback).length)];
  const token = typeof process !== "undefined" ? process.env.HF_TOKEN : "";
  if (!token) return res.json({ quest: { ...safeFallback, minutes: Math.min(safeFallback.minutes, minutes) }, source: "local-fallback", note: "Add HF_TOKEN in project secrets to enable open-weight generation." });
  try {
    const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(18000),
      body: JSON.stringify({
        model: "Qwen/Qwen2.5-7B-Instruct",
        temperature: difficulty === "chaos" ? 1.05 : 0.85,
        max_tokens: 280,
        messages: [
          { role: "system", content: "You are Frolic, a witty, warm, slightly mischievous outdoor side-quest designer. Return ONLY valid JSON with keys emoji,kicker,title,description,xp,difficulty,minutes. Create ONE achievable, safe, real-world outdoor mission. Keep it playful, specific, inclusive, and screen-light. Never suggest trespassing, touching unknown wildlife, eating plants/mushrooms, unsafe roads, or approaching strangers. Do not require purchases or a phone. description max 45 words. xp integer 25-90. minutes integer no greater than requested. kicker max 5 words." },
          { role: "user", content: `Create a fresh outdoor quest. Mood: ${mood}. Time limit: ${minutes} minutes. Chaos setting: ${difficulty}. Return JSON only.` }
        ]
      })
    });
    if (!response.ok) throw new Error(`Hugging Face returned ${response.status}`);
    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";
    const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(clean.slice(clean.indexOf("{"), clean.lastIndexOf("}") + 1));
    if (typeof parsed.title !== "string" || typeof parsed.description !== "string") throw new Error("Invalid model response");
    const quest = {
      emoji: String(parsed.emoji || "🌱").slice(0, 8),
      kicker: String(parsed.kicker || "A LITTLE ADVENTURE").slice(0, 50),
      title: parsed.title.slice(0, 100),
      description: parsed.description.slice(0, 320),
      xp: Math.max(25, Math.min(90, Math.round(Number(parsed.xp) || 50))),
      difficulty: String(parsed.difficulty || difficulty).slice(0, 40),
      minutes: Math.max(1, Math.min(minutes, Math.round(Number(parsed.minutes) || minutes)))
    };
    return res.json({ quest, source: "open-model", model: "Qwen/Qwen2.5-7B-Instruct" });
  } catch (error) {
    return res.json({ quest: { ...safeFallback, minutes: Math.min(safeFallback.minutes, minutes) }, source: "local-fallback", note: "The open model is unavailable right now; here's a quest so the adventure can continue." });
  }
}