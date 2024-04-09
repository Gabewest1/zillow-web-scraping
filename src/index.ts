import puppeteer, { Page } from 'puppeteer';
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const url =
  'https://www.redfin.com/county/2650/TX/Bastrop-County/filter/property-type=land,status=active+contingent+pending';

const resultsSelector = 'div[data-rf-test-id="homes-description"]';
const filtersSelector = 'div[data-rf-test-id="filterButton"]';
const searchBarSelector = '#search-box-input';
const forSaleSoldSelector =
  '.RichSelect.RichSelect__size--compact.ExposedSearchFilter.ExposedSearchModeFilter.ExposedSearchFilter--desktop';
const soldButtonSelector = '#sold';
const saleButtonSelector = '#for-sale';
const comingSoonSelector = '#comingSoon';
const activeSelector = '#active';
const pendingSelector = '#underContractPending';

const counties = ['Travis'];
// const counties = ['Travis', 'Williamson', 'Hays', 'Bastrop', 'Burnet'];

type Result = {
  county: string;
  sold: string | undefined;
  forSale: string | undefined;
};

function pause(ms: number = 3000) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function selectForSale(page: Page) {
  console.log('inside selectForSale');
  await page.click(forSaleSoldSelector);

  const saleButtonElement = await page.waitForSelector(saleButtonSelector);
  const isSelected = await saleButtonElement?.evaluate((el) => {
    return el.getAttribute('aria-selected');
  });

  if (isSelected === 'false') {
    await page.click(saleButtonSelector);
  }

  const comingSoonElement = await page.waitForSelector(comingSoonSelector);
  const isActiveElement = await page.waitForSelector(activeSelector);
  const isPendingElement = await page.waitForSelector(pendingSelector);

  const isComingSoonSelected = await comingSoonElement?.evaluate((el) => {
    return el.getAttribute('aria-selected');
  });

  const isActiveSelected = await isActiveElement?.evaluate((el) => {
    return el.getAttribute('aria-selected');
  });

  const isPendingSelected = await isPendingElement?.evaluate((el) => {
    return el.getAttribute('aria-selected');
  });

  if (isComingSoonSelected === 'true') {
    await page.click(comingSoonSelector);
  }

  if (isActiveSelected === 'false') {
    await page.click(activeSelector);
  }

  if (isPendingSelected === 'false') {
    await page.click(pendingSelector);
  }

  await page.click('.ExposedSearchFilter__doneBtn');
  await pause(1000);
}

async function selectSold(page: Page) {
  await page.click(forSaleSoldSelector);
  await page.click(soldButtonSelector);
  await page.click('#Last1year');
  await page.click('.ExposedSearchFilter__doneBtn');
  await pause(1000);
}

async function collectResults(page: Page) {
  const resultsElement = await page.waitForSelector(resultsSelector);
  const numberForSale = await resultsElement?.evaluate((el) => {
    return el.textContent?.split(' ')[0] ?? '';
  });
  return numberForSale;
}

async function manuallyClickElement(page: Page, selector: string) {
  const element = await page.waitForSelector(selector);
  console.log('element', element);
  await element?.evaluate((el) => {
    const button = el as HTMLButtonElement;
    console.log('button', button);
    button.click();
  });
}

async function selectLandOnly(page: Page) {
  await page.click(filtersSelector);
  // No good CSS selector so just need to know the land option is 4th in the list
  const landSelector = '.PropertyTypes__items > div:nth-child(4)';
  const landElement = await page.waitForSelector(landSelector);
  console.log('landElement', landElement);
  const isLandSelected = await landElement?.evaluate((el) => {
    return el.getAttribute('aria-selected');
  });
  console.log('isLandSelected', isLandSelected);
  if (isLandSelected === 'false') {
    console.log('Clicking land');
    await manuallyClickElement(page, landSelector);
  }

  console.log('Closing the filter section');
  // await manuallyClickElement(page, 'button[aria-label="Close Button"]');
  await page.click('div[data-rf-test-id="apply-search-options"]');
  await pause(1000);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--window-position=0,0',
      '--ignore-certifcate-errors',
      '--ignore-certifcate-errors-spki-list',
      '--user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3312.0 Safari/537.36"',
    ],
  });
  const page = await browser.newPage();
  await page.goto(url);
  await page.setViewport({ width: 1080, height: 1024 });

  const results: Result[] = [];
  for (const county of counties) {
    try {
      const result: Result = { county, sold: undefined, forSale: undefined };
      await page.waitForSelector(searchBarSelector);

      // Clear search bar
      await page.click(searchBarSelector);
      await page.keyboard.press('Backspace');
      await page.type(searchBarSelector, `${county} County`);
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await pause();

      // Sometimes filters reset after searching a new county. Need to ensure we're looking at
      // land and not houses
      await selectLandOnly(page);

      // Click on for sale button
      await selectForSale(page);
      const numberForSale = await collectResults(page);

      console.log('numberForSale', numberForSale);
      result.forSale = numberForSale;

      // click on sold button
      await selectSold(page);
      const numberSold = await collectResults(page);

      console.log('numberSold', numberSold);
      result.sold = numberSold;

      results.push(result);
      console.log('result', result);
    } catch (e) {
      console.error(`Error processing ${county} county:`, e);
      continue;
    }
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
