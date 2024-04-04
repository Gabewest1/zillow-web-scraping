// web scrape zillow.com for land/lots for sale in the US
// and save the data to a csv file
import puppeteer from "puppeteer";
import fs from "fs";
import csv from "csv-parser";
import { createCsvWriter } from "csv-writer";

const url = "https://www.zillow.com/homes/for_sale/land_type/1-_acre/";

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);

  const results = await page.evaluate(() => {
    const data = [];
    const elements = document.querySelectorAll(".list-card-info");
    for (const element of elements) {
      const title = element.querySelector(".list-card-price").innerText;
      const address = element.querySelector(".list-card-addr").innerText;
      const link = element.querySelector(".list-card-link").href;
      data.push({ title, address, link });
    }
    return data;
  });

  const csvWriter = createCsvWriter({
    path: "zillow_land.csv",
    header: [
      { id: "title", title: "Title" },
      { id: "address", title: "Address" },
      { id: "link", title: "Link" },
    ],
  });

  csvWriter
    .writeRecords(results)
    .then(() => console.log("The CSV file was written successfully"));

  await browser.close();
})();
