const cheerio = require("cheerio");
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const puppeteer = require("puppeteer-extra");

// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

const PUPPETEER_CONFIG = {
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
};

const SPANK_URL = "https://spankbang.com";
const TNAFLIX_URL = "https://www.tnaflix.com";
const PORNHUB_URL = "https://www.pornhub.com";

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

const getRandomPageFromPornhub = () => {
  //https://www.pornhub.com/video/search?search=pmv&page=69
  const page = Math.floor(Math.random() * 69) + 1;

  return `https://www.pornhub.com/video/search?search=pmv&page=${page}`;
};

const COMMANDS = [
  {
    command: "random",
    description: "Arata un video random",
  },
  {
    command: "spank",
    description: "Arata un video de pe spankbang",
  },
  {
    command: "tnaflix",
    description: "Arata un video de pe tnaflix",
  },
  {
    command: "pornhub",
    description: "Arata un video de pe pornhub",
  },
];

async function scrapeSpank() {
  const url = getRandomPageFromSpank();
  try {
    const browser = await puppeteer.launch(PUPPETEER_CONFIG);
    const page = await browser.newPage();
    await page.goto(url);
    const content = await page.content();
    await browser.close();

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

    return `${title}\nInfo: ${time} / ${info
      .split("   ")
      .join(" / ")}\n${link}`;
  } catch (error) {
    console.error("Error:", error);
  }
}

async function scrapeTnaflix() {
  const url = getRandomPageFromTnaflix();
  try {
    const browser = await puppeteer.launch(PUPPETEER_CONFIG);
    const page = await browser.newPage();
    await page.goto(url);
    const content = await page.content();
    await browser.close();

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

    return `${title}\nInfo: ${duration} / ${date}\n${link}`;
  } catch (error) {
    console.error("Error:", error);
  }
}

async function scrapePornhub() {
  const url = getRandomPageFromPornhub();
  try {
    const browser = await puppeteer.launch(PUPPETEER_CONFIG);
    const page = await browser.newPage();
    await page.goto(url);
    const content = await page.content();
    await browser.close();

    const $ = cheerio.load(content);
    const videoBlocks = $(".pcVideoListItem");

    // Choose a random video block
    const randomIndex = Math.floor(Math.random() * videoBlocks.length);
    const randomVideo = videoBlocks.eq(randomIndex);

    const title = randomVideo.find(".title a").text().trim();
    const duration = randomVideo.find(".duration").text().trim();
    const ratingValue = randomVideo
      .find(".rating-container .value")
      .text()
      .trim();
    const views = randomVideo.find(".views var").text().trim();
    const link = `${PORNHUB_URL}${randomVideo.find(".title a").attr("href")}`;

    return `${title}\nInfo: ${duration} / ${views} / ${ratingValue}\n${link}`;
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

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Bun venit!");
});

bot.onText(/\/random/, async (msg) => {
  const scrapers = [scrapeSpank, scrapeTnaflix, scrapePornhub];
  const video = await scrapers[Math.floor(Math.random() * scrapers.length)]();

  bot.sendMessage(msg.chat.id, video);
});

bot.onText(/\/spank/, async (msg) => {
  const video = await scrapeSpank();
  bot.sendMessage(msg.chat.id, video);
});

bot.onText(/\/tnaflix/, async (msg) => {
  const video = await scrapeTnaflix();
  bot.sendMessage(msg.chat.id, video);
});

bot.onText(/\/pornhub/, async (msg) => {
  const video = await scrapePornhub();
  bot.sendMessage(msg.chat.id, video, {
    disable_web_page_preview: true,
  });
});
