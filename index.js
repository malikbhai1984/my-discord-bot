import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js";

// Load environment variables (for local testing, optional if using Railway env vars)
import dotenv from "dotenv";
dotenv.config();

// Check environment variables
const token = process.env.TOKEN || process.env.DISCORD_TOKEN;
const apiFootballKey = process.env.API_FOOTBALL;

console.log('🚀 Starting Discord Bot...');
console.log('🔧 Token available:', !!token);
console.log('🔧 API Key available:', !!apiFootballKey);
console.log('🔧 Token length:', token?.length);

if (!token) {
  console.error('❌ No TOKEN found in environment variables. Please set TOKEN in Railway or locally in .env');
  process.exit(1);
}

if (!apiFootballKey) {
  console.warn('⚠️ API_FOOTBALL key not found. Prediction or matches may not work.');
}

// Create Discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent]
});

// Define commands
const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
  new SlashCommandBuilder().setName('predict').setDescription('Get football predictions'),
  new SlashCommandBuilder().setName('help').setDescription('Show all commands'),
  new SlashCommandBuilder().setName('matches').setDescription('Get live football matches')
].map(cmd => cmd.toJSON());

// Register slash commands
async function registerCommands() {
  try {
    console.log('📋 Registering slash commands...');
    const rest = new REST({ version: '10' }).setToken(token);

    await rest.put(
      Routes.applicationCommands(client.user?.id || '123456789012345678'),
      { body: commands }
    );

    console.log('✅ Slash commands registered!');
  } catch (err) {
    console.error('❌ Error registering commands:', err);
  }
}

// Ready event
client.once('ready', async () => {
  console.log(`✅ ${client.user.tag} is online!`);
  console.log(`🔗 Invite link: https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot%20applications.commands`);
  await registerCommands();
});

// Handle slash commands
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  console.log(`🎯 Command: /${interaction.commandName}`);

  switch (interaction.commandName) {
    case 'ping':
      await interaction.reply('🏓 Pong! Bot is working perfectly! 🎉');
      break;

    case 'predict':
      await interaction.reply('🎯 Prediction feature coming soon!');
      break;

    case 'matches':
      await interaction.reply('⚽ Live matches feature coming soon!');
      break;

    case 'help':
      await interaction.reply(`
**🤖 FOOTBALL BOT COMMANDS:**

\`/ping\` - Test bot
\`/predict\` - Get football predictions  
\`/matches\` - Live football matches
\`/help\` - Show this help message

**✅ Hosted on Railway**
**🚀 Always online!**
      `);
      break;
  }
});

// Error handling
client.on('error', console.error);
process.on('unhandledRejection', console.error);

// Login
client.login(token)
  .then(() => console.log('🔑 Login successful!'))
  .catch(err => {
    console.error('❌ Login failed:', err);
    console.log('💡 Make sure TOKEN is correctly set in Railway environment variables.');
  });
