import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// Bot ready hote hi
client.once('ready', () => {
  console.log(`✅ ${client.user.tag} is online!`);
  
  // Welcome message bhejo
  client.channels.cache.forEach(channel => {
    if (channel.isTextBased()) {
      channel.send("🤖 Welcome Malik Bhai from discard-bowtjs!");
    }
  });

  // Automatic messages har 5 minute baad
  setInterval(() => {
    client.channels.cache.forEach(channel => {
      if (channel.isTextBased()) {
        const messages = [
          "🔄 **Auto Message:** Malik Bhai yeh automatic message hai!",
          "⏰ **Reminder:** 5 minutes completed!",
          "🎯 **Update:** System working perfectly!",
          "🤖 **Bot Status:** All systems operational!",
          "💫 **Notification:** New update available!"
        ];
        const randomMsg = messages[Math.floor(Math.random() * messages.length)];
        channel.send(randomMsg);
      }
    });
  }, 300000); // 5 minutes = 300000 ms
});

client.login(process.env.TOKEN);
