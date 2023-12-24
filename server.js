const cheerio = require("cheerio");
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const puppeteer = require("puppeteer-extra");

// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

const SPANK_URL = "https://spankbang.com";
const TNAFLIX_URL = "https://www.tnaflix.com";

const app = express();
require("dotenv").config();

const PORT = 3366;
const getRandomPageFromSpank = () => {
  //https://spankbang.com/s/pmv/2/?o=all
  const page = Math.floor(Math.random() * 335) + 1;

  return `${SPANK_URL}/s/pmv/${page}/?o=all`;
};

const getRandomPageFromTnaflix = () => {
  //https://www.tnaflix.com/search.php?what=pmv&tab=&page=417
  const page = Math.floor(Math.random() * 417) + 1;

  return `${TNAFLIX_URL}/search.php?what=pmv&tab=&page=${page}`;
};

const COMMANDS = [
  {
    command: "spank",
    description: "Arata un video random",
  },
  {
    command: "tnaflix",
    description: "Arata un video random",
  },
];

async function scrapeSpank() {
  const url = getRandomPageFromSpank();
  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.goto(url);
    const content = await page.content();

    const $ = cheerio.load(content);
    const videoBlocks = $(".video-item");

    // Choose a random video block
    const randomIndex = Math.floor(Math.random() * videoBlocks.length);
    const randomVideoBlock = videoBlocks.eq(randomIndex);

    // Extract information from the random block
    const title = randomVideoBlock.find("a.n").text().trim();
    const time = randomVideoBlock.find("p.t span.l").text().trim();
    const info = randomVideoBlock.find(".v.d").text().trim();
    const link = `${SPANK_URL}${$("div.video-item a.n").attr("href")}`;

    return `${title}\n${time}\n${info}\n${link}`;
  } catch (error) {
    console.error("Error:", error);
  }
}

async function scrapeTnaflix() {
  const url = getRandomPageFromTnaflix();
  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.goto(url);
    const content = await page.content();

    const $ = cheerio.load(content);
    const videoBlocks = $(".thumbsList li");

    // Choose a random video block
    const randomIndex = Math.floor(Math.random() * videoBlocks.length);
    const randomVideoBlock = videoBlocks.eq(randomIndex);

    // Extract information from the random block
    const title = randomVideoBlock.find(".newVideoTitle").text().trim();
    const date = new Date(
      randomVideoBlock.attr("data-date").trim() * 1000
    ).toLocaleDateString();
    const duration = randomVideoBlock.find(".videoDuration").text().trim();
    const link = `${TNAFLIX_URL}${randomVideoBlock
      .find("a.newVideoTitle")
      .attr("href")}`;

    return `${title}\n${date}\n${duration}\n${link}`;
  } catch (error) {
    console.error("Error:", error);
  }
}

const listener = app.listen(PORT, () => {
  console.log(`Aplicația este pornită pe portul ${listener.address().port}`);
});

const bot = new TelegramBot(process.env.TELEGRAM_API_KEY, { polling: true });

bot.on("polling_error", (error) => {
  console.log("Polling error:", error.code, error.message);
});

// Set commands
bot
  .setMyCommands(COMMANDS)
  .then(() => console.log("Comenzile au fost setate cu succes"))
  .catch((error) => console.error(error));

// Handle incoming messages
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  switch (msg.text) {
    case "/start":
      bot.sendMessage(chatId, "Bun venit!");
      break;
    case "/spank":
      const video = await scrapeSpank();
      bot.sendMessage(chatId, video);
      break;
    case "/tnaflix":
      const video2 = await scrapeTnaflix();
      bot.sendMessage(chatId, video2);
      break;
    default:
      bot.sendMessage(chatId, "Comanda necunoscută, încearcă din nou");
      break;
  }
});
