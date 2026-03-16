const { chromium } = require("playwright");

(async () => {

  const browser = await chromium.launch({
    headless: false   // show browser so you can watch it
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Go to login page
  await page.goto("https://healywholesale.net");

  console.log("Waiting for login...");

  // YOU manually log in here
  await page.waitForTimeout(30000);

  // After login, navigate to the report
  await page.goto("https://healywholesale.net/QuickLink?MessageID=62520&QuickKey=9eebcbf5c1116ce5821db369faac6bb3");

  await page.waitForTimeout(10000);

  console.log("Page title:", await page.title());

})();