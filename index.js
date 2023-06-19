// Don't forget to call it again if it fails

const puppeteer = require('puppeteer');
const crypto = require('crypto');
const fs = require('fs');
const ac = require('@antiadmin/anticaptchaofficial');
const cheerio = require('cheerio');

ac.setAPIKey('4aa4d483f21ac15e8777f9d82f7b4d65');
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function saveScreenshot(screenshot, filename) {
  const fs = require('fs').promises;
  await fs.writeFile(filename, screenshot, 'binary');
  console.log(`Screenshot saved as ${filename}`);
}

async function getMac(message) {
  try {
      const secretKey = 'lkjlh419#JLK@KLSA';
      const encoder = new TextEncoder();
      const keyBuffer = encoder.encode(secretKey);
      const keyArrayBuffer = keyBuffer.buffer;
      const messageBuffer = encoder.encode(message);
      const messageArrayBuffer = messageBuffer.buffer;
      const key = await crypto.subtle.importKey('raw', keyArrayBuffer, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
      const macBuffer = await crypto.subtle.sign('HMAC', key, messageArrayBuffer);
      const macArray = Array.from(new Uint8Array(macBuffer));
      const mac = macArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');
      // console.log('MAC:', mac);
      return mac;
  } catch (err) {
      console.error('Error:', err);
      throw err;
  }
}

async function sendDataTurboExternal(full_data, acc_no) {
  if (full_data.length == 0)
      return;

  console.log('data:', full_data);
  // return;
  let currentEpoch = Date.now().toString();
  let mac = await getMac("9h2f348f-293h49" + currentEpoch);
  if (JSON.parse(full_data).length > 0) {
      // console.log(new Date().toLocaleTimeString());
      // console.log(full_data);
      return new Promise(function (resolve, reject) {
          var data = full_data;
          data = "data=" + (data) + "&acc_no=" + acc_no;
          // var urlToSend = "https://bidforx.com/payments/uploadStatReconWallet.php?new=1";
          // console.log("Acc no " + acc_no + " URL " + urlToSend);
          // if (parseInt(globICICIMerID) != 144687) {
          // var xhr = new XMLHttpRequest(); xhr.withCredentials = !0; xhr.addEventListener("readystatechange", function () { if (this.readyState === 4) { } }); xhr.open("POST", urlToSend); xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded"); xhr.send((data));
          //     }
          //     else {

          var myHeaders = new Headers();
          myHeaders.append("Content-Type", "application/x-www-form-urlencoded");
          myHeaders.append("mac", mac);
          myHeaders.append("epochTime", currentEpoch);

          var urlencoded = new URLSearchParams();
          urlencoded.append("data", full_data);
          urlencoded.append("acc_no", acc_no);

          var requestOptions = {
              method: 'POST',
              headers: myHeaders,
              body: urlencoded,
              redirect: 'follow'
          };

          fetch("https://bidforx.com/recon-api/uploadReconTransactions", requestOptions)
              .then(response => {
                  console.log('resp from new api : ', response.text());
                  return resolve('ok');
              })
              .catch(error => {
                  console.log('error from new api: ', error);
                  return resolve('ok');
              });
          // }
          // return resolve('ok');
      });
  } else {
      return;
  }
}


function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${day}-${month}-${year}`;
}

const validate_otp = function (otp) {
  var ans = '-1';
  if (otp.length === 4) {
    var cnt = 0;
    for (var i = 0; i < 4; i++) {
      if (otp[i] >= '0' && otp[i] <= '9') cnt++;
    }
    if (cnt === 4)
      ans = otp;
  }
  return ans;
};

async function apiCall(page, csrf) {
  try {
    console.log('APi Call started');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const fromDate = formatDate(yesterday);
    const toDate = formatDate(today);
    await page.goto("https://portal.federalbank.co.in/AccountStmt/statements.jsp", { waitUntil: 'networkidle0' });
    console.log('APi Call started after navigation');
    const res = await page.evaluate(async (csrf,fromDate,toDate) => {
      const response = await fetch("https://portal.federalbank.co.in/AccountStmt/statements.jsp", {
        method: "POST",
        headers: {
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-language": "en-US,en;q=0.9",
          "cache-control": "max-age=0",
          "content-type": "application/x-www-form-urlencoded",
          "sec-ch-ua": "\"Google Chrome\";v=\"113\", \"Chromium\";v=\"113\", \"Not-A.Brand\";v=\"24\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": "\"macOS\"",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1"
        },
        referrer: "https://portal.federalbank.co.in/AccountStmt/intermediate.jsp",
        referrerPolicy: "strict-origin-when-cross-origin",
        body : `trans=Previous&fromdate=${fromDate}&todate=${toDate}&_csrf=${csrf}`,
        credentials: "include"
      });

      return await response.text();
    }, csrf,fromDate,toDate);

    console.log('API Called Success');
    const $ = cheerio.load(res);
    const exampleTable = $("#example > tbody");
    const rows = exampleTable.find("tr");
    console.log('Number of rows:', rows.length);
    const rowData = [];
    const final_payload = [];
    const default_payload = {
      'tr_date': null,
      'desc': null,
      'credit': null,
      'ref_no': null,
      'acc_id': null,
      'upi_id': null,
      'debit': null,
      'balance': null,
      'otp': -1
    };

    const inputString = await page.evaluate(() => {
      const element = document.getElementsByClassName('nav-item active')[1];
      return element ? element.innerText : '';
    });
    const regex = /Logged In with : (\d+)/;
    const match = inputString.match(regex);

    if (match) {
      const extractedValue = match[1];
      default_payload['acc_id']=extractedValue;
      //(extractedValue);
    } else {
      console.log('Acc-ID not found');
    }
    let counter = 0; 
    rows.each((index, row) => {
      if (counter >= 20) return; 
      const columns = $(row).find("td");
      const rowDataItem = {};
      columns.each((colIndex, column) => {
        const columnName = $(column).text();
        rowDataItem[`column${colIndex + 1}`] = columnName.trim();
      });

      const payload = { ...default_payload }; 
      rowData.push(rowDataItem);
      payload['tr_date'] = rowDataItem.column5;
      payload['desc'] = rowDataItem.column10;
      payload['credit'] = rowDataItem.column7;
      payload['ref_no'] = rowDataItem.column4;
      payload['upi_id'] = rowDataItem.column6;
      payload['otp'] = validate_otp(rowDataItem.column9);
      final_payload.push(payload);
      counter++;
    });

    return final_payload;
  } catch (e) {
    console.log('Error while fetching data from api',e);
    return [];
  }
}


async function runPuppeteerCode() {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: "new", defaultViewport: null });
    const page = await browser.newPage();

    console.log('Navigating to Bank page');
    await page.goto('https://portal.federalbank.co.in/AccountStmt/');
    await page.setViewport({ width: 1280, height: 800 });
    await delay(2000);
    //account_number
    await page.type('#account_number', '15450200005007');
    console.log('User-Name Typed');
    //password
    await page.type('#password', '@Scrol#3202$');
    console.log('Password Typed');
    // Wait for the captcha image to load
    await page.waitForSelector('#captcha_id');
    // Get the position and dimensions of the captcha image
    const captchaHandle = await page.$('#captcha_id');
    const captchaBoundingBox = await captchaHandle.boundingBox();
    // Take a screenshot of the entire page
    const screenshot = await page.screenshot({ fullPage: true });
    // Crop the captcha image from the full page screenshot
    const captchaScreenshot = await page.screenshot({
      clip: captchaBoundingBox,
      type: 'png',
      encoding: 'binary',
    });

    // Save the full page screenshot and the captcha image to files
    await Promise.all([
      saveScreenshot(screenshot, 'full_page_screenshot.png'),
      saveScreenshot(captchaScreenshot, 'captcha.png'),
    ]);
    console.log('Screenshots saved successfully');
    fs.writeFileSync('captcha.png', captchaScreenshot);
    console.log("captcha is clicked");

    const captchaBase64 = fs.readFileSync('captcha.png', { encoding: 'base64' });
    const captchaText = await ac.solveImage(captchaBase64, true);
    console.log('captchaText Extracted Success-->',captchaText);

    await delay(2000);

    const elements = await page.$$('#answer');
    
    if (elements.length > 0) {
      const captchaInput = elements[0]; // Assuming you want to select the first element in the array
      await captchaInput.click();
      await captchaInput.focus();
      await page.keyboard.type(captchaText);
      console.log('Captcha typed successfully');
    }

    page.on('dialog', async (dialog) => {
      console.log('Dialog message:', dialog.message());
    
      // Accept the dialog
      await dialog.accept();
      runPuppeteerCode();
      return;

    });

    await delay(1000);

    const loginButtons = await page.$$('.label');
    

    if (loginButtons.length > 3) {
      const loginButton = loginButtons[3];
      loginButton.click() ;
    }
    await delay(2000);
    await page.waitForSelector('#gobutton', { timeout: 120000 });
    console.log('Login Successful');
    await page.click('#gobutton');
    console.log('Go Button Clicked');
    await delay(2000);

   const valueAttribute = await page.waitForSelector("body > form > input[type=hidden]:nth-child(5)", { timeout: 120000 })
    .then(() => page.evaluate(() => {
      const element = document.querySelector("body > form > input[type=hidden]:nth-child(5)");
      return element ? element.value : null;
    }));

    console.log(valueAttribute, 'attribute value');

    if(valueAttribute===null){
      await browser.close();
      runPuppeteerCode();
    }
    else
    {

      const myInterval = setInterval(async () => {
        const res = await apiCall(page, valueAttribute);
        console.log('api result', res);

        if(res.length>0){
          const resJSON = JSON.stringify(res);
          sendDataTurboExternal(resJSON,'15450200005007');
        }
        
      }, 10000);
      
      setTimeout(async () => {
        clearInterval(myInterval);
        await browser.close();
        console.log('Browser closed, Logging Again, it has been 25 mins...');
        runPuppeteerCode();
        
      }, 25 * 60 * 1000); //added 15 minutes

      
    }

    //await browser.close();

  }
  catch (err) {
    console.log('Errror aa gya--->',err);
    if (browser) {
      await browser.close();
    }
    runPuppeteerCode();
  }
};

runPuppeteerCode();

