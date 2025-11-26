import 'dotenv/config'; // local testing only
import { Client, GatewayIntentBits } from 'discord.js';

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const TOKEN = process.env.TOKEN;
console.log("TOKEN length:", TOKEN?.length); // check loading
client.login(TOKEN);
