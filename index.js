import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js";
import { fetchMatches } from './server/fatchapi.js';

// Debug environment variables
console.log('🚀 Starting Discord Bot...');
console.log('🔧 Token available:', !!process.env.TOKEN);
console.log('🔧 API Key available:', !!process.env.API_FOOTBALL);
console.log('🔧 Token length:', process.env.TOKEN?.length);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent]
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
  
  new SlashCommandBuilder()
    .setName('matches')
    .setDescription('Get live football matches')
].map(command => command.toJSON());

// Register slash commands
async function registerCommands() {
  try {
    if (!process.env.TOKEN) {
      console.log('❌ No token found for command registration');
      return;
    }
    
    console.log('📋 Registering slash commands...');
    
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    
    await rest.put(
      Routes.applicationCommands(client.user?.id || '123456789012345678'),
      { body: commands }
    );
    
    console.log('✅ Slash commands registered!');
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
}

client.once('ready', async () => {
  console.log(`✅ ${client.user.tag} is online!`);
  console.log(`🔗 Invite link: https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot%20applications.commands`);
  await registerCommands();
});

// Handle slash commands
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  console.log(`🎯 Command: /${interaction.commandName}`);

  if (interaction.commandName === 'ping') {
    await interaction.reply('🏓 Pong! Bot is working perfectly! 🎉');
  }

  if (interaction.commandName === 'predict') {
    const predictions = [
      "⚽ **Man United 2-1 Liverpool** (85% confidence)",
      "⚽ **Arsenal 1-1 Chelsea** (78% confidence)", 
      "⚽ **Man City 3-0 Tottenham** (92% confidence)",
      "⚽ **Newcastle 2-0 Brighton** (80% confidence)"
    ];
    
    await interaction.reply(`🎯 **Today's Predictions:**\n${predictions.join('\n')}`);
  }

  if (interaction.commandName === 'matches') {
    try {
      await interaction.deferReply();
      const matches = await fetchMatches();
      
      if (matches && matches.length > 0) {
        const matchList = matches.slice(0, 5).map(match => 
          `⚽ ${match.teams.home.name} vs ${match.teams.away.name} - ${match.fixture.status.long}`
        ).join('\n');
        
        await interaction.editReply(`**🔴 Live Matches:**\n${matchList}`);
      } else {
        await interaction.editReply('❌ No matches found or API error.');
      }
    } catch (error) {
      console.error('Match error:', error);
      await interaction.editReply('❌ Error fetching matches.');
    }
  }

  if (interaction.commandName === 'help') {
    const helpMessage = `
**🤖 FOOTBALL BOT COMMANDS:**

\`/ping\` - Test if bot is working
\`/predict\` - Get football match predictions  
\`/matches\` - Get live football matches
\`/help\` - Show this help message

**✅ Bot is hosted on Railway.app**
**🚀 No downtime, always online!**
    `;
    
    await interaction.reply(helpMessage);
  }
});

// Handle errors
client.on('error', (error) => {
  console.error('❌ Discord Client Error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Promise Rejection:', error);
});

// Start the bot
if (process.env.TOKEN) {
  client.login(process.env.TOKEN)
    .then(() => console.log('🔑 Login successful!'))
    .catch(error => {
      console.error('❌ Login failed:', error);
      console.log('💡 Check if token is valid in Railway variables');
    });
} else {
  console.log('❌ No token found in environment variables');
  console.log('💡 Please set TOKEN in Railway environment variables');
}
