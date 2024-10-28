
require("dotenv").config();
const axios = require("axios");

const BASE_URL_TESTNET = process.env.BASE_URL_TESTNET;
const BASE_URL_MAINNET = process.env.BASE_URL_MAINNET;
const BLOCKCYPHER_TOKEN = process.env.BLOCKCYPHER_TOKEN;
const IS_TESTNET = process.env.IS_TESTNET === "true";


const queue = [];
let isProcessing = false;
const delayBetweenRequests = 5000; // 1 second delay (adjust based on API rate limit)

function addToQueue(fn) {
  return new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject });
    processQueue();
  });
}


async function processQueue() {
  if (isProcessing || queue.length === 0) return;

  const { fn, resolve, reject } = queue.shift();
  isProcessing = true;

  try {
    const result = await fn();
    resolve(result);
  } catch (error) {
    reject(error);
  }

  isProcessing = false;

  // Delay the next request to avoid hitting the rate limit
  setTimeout(processQueue, delayBetweenRequests);
}

// Updated function with queue mechanism


async function monitorBTCTransactions(wallet_address, acct_number, bank_name, bank_code, receiver_name, db, transac_id, timers, crypto_sent, receiver_amount, current_rate, asset_price, mode_of_payment) {
  const url = `${BASE_URL_MAINNET}/${wallet_address}`;

  return await addToQueue(async () => {
    try {
      const response = await axios.get(url);
      const transactions = response.data?.txs || [];
 //     console.log(`All Transactions: ${JSON.stringify(transactions, null, 2)}`);

      if (transactions.length === 0) {
        console.log("No transactions found for this address.");
        return;
      }

      // Find the last incoming transaction
      const lastTransaction = transactions.find((tx) => 
        tx.out.some((output) => output.addr === wallet_address && !output.spent)
      );

      if (!lastTransaction) {
        console.log("No incoming transactions found for this address.");
        return;
      }

      console.log('lastTransaction', lastTransaction)

      timers[transac_id]['transactionDate'] = new Date(lastTransaction.time * 1000); // Convert UNIX timestamp to Date
      const transactionAmount = lastTransaction.out.find(output => output.addr === wallet_address).value / 1e8; // BTC amount

      // console.log(`Transaction Date: ${transactionDate}`);
      // console.log(`Transaction Amount (BTC): ${transactionAmount.toFixed(8)}`);

      const expectedAmount = parseFloat(crypto_sent.replace(/[^0-9.]/g, ""));
      if (timers[transac_id]['transactionDate'] >= timers[transac_id]['currentTime'] && timers[transac_id]['transactionDate'] <= timers[transac_id]['futureTime']) { 
       if (transactionAmount.toFixed(8) === expectedAmount.toFixed(8)) {
         const amount_sent = parseFloat(receiver_amount.replace(/[^0-9.]/g, "").split(".")[0]);
               if (mode_of_payment === 'Gift') {
             setGiftStatus(db, transac_id)
          } else {
             mongoroApi(acct_number, bank_name, bank_code, receiver_name, db, transac_id, amt_sent);
            }
        // Stop monitoring and trigger further actions
        clearInterval(timers[transac_id]['monitoringTimer']);
        clearTimeout(timers[transac_id]['Timeout']);
        setBTCWalletFlag(wallet_address, db);
        actualAmounts(transac_id, transactionAmount, amount_sent, db);
      } else {
       handleSmallAmount(transactionAmount, expectedAmount, current_rate, transac_id, acct_number, bank_name, bank_code, receiver_name, db ,wallet_address, timers,asset_price,mode_of_payment )
      }
      }else {
      console.log('The last transaction did not happen within the last 10 minutes.');
    }

    } catch (error) {
      console.error("Error fetching transactions:", error.message);
    }
  });
}





function monitoringTimer(wallet_address, acct_number, bank_name, bank_code, receiver_name, db, transac_id, timers, crypto_sent, receiver_amount, current_rate, asset_price,mode_of_payment) {
    timers[transac_id]['monitoringTimer'] = setInterval(() => {
       monitorBTCTransactions(wallet_address, acct_number, bank_name, bank_code, receiver_name, db, transac_id, timers, crypto_sent, receiver_amount, current_rate,asset_price,mode_of_payment)
    }, 60000);  // 1 minutes = 60,000 milliseconds
}


function handleSmallAmount(actualAmount, expectedamount, current_rate, transac_id, acct_number, bank_name, bank_code, receiver_name, db ,wallet_address, timers,asset_price, mode_of_payment) {
 const rate = current_rate.replace(/[^0-9.]/g, "");
const assetPrice = asset_price.replace(/[^0-9.]/g, "");
const  dollarActualAmount = actualAmount * assetPrice
const naira = dollarActualAmount * rate;
const  dollarExpectedamount = expectedamount * assetPrice   

  let transactionFee;
   console.log('this function is working perfectly')
  if (naira <= 100000) {
    transactionFee = 500;
  } else if (naira <= 1000000) {
    transactionFee = 1000;
  } else if (naira <= 2000000) {
    transactionFee = 1500;
  }

  const num = 50
  const fifty = Number(num).toFixed(8)
  
  const nairaValue = naira - transactionFee;
  if (nairaValue > transactionFee) {
    if (dollarActualAmount <= fifty) {
      const max = Number(dollarActualAmount) + 5
      const maxAmount = max.toFixed(8)
      const min = Number(dollarActualAmount) - 5
      const minAmount = min.toFixed(8)
      console.log('maxAmount:',maxAmount)
      console.log("minAmount:", minAmount)
      console.log("dollarActualAmount:", dollarActualAmount)
      console.log("expectedamount:", dollarExpectedamount)
      if (dollarExpectedamount <= maxAmount && dollarExpectedamount >= minAmount) {
        console.log('for smaller money ')
           handleAmountCal(wallet_address, acct_number, bank_name, bank_code, receiver_name, db, transac_id, timers, actualAmount,nairaValue,mode_of_payment)
      }else {
            console.log('This amount is too less for the transaction.');
       }

    } else if (dollarActualAmount > fifty) {
      const max = Number(dollarActualAmount) * 1.1
      const maxAmount = max.toFixed(8) 
      const min = Number(dollarActualAmount) * 0.9
      const minAmount = min.toFixed(8)

      if (dollarExpectedamount <= maxAmount && dollarExpectedamount >= minAmount) {
         console.log('for bigger money ')
       handleAmountCal(wallet_address, acct_number, bank_name, bank_code, receiver_name, db, transac_id, timers, actualAmount,nairaValue,mode_of_payment)
      } else {
            console.log('This amount is too big for the transaction.');
       }
  }
  } else {
    console.log('This amount is too small for the transaction.');
  }
}


function handleAmountCal(wallet_address, acct_number, bank_name, bank_code, receiver_name, db, transac_id, timers, actualAmount,nairaValue,mode_of_payment) {
  
    const strNairaValue = nairaValue.toString();
    const amount = strNairaValue.replace(/[^0-9.]/g, "");
    const amt_sent = amount.split(".")[0];
    const amount_sent = `₦${amt_sent.toLocaleString()}`;
         if (mode_of_payment === 'Gift') {
             setGiftStatus(db, transac_id)
          } else {
             mongoroApi(acct_number, bank_name, bank_code, receiver_name, db, transac_id, amt_sent);
            }
      clearTimeout(timers[transac_id]['Timeout']);
    clearInterval(timers[transac_id]['monitoringTimer'])
    actualAmounts(transac_id, actualAmount, amount_sent, db);
    setBTCWalletFlag(wallet_address, db);

}


function actualAmounts(transac_id, actualAmount,amount_sent,db) {
  const user = {
    actual_crypto: actualAmount,
    Settle_amount_sent: amount_sent
   };
     db.query(`UPDATE 2settle_transaction_table SET ? WHERE transac_id = ?`, [user, transac_id]);
}

async function mongoroApi(acct_number, bank_name, bank_code, receiver_name,db,transac_id,amount_sent) {
    console.log(receiver_name)
    const user = {
        accountNumber: acct_number,
        accountBank: bank_code,
        bankName: bank_name,
        amount: amount_sent,
        saveBeneficiary: false,
        accountName: receiver_name,
        narration: "Sirftiech payment",
        currency: "NGN",
        callbackUrl: "http://localhost:3000/payment/success",
        debitCurrency: "NGN",
        pin: "111111"
    };
    
    try {
        const response = await fetch('https://api-biz-dev.mongoro.com/api/v1/openapi/transfer', {
            method: 'POST', // HTTP method
            headers: {
                'Content-Type': 'application/json',    // Content type
                'accessKey': '117da1d3e93c89c3ca3fbd3885e5a6e29b49001a',
                'token': '75bba1c960a6ce7b608e001d9e167c44a9713e40'
            },
            body: JSON.stringify(user) // Data to be sent
        });

        const responseData = await response.json();

        if (!response.ok) {
            
         customerSupport(acct_number, bank_name,  receiver_name,transac_id,amount_sent)
            
        //    throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);

        }
        if (responseData) {
            console.log('working baby')
             const user = { status: 'Successful' };
         db.query(`UPDATE 2settle_transaction_table SET ? WHERE transac_id = ?`, [user, transac_id]);
        }
        console.log('Transaction successful:', responseData);
    } catch (error) {
      console.error('Error:', error);
      customerSupport(acct_number, bank_name,  receiver_name,transac_id,amount_sent)

    }
}

function setBTCWalletFlag(wallet_address,db) {
     const user = { bitcoin_flag: 'true' };
  db.query(`UPDATE 2Settle_walletAddress SET ? WHERE bitcoin_wallet = ?`, [user, wallet_address]);
  console.log(`this wallet address is release ${wallet_address}`)
}

function customerSupport(acct_number, bank_name,  receiver_name,transac_id,amount_sent) {
       const messageDetails = [
          `Name: ${receiver_name}`,
          `Bank name: ${bank_name}`,
          `Account number: ${acct_number}`,
          `Receiver Amount: ${amount_sent}`,
        ];
        const menuOptions = [
          [{ text: 'Successful', callback_data: `Transaction_id: ${transac_id} Successful` }]
        ];

            const message = `${messageDetails.join('\n')}}`
              axios.post('http://50-6-175-42.bluehost.com:5000/message', {
                message: message,
                menuOptions: menuOptions,
             }, { timeout: 10000 })  // set timeout to 10 seconds (10000 ms))
            
}

function setGiftStatus(db, transac_id) {
    const user = { status: 'Successful', gift_status: 'Not claimed' };
  db.query(`UPDATE 2settle_transaction_table SET ? WHERE transac_id = ?`, [user, transac_id]);
  console.log('this is working perfectly..............')
}
module.exports = {
  setBTCWalletFlag,
    monitoringTimer
}

