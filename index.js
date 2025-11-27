import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Bot ready hote hi
client.once('ready', async () => {
  console.log(`✅ ${client.user.tag} is online!`);
  
  // Thoda wait karo bot ko properly load hone do
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Specific channel mein message bhejne ka try karo
  try {
    // Server ke channels list karo
    client.guilds.cache.forEach(guild => {
      console.log(`🏠 Server: ${guild.name}`);
      
      // Text channels dhoondo
      const textChannels = guild.channels.cache.filter(channel => 
        channel.type === 0 && channel.viewable // Text channel and visible
      );
      
      if (textChannels.size > 0) {
        // Pehla available channel select karo
        const firstChannel = textChannels.first();
        console.log(`📝 Sending welcome to: ${firstChannel.name}`);
        
        // Welcome message bhejo
        firstChannel.send("🤖 **Welcome Malik Bhai!** Bot successfully started from discard-bowtjs! 🎉")
          .then(() => console.log("✅ Welcome message sent!"))
          .catch(err => console.log("❌ Cannot send message:", err.message));
      } else {
        console.log("❌ No text channels found");
      }
    });
  } catch (error) {
    console.log("❌ Error sending welcome:", error);
  }
});

// Message create event - koi bhi message likhe to respond karo
client.on('messageCreate', (message) => {
  if (message.author.bot) return; // Bot ke messages ignore karo
  
  if (message.content.toLowerCase() === 'hello') {
    message.reply('👋 Hello Malik Bhai! Bot working perfectly!');
  }
  
  if (message.content.toLowerCase() === 'test') {
    message.channel.send('✅ Test successful! Bot is alive! 🎉');
  }
});

// Automatic messages har 2 minute baad (testing ke liye)
setInterval(() => {
  client.guilds.cache.forEach(guild => {
    const textChannels = guild.channels.cache.filter(channel => 
      channel.type === 0 && channel.viewable
    );
    
    if (textChannels.size > 0) {
      const channel = textChannels.first();
      const autoMessages = [
        "🔄 **Auto Update:** Malik Bhai system running smoothly!",
        "⏰ **2 Minute Passed:** All systems working!",
        "🤖 **Bot Status:** discard-bowtjs operational!",
        "💫 **Notification:** Automatic message received!"
      ];
      const randomMsg = autoMessages[Math.floor(Math.random() * autoMessages.length)];
      
      channel.send(randomMsg)
        .then(() => console.log(`✅ Auto message sent to ${channel.name}`))
        .catch(err => console.log("❌ Auto message failed:", err.message));
    }
  });
}, 120000); // 2 minutes = 120000 ms

client.login(process.env.TOKEN);
