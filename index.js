import 'dotenv/config'; // automatically loads .env
import { Client, GatewayIntentBits } from 'discord.js';

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const TOKEN = process.env.TOKEN;
const API_FOOTBALL = process.env.API_FOOTBALL;
const PORT = process.env.PORT || 3000;

client.once('ready', () => {
    console.log(`Bot is online! Logged in as ${client.user.tag}`);
    console.log(`API_FOOTBALL key loaded:`, !!API_FOOTBALL);
});

client.on('messageCreate', (message) => {
    if(message.content === '!ping') {
        message.reply('Pong!');
    }
});

client.login(TOKEN);
