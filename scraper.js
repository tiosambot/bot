const puppeteer = require("puppeteer");

module.exports = async (url) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    url = `https://pt.wikipedia.org/wiki/${url}`;

    await page.goto(url);
    const text = await page.evaluate(() => Array.from(document.querySelectorAll('.mw-parser-output p:first-of-type'), element => element.textContent));

    var cleanString = text[0].replace(/\[\d\]/g, "");

    await browser.close();
    return cleanString;
};