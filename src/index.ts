// web scrape zillow.com for land/lots for sale in the US
// and save the data to a csv file
import puppeteer from 'puppeteer';
import fs from 'fs';
// import csv from "csv-parser";
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const url =
  'https://www.zillow.com/homes/for_sale/land_type/1-_acre/1_pnd/12m_days';

const resultsSelector = '.result-count';
const searchBarSelector = 'input';
const forSaleSoldSelector = '#listing-type button';
const soldButtonSelector = '#isRecentlySold';
const saleButtonSelector =
  '#isForSaleByAgent_isForSaleByOwner_isNewConstruction_isComingSoon_isAuction_isForSaleForeclosure_isPreMarketForeclosure_isPreMarketPreForeclosure';

const counties = ['travis', 'williamson', 'hays', 'bastrop', 'burnet'];

type Result = {
  county: string;
  sold: string | undefined;
  forSale: string | undefined;
};

function pause() {
  return new Promise((resolve) => {
    setTimeout(resolve, 3000);
  });
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    devtools: true,
    timeout: 20000,
  });
  const page = await browser.newPage();
  await page.goto(url);
  await page.setViewport({ width: 1080, height: 1024 });

  await pause();
  await pause();

  const results: Result[] = [];
  for (const county of counties) {
    const result: Result = { county, sold: undefined, forSale: undefined };
    await page.waitForSelector(searchBarSelector);

    await page.click(searchBarSelector);
    await page.keyboard.press('Backspace');
    await page.type(searchBarSelector, `${county} County`, { delay: 100 });
    await page.keyboard.press('Enter');
    await pause();

    // Click on for sale button
    // await page.waitForSelector(forSaleSoldSelector);
    // await page.click(forSaleSoldSelector);

    // await page.waitForSelector(saleButtonSelector);
    // await page.click(saleButtonSelector);

    const resultsElement = await page.waitForSelector(resultsSelector);
    const numberForSale = await resultsElement?.evaluate((el) => {
      return el.innerHTML;
    });

    console.log('numberForSale', numberForSale);
    result.forSale = numberForSale;

    // click on sold button
    // await page.waitForSelector(forSaleSoldSelector);
    // await page.click(forSaleSoldSelector);

    // await page.waitForSelector(saleButtonSelector);
    // await page.click(soldButtonSelector);
    results.push(result);
    console.log('result', result);
  }

  const csvWriter = createCsvWriter({
    path: 'zillow_land.csv',
    header: [
      { id: 'county', title: 'County' },
      { id: 'sold', title: 'Sold' },
      { id: 'forSale', title: 'For Sale' },
    ],
  });

  console.log('results', results);
  csvWriter
    .writeRecords(results)
    .then(() => console.log('The CSV file was written successfully'));

  await browser.close();
})();
