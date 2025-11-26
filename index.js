import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js";
import dotenv from "dotenv";
import axios from "axios";
import moment from "moment-timezone";

dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Slash commands
const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
  new SlashCommandBuilder().setName('predict').setDescription('Get football predictions'),
  new SlashCommandBuilder().setName('help').setDescription('Show all commands'),
].map(cmd => cmd.toJSON());

// Register commands
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
async function registerCommands() {
  try {
    await rest.put(Routes.applicationCommands(client.user?.id || 'your_bot_id_here'), { body: commands });
    console.log('✅ Slash commands registered!');
  } catch (e) { console.error(e); }
}

// Prediction logic
async function fetchMatches() {
  const matches = [];
  // Fetch from API-Football + AllSportsAPI + 3 more
  // matches.push(...data)
  return matches;
}

function analyzeMatch(match) {
  // Convert time to Pakistan
  const pkTime = moment.utc(match.utcDate).tz('Asia/Karachi').format('YYYY-MM-DD HH:mm');
  
  // Example: calculate probabilities
  const prob = {
    "over_2.5": 90,
    "under_2.5": 45,
    "btts_yes": 88,
    "win_home": 85,
    "last_10_min": "Likely"
  };

  const bestBet = Object.entries(prob).filter(([k,v]) => v >= 85);

  return { match: `${match.home} vs ${match.away}`, pkTime, prob, bestBet };
}

// Send prediction to Discord
async function sendPredictionToDiscord(prediction) {
  const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
  let msg = `⚽ **${prediction.match}** (${prediction.pkTime} PKT)\n`;
  for (let [k,v] of Object.entries(prediction.prob)) msg += `${k}: ${v}\n`;
  if(prediction.bestBet.length > 0) msg += `🔥 85%+ Bet: ${prediction.bestBet.map(b => b[0]).join(', ')}\n`;
  await channel.send(msg);
}

// Auto job every 5 min
setInterval(async () => {
  const matches = await fetchMatches();
  for (let m of matches) {
    const prediction = analyzeMatch(m);
    await sendPredictionToDiscord(prediction);
  }
}, 300000);

// Slash command handler
client.on('interactionCreate', async interaction => {
  if(!interaction.isChatInputCommand()) return;
  if(interaction.commandName === 'ping') await interaction.reply('🏓 Pong!');
  if(interaction.commandName === 'help') await interaction.reply('Commands: /ping, /predict, /help');
  if(interaction.commandName === 'predict') {
    const matches = await fetchMatches();
    const predictions = matches.map(analyzeMatch);
    let msg = predictions.map(p => `⚽ ${p.match} - Best Bet: ${p.bestBet.map(b => b[0]).join(', ') || 'None'}`).join('\n');
    await interaction.reply(msg || 'No matches available.');
  }
});

client.once('ready', async () => {
  console.log(`✅ ${client.user.tag} is online!`);
  await registerCommands();
});

client.login(process.env.TOKEN);
