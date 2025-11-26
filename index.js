import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

// ENV
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID; // Where messages should go
const API_FOOTBALL = process.env.API_FOOTBALL;
const ALL_SPORTS_API = process.env.ALL_SPORTS_API;

// Telegram API Send Message
async function sendMessage(msg) {
  await axios.get(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      params: { chat_id: CHAT_ID, text: msg },
    }
  );
}

// Fetch match list
async function fetchLiveMatches() {
  try {
    // API Football Live matches
    const res = await axios.get("https://v3.football.api-sports.io/fixtures", {
      params: { live: "all" },
      headers: { "x-apisports-key": API_FOOTBALL },
    });

    if (res.data.response.length > 0) {
      return res.data.response;
    }

    // Fallback – All Sports API
    const fallback = await axios.get(
      `https://allsportsapi.com/api/football/?met=Livescore&APIkey=${ALL_SPORTS_API}`
    );

    return fallback.data.result || [];
  } catch (err) {
    console.log("Error:", err);
    return [];
  }
}

// Over/Under Calculation Function
function calculateProbabilities(stats) {
  const goals = stats.goals;

  return {
    "over_0.5": goals > 0 ? 95 : 60,
    "over_1.5": goals >= 1 ? 88 : 55,
    "over_2.5": goals >= 2 ? 82 : 45,
    "over_3.5": goals >= 3 ? 75 : 40,
    "over_4.5": goals >= 4 ? 68 : 35,
    "over_5.5": goals >= 5 ? 60 : 30,
    "under_2.5": goals <= 2 ? 85 : 40,
    "under_1.5": goals <= 1 ? 80 : 45,
  };
}

// Find 85%+ Prediction
function selectConfirmedBet(prob) {
  let best = null;

  for (const key in prob) {
    if (prob[key] >= 85) {
      best = { market: key, confidence: prob[key] };
    }
  }

  return best;
}

// Main Auto Job
async function autoPredict() {
  const matches = await fetchLiveMatches();

  if (matches.length === 0) return;

  for (let m of matches) {
    const home = m.teams?.home?.name || m.event_home_team;
    const away = m.teams?.away?.name || m.event_away_team;
    const goals =
      (m.goals?.home || m.event_final_result?.split("-")[0] || 0) +
      (m.goals?.away || m.event_final_result?.split("-")[1] || 0);

    const stats = { goals };

    const probabilities = calculateProbabilities(stats);
    const confirm = selectConfirmedBet(probabilities);

    let msg = `⚽ LIVE MATCH\n${home} vs ${away}\nGoals: ${goals}\n\n📊 Probabilities:\n`;

    for (let key in probabilities) {
      msg += `${key}: ${probabilities[key]}%\n`;
    }

    if (confirm) {
      msg += `\n🔥 CONFIRMED 85%+ BET:\n➡️ ${confirm.market.toUpperCase()} (${confirm.confidence}%)`;
    } else {
      msg += `\n❌ No 85%+ Market Found`;
    }

    await sendMessage(msg);
  }
}

// Cron Job – Every 6 Minutes
setInterval(autoPredict, 360000);

// Start
console.log("Bot is running...");
