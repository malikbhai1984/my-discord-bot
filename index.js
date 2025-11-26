// index.js (ES module)
import 'dotenv/config';
import fetch from 'node-fetch';
import moment from 'moment-timezone';
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

/* ---------- CONFIG ---------- */
const CHANNEL_ID = process.env.CHANNEL_ID; // channel where automatic messages will go
const API_FOOTBALL_KEY = process.env.API_FOOTBALL;
const ALL_SPORT_KEY = process.env.ALL_SPORT_API;
const PK_TZ = 'Asia/Karachi';

// Top 8 leagues (use league IDs or slugs matching your API — adjust if needed)
const TOP_LEAGUES = [
  // fill with league IDs or slugs your API expects; these are placeholders you can adapt
  { name: 'Premier League', id: 39 },
  { name: 'La Liga', id: 140 },
  { name: 'Serie A', id: 135 },
  { name: 'Bundesliga', id: 78 },
  { name: 'Ligue 1', id: 61 },
  { name: 'Eredivisie', id: 88 },
  { name: 'Primeira Liga', id: 94 },
  { name: 'MLS', id: 253 }
];

// WC Qualifiers indicator (we will request competitions by name or code)
const WC_QUALIFIERS = { season: moment().year(), nameContains: 'World Cup' };

/* ---------- state for API hits / throttling ---------- */
const apiStats = {
  apiFootball: { calls: 0, lastReset: Date.now() },
  allSport: { calls: 0, lastReset: Date.now() }
};
function incApi(apiName) {
  const stat = apiStats[apiName];
  if (!stat) return;
  stat.calls++;
  // reset daily
  if (Date.now() - stat.lastReset > 24 * 3600 * 1000) {
    stat.calls = 1;
    stat.lastReset = Date.now();
  }
}

/* ---------- Utilities: Poisson & probability ---------- */
function factorial(n) { if (n < 2) return 1; let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; }
function poissonProb(k, lambda) { return Math.pow(lambda, k) * Math.exp(-lambda) / factorial(k); }

// probability total goals > threshold (threshold may be 0.5, 1.5 etc)
// we compute convolution of two independent Poisson (home and away) -> total is Poisson(lambda=λh+λa)
function probOver(threshold, lambdaTotal) {
  // threshold like 0.5 means Over 0.5 => P(total >= 1)
  const minGoals = Math.floor(threshold + 0.0001) + 1; // e.g. 0.5 -> 1, 1.5 -> 2
  let p = 0;
  for (let k = minGoals; k <= Math.max(20, minGoals + 10); k++) { // cap loop
    p += poissonProb(k, lambdaTotal);
  }
  return p;
}

// BTTS = 1 - (P(home scores 0) + P(away scores 0) - P(both score 0))
// But simpler: P(home>0 and away>0) = 1 - P(home==0) - P(away==0) + P(both==0)
function probBTTS(lambdaHome, lambdaAway) {
  const pHome0 = poissonProb(0, lambdaHome);
  const pAway0 = poissonProb(0, lambdaAway);
  const pBoth0 = pHome0 * pAway0;
  return 1 - pHome0 - pAway0 + pBoth0;
}

/* ---------- Helpers: API fetchers ---------- */
// NOTE: these use the most common API endpoints. If your chosen APIs use different paths, replace as needed.

// 1) API-Football (api-sports) — fetch fixtures for today and recent team stats
async function fetchFromApiFootball(dateISO) {
  if (!API_FOOTBALL_KEY) return [];
  try {
    const url = `https://v3.football.api-sports.io/fixtures?date=${dateISO}`;
    const res = await fetch(url, {
      headers: { 'x-apisports-key': API_FOOTBALL_KEY }
    });
    incApi('apiFootball');
    const json = await res.json();
    if (!json || !json.response) return [];
    // Normalize: extract fixtures
    return json.response.map(f => ({
      id: `af-${f.fixture.id}`,
      source: 'api-football',
      league: f.league?.name || f.league?.id,
      leagueId: f.league?.id,
      home: f.teams.home.name,
      away: f.teams.away.name,
      kickoffUTC: f.fixture.date,
      status: f.fixture.status?.short || f.fixture.status?.long,
      // some useful fields if present:
      goalsHome: f.goals?.home,
      goalsAway: f.goals?.away,
      // attach raw object for later deeper stats queries
      raw: f
    }));
  } catch (err) {
    console.error('API-Football fetch error', err);
    return [];
  }
}

// 2) All-Sport-API (example) — you must plug the real endpoint/params you plan to use
async function fetchFromAllSportAPI(dateISO) {
  if (!ALL_SPORT_KEY) return [];
  try {
    // Placeholder endpoint — most "all-sport" APIs will have a fixtures endpoint filtered by date
    const url = `https://api.all-sports.xyz/fixtures?date=${dateISO}&apikey=${ALL_SPORT_KEY}`;
    const res = await fetch(url);
    incApi('allSport');
    const json = await res.json();
    if (!json || !json.result) return [];
    // Normalize according to common schema
    return json.result.map(f => ({
      id: `as-${f.fixture_id || f.id}`,
      source: 'all-sport',
      league: f.league?.name || f.competition,
      leagueId: f.league?.id || f.league?.league_id,
      home: f.home?.name || f.home_team,
      away: f.away?.name || f.away_team,
      kickoffUTC: f.event_time || f.fixture_date || f.kickoff_utc,
      status: f.status || 'NS',
      goalsHome: f.home?.goals ?? f.goals_home,
      goalsAway: f.away?.goals ?? f.goals_away,
      raw: f
    }));
  } catch (err) {
    console.error('All-Sport API fetch error', err);
    return [];
  }
}

/* ---------- Helper: dedupe and filter top leagues + WC qualifiers ---------- */
function mergeAndFilterMatches(listA, listB) {
  const all = [...listA, ...listB];
  const map = new Map();
  for (const m of all) {
    const key = (m.home + '|' + m.away + '|' + (m.kickoffUTC || '')).toLowerCase();
    if (!map.has(key)) map.set(key, m);
  }
  // Filter top leagues + WC qualifiers: if leagueId matches TOP_LEAGUES or league name contains "World Cup" or qualifiers
  const filtered = [];
  for (const m of map.values()) {
    const leagueMatch = TOP_LEAGUES.some(l => String(m.leagueId) === String(l.id) || (m.league && m.league.includes(l.name)));
    const isWCQual = m.league && /(World Cup|WC Qualifier|Qualifier|FIFA)/i.test(m.league);
    if (leagueMatch || isWCQual) filtered.push(m);
  }
  return filtered;
}

/* ---------- Helper: estimate expected goals from recent data (heuristic) ---------- */
/*
  Strategy:
  - Prefer API-provided xG or expected goals if available (api-football sometimes includes team stats).
  - Otherwise compute from recent goals average (last N fixtures). We'll try to fetch last 6 fixtures for each team if API supports it (via raw data).
  - Fallback: league average total goals (~2.6) split 50/50.
*/
async function estimateExpectedGoals(match) {
  // If api-football raw provides stats like 'xG' or 'expected_goals', use it
  try {
    // 1) If API-Football raw contains team statistics or predicted values, use them
    const raw = match.raw;
    if (raw && raw.teams && raw.goals && typeof raw.goals.home === 'number') {
      // quick fallback: use last match goals as base (not perfect)
      const homeRecent = raw.teams.home;
      const awayRecent = raw.teams.away;
    }

    // 2) Try to compute from recent fixtures if available in raw.league or raw.teams -- these APIs vary greatly.
    // We'll attempt to query API-Football for last 6 fixtures if match.raw has fixture/team ids
    if (match.raw && match.raw.teams && match.raw.teams.home?.id) {
      // attempt to fetch last results for home and away from API-Football
      try {
        const homeId = match.raw.teams.home.id;
        const awayId = match.raw.teams.away.id;
        const resH = await fetch(`https://v3.football.api-sports.io/fixtures?team=${homeId}&last=6`, {
          headers: { 'x-apisports-key': API_FOOTBALL_KEY }
        });
        incApi('apiFootball');
        const jsonH = await resH.json();
        const homeGoals = (jsonH.response || []).map(r => r.goals.home).filter(g => g !== null && g !== undefined);
        const avgHome = homeGoals.length ? homeGoals.reduce((a,b)=>a+b,0)/homeGoals.length : 1.2;

        const resA = await fetch(`https://v3.football.api-sports.io/fixtures?team=${awayId}&last=6`, {
          headers: { 'x-apisports-key': API_FOOTBALL_KEY }
        });
        incApi('apiFootball');
        const jsonA = await resA.json();
        const awayGoals = (jsonA.response || []).map(r => r.goals.away).filter(g => g !== null && g !== undefined);
        const avgAway = awayGoals.length ? awayGoals.reduce((a,b)=>a+b,0)/awayGoals.length : 1.0;

        // small adjustment based on home advantage
        const lambdaHome = Math.max(0.1, avgHome * 1.05);
        const lambdaAway = Math.max(0.05, avgAway * 0.95);
        return { lambdaHome, lambdaAway };
      } catch (err) {
        // fallback below
      }
    }
  } catch (err) {
    // ignore and fallback
  }

  // Fallback: use league average split
  const leagueAvgTotal = 2.6; // typical average total goals
  return { lambdaHome: leagueAvgTotal/2, lambdaAway: leagueAvgTotal/2 };
}

/* ---------- Prediction calc for a single match ---------- */
async function analyzeMatch(match) {
  // estimate expected goals per team (λ_home, λ_away)
  const { lambdaHome, lambdaAway } = await estimateExpectedGoals(match);
  const lambdaTotal = lambdaHome + lambdaAway;

  // compute over/under probabilities for thresholds 0.5..5.5 (step 0.5)
  const thresholds = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5];
  const markets = thresholds.map(th => {
    const pOver = probOver(th, lambdaTotal);
    return { threshold: th, pOver, pUnder: 1 - pOver };
  });

  // compute Win/Draw/Loss probabilities approximated from Poisson
  // P(home score = i) and P(away score = j) => nested sum
  const maxGoalsCalc = 8;
  const homeDist = Array.from({length: maxGoalsCalc+1}, (_,k)=>poissonProb(k, lambdaHome));
  const awayDist = Array.from({length: maxGoalsCalc+1}, (_,k)=>poissonProb(k, lambdaAway));
  let pHomeWin = 0, pDraw = 0, pAwayWin = 0;
  for (let i=0;i<=maxGoalsCalc;i++){
    for (let j=0;j<=maxGoalsCalc;j++){
      const prob = homeDist[i]*awayDist[j];
      if (i>j) pHomeWin += prob;
      else if (i===j) pDraw += prob;
      else pAwayWin += prob;
    }
  }

  // BTTS probability
  const pBTTS = probBTTS(lambdaHome, lambdaAway);

  // Last 10 minutes heuristic:
  // - If expected total goals > 0.8 and match close, small boost. This is a rough heuristic:
  // We'll estimate last-10-min probability as proportional to lambdaTotal * 10/90 but boosted if high tempo.
  const last10Prob = Math.min(0.6, Math.max(0.02, (lambdaTotal * (10/90)) * (1 + Math.abs(lambdaHome - lambdaAway)/Math.max(0.1, lambdaTotal))));

  // Determine which team likely to score in last 10 (simple: higher λ)
  const last10Likely = lambdaHome > lambdaAway ? match.home : (lambdaAway > lambdaHome ? match.away : 'Either');

  // Choose markets with >=85% confidence (either Over OR Under)
  const strongMarkets = markets
    .map(m => {
      const which = m.pOver >= 0.85 ? { side: `Over ${m.threshold}`, prob: m.pOver } : (m.pUnder >= 0.85 ? { side: `Under ${m.threshold}`, prob: m.pUnder } : null);
      return which ? { threshold: m.threshold, ...which } : null;
    })
    .filter(x => x);

  return {
    match: `${match.home} vs ${match.away}`,
    kickoffPKT: match.kickoffUTC ? moment(match.kickoffUTC).tz(PK_TZ).format('YYYY-MM-DD HH:mm') : 'TBD',
    lambdaHome, lambdaAway, lambdaTotal,
    winProb: { home: pHomeWin, draw: pDraw, away: pAwayWin },
    bttsProb: pBTTS,
    last10Prob, last10Likely,
    strongMarkets
  };
}

/* ---------- Main flow: fetch, analyze and send ---------- */
async function fetchAnalyzeAndSend() {
  try {
    console.log('--- Fetching matches (APIs) @', new Date().toISOString());
    const dateISO = moment().format('YYYY-MM-DD');

    // 1) fetch
    const [a, b] = await Promise.all([ fetchFromApiFootball(dateISO), fetchFromAllSportAPI(dateISO) ]);
    console.log('Fetched', a.length, 'from api-football and', b.length, 'from all-sport');

    // 2) merge & filter
    const matches = mergeAndFilterMatches(a, b);
    console.log('Filtered matches count (top leagues + WC qualifiers):', matches.length);
    if (!matches.length) {
      console.log('No matches found for top leagues / WC qualifiers today.');
      return;
    }

    // 3) analyze all matches (concurrently with limit)
    const analysis = [];
    for (const match of matches) {
      try {
        const result = await analyzeMatch(match);
        analysis.push({ match, result });
      } catch (err) {
        console.error('Error analyzing match', match, err);
      }
    }

    // 4) prepare message: only include matches which have at least one strong market >=85%
    const messages = [];
    for (const aRes of analysis) {
      const r = aRes.result;
      if (r.strongMarkets && r.strongMarkets.length) {
        const marketsText = r.strongMarkets.map(m => `• ${m.side} — ${(m.prob*100).toFixed(1)}%`).join('\n');
        const winText = `WinProb H/D/A: ${(r.winProb.home*100).toFixed(1)}% / ${(r.winProb.draw*100).toFixed(1)}% / ${(r.winProb.away*100).toFixed(1)}%`;
        const msg = `⚽ **${aRes.match}** (${r.kickoffPKT} PKT)\n${marketsText}\nBTTS: ${(r.bttsProb*100).toFixed(1)}%\nLast 10-min goal: ${(r.last10Prob*100).toFixed(1)}% (likely: ${r.last10Likely})\n${winText}`;
        messages.push(msg);
      }
    }

    // 5) send to Discord channel
    if (messages.length) {
      const channel = await client.channels.fetch(CHANNEL_ID);
      if (channel && channel.isTextBased && channel.isTextBased()) {
        // Discord message length control
        const payload = `🎯 **High-confidence markets (≥85%) — Updated ${moment().tz(PK_TZ).format('YYYY-MM-DD HH:mm')} PKT**\n\n` + messages.join('\n\n---\n\n');
        await channel.send(payload);
        console.log('Sent', messages.length, 'match messages to Discord.');
      } else {
        console.warn('Channel not found or not text-based.');
      }
    } else {
      console.log('No 85%+ markets found at this time.');
    }

    // 6) log API stats
    console.log('API call counters:', JSON.stringify(apiStats));
  } catch (err) {
    console.error('Error in fetchAnalyzeAndSend:', err);
  }
}

/* ---------- Scheduling every 5-7 minutes with random jitter ---------- */
let schedulerActive = false;
async function scheduleLoop() {
  if (schedulerActive) return;
  schedulerActive = true;
  async function loop() {
    await fetchAnalyzeAndSend();
    // next run between 5 and 7 minutes
    const nextMs = (5 * 60 * 1000) + Math.floor(Math.random() * (2 * 60 * 1000)); // 300k to 420k
    console.log(`Next fetch in ${(nextMs/60000).toFixed(2)} minutes`);
    setTimeout(loop, nextMs);
  }
  loop();
}

/* ---------- Slash commands registration (small) ---------- */
const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
  new SlashCommandBuilder().setName('predict').setDescription('Get current predictions now'),
  new SlashCommandBuilder().setName('help').setDescription('Show help')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
async function registerCommands() {
  try {
    await rest.put(Routes.applicationCommands(client.user?.id || 'your_bot_id_here'), { body: commands });
    console.log('Slash commands registered.');
  } catch (err) {
    console.error('Failed to register commands', err);
  }
}

/* ---------- Interaction handling ---------- */
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'ping') return interaction.reply('🏓 Pong!');
  if (interaction.commandName === 'help') return interaction.reply('`/predict` to fetch live high-confidence markets now.');
  if (interaction.commandName === 'predict') {
    await interaction.deferReply({ ephemeral: false });
    await fetchAnalyzeAndSend();
    return interaction.editReply('✅ Prediction update posted to channel (and logs).');
  }
});

/* ---------- Client ready ---------- */
client.once('ready', async () => {
  console.log(`${client.user.tag} ready — starting scheduler.`);
  await registerCommands();
  scheduleLoop();
});

/* ---------- Login ---------- */
client.login(process.env.TOKEN);
