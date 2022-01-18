const puppeteer = require('puppeteer');

module.exports = async (query) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const url = `https://pt.wikipedia.org/wiki/${query}`;

  await page.goto(url);
  try {
    const text = await page.evaluate(() => Array.from(document.querySelectorAll('.mw-parser-output p:first-of-type'), (element) => element.textContent));

    const cleanString = text[0].replace(/\[\d\]/g, '');

    await browser.close();
    return cleanString;
  // eslint-disable-next-line no-empty
  } catch (err) { return ''; }
};
