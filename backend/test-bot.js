// test-bot.js
const TelegramBot = require("node-telegram-bot-api");

// 🔑 Replace with your bot token
const BOT_TOKEN = "7567865431:AAGWHjzx3oAlQW7cLztreYHVNF7-7jEGp0c";

// 🔑 Replace with your channel/group id (with -100 prefix)
const CHAT_ID = "-1003006414817";

const bot = new TelegramBot(BOT_TOKEN, { polling: false });

(async () => {
  try {
    await bot.sendMessage(String(CHAT_ID), "✅ Test message from Node.js script!");
    console.log("Message sent successfully ✅");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
})();
