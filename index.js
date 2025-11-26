import 'dotenv/config'; // automatically loads .env locally
import { Client, GatewayIntentBits } from 'discord.js';

console.log("🚀 Starting bot debug check...");

// 1️⃣ Check environment variables
console.log("Checking environment variables...");
console.log("process.env.TOKEN:", process.env.TOKEN ? "[FOUND]" : "[NOT FOUND]");
console.log("process.env.API_FOOTBALL:", process.env.API_FOOTBALL ? "[FOUND]" : "[NOT FOUND]");
console.log("process.env.PORT:", process.env.PORT ? "[FOUND]" : "[NOT FOUND]");

// 2️⃣ Token length & preview
if (process.env.TOKEN) {
console.log("TOKEN length:", process.env.TOKEN.length);
console.log("TOKEN preview:", process.env.TOKEN.slice(0,5) + "..." + process.env.TOKEN.slice(-5));
} else {
console.error("❌ TOKEN not found! Check Railway Environment Variables or local .env file.");
}

// 3️⃣ Initialize Discord client
const client = new Client({
intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// 4️⃣ Try login with proper error handling
(async () => {
try {
await client.login(process.env.TOKEN);
console.log("✅ Bot logged in successfully!");
} catch (error) {
console.error("❌ Discord.js login error:", error.code || error.message);
}
})();

// 5️⃣ Optional: Ping test
client.on('messageCreate', (message) => {
if (message.content === '!ping') {
message.reply('Pong!');
}
});

