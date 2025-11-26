


import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js";

// 1. Get Environment Variables
// We rely solely on Railway/process.env now
const TOKEN = process.env.TOKEN;
const API_FOOTBALL_KEY = process.env.API_FOOTBALL; // Using a clearer name for the API Key

// 2. Initial Checks and Logging
console.log('--- Bot Initialization ---');
console.log('🔧 TOKEN available:', !!TOKEN);
console.log('🔧 API_FOOTBALL_KEY available:', !!API_FOOTBALL_KEY);

if (!TOKEN) {
    console.error('❌ FATAL: Discord TOKEN is missing in environment variables.');
    // We do NOT use process.exit(1) here. The client.login() failure will be logged below.
}

// 3. Setup Discord Client
const client = new Client({
    intents: [GatewayIntentBits.Guilds] // Only Guilds intent needed for slash commands
});

// Define Commands
const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
    new SlashCommandBuilder().setName('predict').setDescription('Get football predictions'),
    new SlashCommandBuilder().setName('help').setDescription('Show all commands'),
    new SlashCommandBuilder().setName('matches').setDescription('Get live football matches')
].map(cmd => cmd.toJSON());

// 4. Command Registration Function
async function registerCommands() {
    try {
        console.log('📋 Registering slash commands...');
        
        // Ensure TOKEN is available before trying to set it
        if (!TOKEN) {
             console.error('❌ Cannot register commands: TOKEN is missing.');
             return; 
        }

        const rest = new REST({ version: '10' }).setToken(TOKEN);
        
        // Note: You should replace the placeholder ID with your bot's actual ID 
        // if client.user is null during deployment registration.
        await rest.put(
            Routes.applicationCommands(client.user?.id || 'YOUR_BOT_APPLICATION_ID'),
            { body: commands }
        );
        
        console.log('✅ Slash commands registered!');
    } catch (error) {
        console.error('❌ Error registering commands:', error.message);
    }
}

// 5. Bot Events
client.once('ready', async () => {
    console.log(`✅ ${client.user.tag} is online!`);
    await registerCommands();
});

// Handle slash commands
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    console.log(`🎯 Command executed: /${interaction.commandName}`);

    switch (interaction.commandName) {
        case 'ping':
            await interaction.reply('🏓 Pong! Bot is working perfectly! 🎉');
            break;

        case 'predict':
            // Add your API integration logic here using API_FOOTBALL_KEY
            await interaction.reply('🎯 Prediction feature coming soon!');
            break;

        case 'matches':
            // Add your API integration logic here using API_FOOTBALL_KEY
            await interaction.reply('⚽ Live matches feature coming soon!');
            break;

        case 'help':
            const helpMessage = `
**🤖 FOOTBALL BOT COMMANDS:**

\`/ping\` - Test bot latency
\`/predict\` - Get football match predictions
\`/matches\` - Get live football matches
\`/help\` - Show this help message

**✅ Hosted on Railway**
            `;
            await interaction.reply({ content: helpMessage, ephemeral: true });
            break;
    }
});

// 6. Login and Error Handling
client.login(TOKEN)
    .then(() => console.log('🔑 Attempting Discord Login...'))
    .catch(err => {
        console.error('❌ Login failed! Check TOKEN value and Bot intents:', err.message);
        // This catch block handles the error if TOKEN is undefined or invalid.
    });

client.on('error', console.error);
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});


