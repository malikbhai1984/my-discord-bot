
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
