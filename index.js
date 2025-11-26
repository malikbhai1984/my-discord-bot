import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// -------------------- Slash Commands --------------------
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

// -------------------- Dummy Predictions --------------------
function generateDummyPrediction() {
  const teams = ["Man United", "Liverpool", "Arsenal", "Chelsea", "Man City", "Tottenham"];
  const home = teams[Math.floor(Math.random() * teams.length)];
  const away = teams[Math.floor(Math.random() * teams.length)];
  const scoreHome = Math.floor(Math.random() * 4);
  const scoreAway = Math.floor(Math.random() * 4);
  const confidence = Math.floor(75 + Math.random() * 25); // 75% to 100%
  return `⚽ **${home} ${scoreHome}-${scoreAway} ${away}** (${confidence}% confidence)`;
}

// -------------------- Auto Messages --------------------
async function sendAutoMessage(messageText) {
  if (!client.isReady()) return;

  client.guilds.cache.forEach(guild => {
    guild.channels.cache
      .filter(ch => ch.isTextBased() && ch.permissionsFor(client.user).has("SendMessages"))
      .forEach(channel => {
        channel.send(messageText);
        console.log(`✅ Sent message to ${guild.name} -> ${channel.name}`);
      });
  });
}

// Send auto prediction automatically
async function sendAutoPrediction() {
  const prediction = generateDummyPrediction();
  await sendAutoMessage(`🤖 **Automatic Prediction:**\n${prediction}`);
}

// -------------------- Bot Ready --------------------
client.once('ready', async () => {
  console.log(`✅ ${client.user.tag} is online!`);
  await registerCommands();

  // Welcome message when bot goes online
  await sendAutoMessage("🤖 **Discard Bot is now ONLINE! Welcome!** 🚀");

  // Start automatic predictions every 5–7 minutes
  setInterval(sendAutoPrediction, Math.floor(5 + Math.random() * 2) * 60 * 1000); // 5–7 min
});

// -------------------- Slash Command Handler --------------------
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  console.log(`🎯 Command: /${interaction.commandName}`);

  if (interaction.commandName === 'ping') {
    await interaction.reply('🏓 Pong! Slash command working! 🎉');
  }

  if (interaction.commandName === 'predict') {
    const predictions = [
      generateDummyPrediction(),
      generateDummyPrediction(),
      generateDummyPrediction()
    ];
    await interaction.reply(`🎯 **Today's Predictions:**\n${predictions.join('\n')}`);
  }

  if (interaction.commandName === 'help') {
    const helpMessage = `
**🤖 SLASH COMMANDS:**
\`/ping\` - Test bot
\`/predict\` - Get football predictions  
\`/help\` - Show this message

**Automatic predictions every 5–7 minutes!** 🚀
    `;
    await interaction.reply(helpMessage);
  }
});

client.login(process.env.TOKEN);
