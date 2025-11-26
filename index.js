import 'dotenv/config'; // Automatically loads .env
import { Client, GatewayIntentBits } from 'discord.js';

// 1️⃣ Debug: Environment variables
console.log("🚀 Starting bot debug check...");
console.log("Checking environment variables...");
console.log("process.env.TOKEN:", process.env.TOKEN ? "[FOUND]" : "[NOT FOUND]");
console.log("process.env.API_FOOTBALL:", process.env.API_FOOTBALL ? "[FOUND]" : "[NOT FOUND]");
console.log("process.env.PORT:", process.env.PORT ? "[FOUND]" : "[NOT FOUND]");

// 2️⃣ Token preview
if (process.env.TOKEN) {
    console.log("TOKEN length:", process.env.TOKEN.length);
    console.log("TOKEN preview:", process.env.TOKEN.slice(0,5) + "..." + process.env.TOKEN.slice(-5));
} else {
    console.error("❌ TOKEN not found! Check Railway Environment Variables or local .env file.");
}

// 3️⃣ Initialize Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// 4️⃣ Login with proper error handling
(async () => {
    try {
        await client.login(process.env.TOKEN);
        console.log("✅ Bot logged in successfully!");
    } catch (error) {
        console.error("❌ Discord.js login error:", error.code || error.message);
    }
})();

// 5️⃣ Ping test command
client.on('messageCreate', (message) => {
    if (message.author.bot) return;

    // Ping command
    if (message.content === '!ping') {
        message.reply('🏓 Pong! Bot is online! 🎉');
    }

    // Automatic welcome reply
    message.reply('👋 Welcome Discard Bot!');
});

// 6️⃣ Optional: welcome new members
client.on('guildMemberAdd', (member) => {
    member.send('👋 Welcome to the server! Discard Bot is here!');
});

// 7️⃣ Bot is running
console.log("Bot is running and online...");
