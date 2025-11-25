

import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  
  new SlashCommandBuilder()
    .setName('predict')
    .setDescription('Get football predictions'),
  
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all commands'),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

// Register slash commands
async function registerCommands() {
  try {
    console.log('📋 Registering slash commands...');
    
    await rest.put(
      Routes.applicationCommands(client.user?.id || 'your_bot_id_here'),
      { body: commands }
    );
    
    console.log('✅ Slash commands registered!');
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
}

client.once('ready', async () => {
  console.log(`✅ ${client.user.tag} is online!`);
  await registerCommands();
});

// Handle slash commands
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  console.log(`🎯 Command: /${interaction.commandName}`);

  if (interaction.commandName === 'ping') {
    await interaction.reply('🏓 Pong! Slash command working! 🎉');
  }

  if (interaction.commandName === 'predict') {
    const predictions = [
      "⚽ **Man United 2-1 Liverpool** (85% confidence)",
      "⚽ **Arsenal 1-1 Chelsea** (78% confidence)", 
      "⚽ **Man City 3-0 Tottenham** (92% confidence)"
    ];
    
    await interaction.reply(`🎯 **Today's Predictions:**\n${predictions.join('\n')}`);
  }

  if (interaction.commandName === 'help') {
    const helpMessage = `
**🤖 SLASH COMMANDS:**
\`/ping\` - Test bot
\`/predict\` - Get football predictions  
\`/help\` - Show this message

**No message permissions needed!** 🚀
    `;
    
    await interaction.reply(helpMessage);
  }
});

client.login(process.env.TOKEN);



/*

import { Client, GatewayIntentBits, Partials } from "discord.js";
import express from "express";
import dotenv from "dotenv";
import { fetchMatches } from "./services/fetchAPI.js"; // Football API fetch module
dotenv.config();

// ---------------- EXPRESS SERVER ----------------
const app = express();
app.get("/", (req, res) => res.send("Bot is running"));
app.listen(process.env.PORT || 3000, () =>
  console.log(`Express server running on port ${process.env.PORT || 3000}`)
);

// ---------------- DISCORD CLIENT ----------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // MUST be ON in Discord Dev Portal
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel],
});

// ---------------- READY EVENT ----------------
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ---------------- MESSAGE LISTENER ----------------
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // ---------- Basic Commands ----------
  if (message.content.toLowerCase() === "!ping") {
    message.reply("Pong! 🏓");
  }

  if (message.content.toLowerCase() === "hi") {
    message.reply("Hello! Bot is working perfectly 😊");
  }

  if (message.content.toLowerCase() === "!test") {
    message.reply("Your bot received the message successfully!");
  }

  // ---------- Football Prediction Command ----------
  if (message.content.toLowerCase() === "!predict") {
    message.reply("Fetching football matches... ⏳");

    try {
      const matches = await fetchMatches();

      if (!matches || matches.length === 0) {
        return message.reply("No matches found or API error ❌");
      }

      // Show top 5 upcoming matches as example
      const topMatches = matches.slice(0, 5).map(
        (m) =>
          `${m.teams.home.name} vs ${m.teams.away.name} — ${m.fixture.date}`
      );

      message.reply(`Upcoming matches:\n${topMatches.join("\n")}`);
    } catch (err) {
      console.error(err);
      message.reply("Error fetching matches ❌");
    }
  }
});

// ---------------- BOT LOGIN ----------------
client.login(process.env.TOKEN);


*/
