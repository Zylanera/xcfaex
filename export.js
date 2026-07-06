const { chromium } = require('playwright');
const fs   = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const config  = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;
      const [key, ...rest] = line.split('=');
      config[key.trim()] = rest.join('=').trim();
    });
}

const cliArg = (name, def) => {
  const i = process.argv.indexOf('--' + name);
  return i !== -1 ? process.argv[i + 1] : def;
};

const USERNAME     = cliArg('username', config.X_USERNAME    || '');
const OUTPUT       = cliArg('output',   config.OUTPUT_FILE   || path.join(__dirname, 'tracked.json'));
const CHROME_EXE   =                    config.CHROME_PATH   || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCROLL_DELAY = parseInt(          config.SCROLL_DELAY  || '2000');
const STOP_AFTER   = parseInt(          config.STOP_AFTER_EMPTY || '8');
const COOKIES_FILE = path.join(__dirname, 'cookies.json');

if (!USERNAME) {
  console.log('Error: No username configured.');
  console.log('Please set X_USERNAME in your .env file or pass --username as an argument.');
  process.exit(1);
}

const TARGET_URL = `https://x.com/${USERNAME}/following`;

(async () => {
  console.log('X Following Exporter');
  console.log('====================');
  console.log(`Account  : @${USERNAME}`);
  console.log(`Output   : ${OUTPUT}`);
  console.log(`Chrome   : ${CHROME_EXE}`);
  console.log('');

  if (!fs.existsSync(COOKIES_FILE)) {
    console.log('Error: cookies.json not found!');
    console.log('');
    console.log('How to get your cookies:');
    console.log('  1. Open Chrome and log in to x.com');
    console.log('  2. Install the Cookie-Editor extension:');
    console.log('     https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm');
    console.log('  3. Open Cookie-Editor -> Export -> "Export as JSON"');
    console.log('  4. Save the file as cookies.json in this folder:');
    console.log(`     ${__dirname}`);
    console.log('  5. Run the script again');
    process.exit(1);
  }

  let rawCookies;
  try {
    rawCookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
  } catch (e) {
    console.log('Error reading cookies.json: ' + e.message);
    process.exit(1);
  }

  const cookies = rawCookies
    .filter(c => c.domain && (c.domain.includes('twitter.com') || c.domain.includes('x.com')))
    .map(c => ({
      name:     c.name,
      value:    c.value,
      domain:   c.domain.startsWith('.') ? c.domain : '.' + c.domain,
      path:     c.path || '/',
      secure:   c.secure   || false,
      httpOnly: c.httpOnly || false,
      sameSite: 'None',
      expires:  c.expirationDate ? Math.floor(c.expirationDate) : -1,
    }));

  console.log(`${cookies.length} cookies loaded`);
  console.log('');

  if (!fs.existsSync(CHROME_EXE)) {
    console.log(`Error: Chrome not found at: ${CHROME_EXE}`);
    console.log('Please update CHROME_PATH in your .env file.');
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: false,
    executablePath: CHROME_EXE,
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });

  await context.addCookies(cookies);

  const page = await context.newPage();

  console.log('Loading page...');
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);

  const currentUrl = page.url();
  if (currentUrl.includes('login') || currentUrl.includes('i/flow')) {
    console.log('');
    console.log('Error: Not logged in.');
    console.log('Your cookies may have expired. Please export cookies.json again from Chrome.');
    await browser.close();
    process.exit(1);
  }

  await scrapeAndSave(page, OUTPUT, USERNAME, SCROLL_DELAY, STOP_AFTER);
  await browser.close();
  process.exit(0);
})();


async function scrapeAndSave(page, outputPath, ownUsername, scrollDelay, stopAfter) {
  const accounts     = new Set();
  let lastCount      = 0;
  let noChangeRounds = 0;

  console.log('Scrolling through following list...');
  console.log('');
  await page.waitForTimeout(2000);

  while (noChangeRounds < stopAfter) {
    try {
      const links = await page.$$eval('a[href]', (els, own) => {
        const skip = [
          'home','explore','notifications','messages','settings','i',
          'search','login','logout','intent','share','compose',
          'following','followers','communities','verified_followers',
        ];
        return els
          .map(a => a.getAttribute('href') || '')
          .filter(href => /^\/[A-Za-z0-9_]{1,50}\/?$/.test(href))
          .map(href => href.replace(/\//g, ''))
          .filter(u => u && !skip.includes(u.toLowerCase()) && u.toLowerCase() !== own.toLowerCase());
      }, ownUsername);

      links.forEach(u => accounts.add(u));
      await page.evaluate(() => window.scrollBy(0, 1200));
      await page.waitForTimeout(scrollDelay);
    } catch (e) {
      break;
    }

    const current = accounts.size;
    if (current === lastCount) {
      noChangeRounds++;
      process.stdout.write(`\r  ${current} accounts found - checking end (${noChangeRounds}/${stopAfter})...`);
    } else {
      noChangeRounds = 0;
      process.stdout.write(`\r  ${current} accounts found...                              `);
    }
    lastCount = current;
  }

  console.log('');
  console.log('');
  console.log(`Done: ${accounts.size} accounts found`);

  const accountList = [...accounts].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  let tracked = { bookmarks: true, accounts: accountList };

  if (fs.existsSync(outputPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
      const merged   = [...new Set([...(existing.accounts || []), ...accountList])]
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
      tracked = { bookmarks: existing.bookmarks ?? true, accounts: merged };
      console.log(`Merged with existing file: ${merged.length} accounts total`);
    } catch (e) {}
  }

  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(tracked, null, 2));

  console.log(`Saved: ${path.resolve(outputPath)}`);
  console.log('');
  console.log('Preview (first 10):');
  tracked.accounts.slice(0, 10).forEach(a => console.log(`  @${a}`));
  if (tracked.accounts.length > 10) {
    console.log(`  ... and ${tracked.accounts.length - 10} more`);
  }
}
