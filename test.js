// // Function to check BTC transactions for a specified wallet address
// const checkBTCTransaction = async (walletAddress, amount, btcRate) => {
//   try {
//     const baseUrl = IS_TESTNET ? BASE_URL_TESTNET : BASE_URL_MAINNET;
//     const url = `${baseUrl}/${walletAddress}/full?token=${BLOCKCYPHER_TOKEN}`;

//     // Mark the start time and set stop time (5 minutes later)
//     const startTime = new Date();
//     const stopTime = new Date(startTime.getTime() + 5 * 60 * 1000);
//     const checkTime = new Date(startTime.getTime() + 4.5 * 60 * 1000);

//     // Schedule the check after 4.5 minutes
//     const timeoutId = setTimeout(async () => {
//       const currentTime = new Date();

//       // If current time exceeds stop time, stop checking
//       if (currentTime > stopTime) {
//         console.log(
//           "Stop time exceeded. Set wallet flag to available now and set the status to Unsuccessful."
//         );
//         return;
//       }

//       // Fetch transactions from the API
//       const response = await axios.get(url);
//       const transactions = response.data?.txs || [];
//       console.log(`The lastTransaction is: ${transactions}`);

//       if (transactions.length === 0) {
//         console.log("No transactions found for this address.");
//         return;
//       }

//       // Check the most recent transaction
//       const lastTransaction = transactions[0];
//       const transactionTime = new Date(lastTransaction.received);

//       // Check if the transaction time is within the allowed time window
//       if (transactionTime >= startTime && transactionTime <= stopTime) {
//         console.log("Transaction time is within the allowed time window.");
//         if (lastTransaction.confirmations > 0) {
//           const transactionAmount = lastTransaction.total / 1e8;
//           const transactionDollarAmount = transactionAmount * btcRate;
//           // const sentDollarAmount = amount * btcRate;
//           let lowerBound;
//           let upperBound;
//           if (transactionDollarAmount <= 50) {
//             lowerBound = amount * 0.9;
//             upperBound = amount * 1.1;
//           } else {
//             lowerBound = amount * 0.9;
//             upperBound = amount * 1.1;
//           }

//           if (
//             transactionAmount >= lowerBound &&
//             transactionAmount <= upperBound
//           ) {
//             console.log(
//               `The transaction scaled through: Amount matches the expected range. Trigger payment now. The equivalent in USD is ${transactionDollarAmount}`
//             );

//             // UNCOMMENT THIS PART AND DO THE REMANINIG IMPLEMENTATION
//             // try {
//             //   // call the mongoro api for payout
//             //   await mongoroApi(
//             //     acct_number,
//             //     bank_name,
//             //     bank_code,
//             //     receiver_name,
//             //     db,
//             //     transac_id,
//             //     amount_sent
//             //   ).then(() => {
//             //     // release the wallet for the next user
//             //     setEthWalletFlag(wallet_address, db);
//             //     // change the transaction status to COMPLETED
//             //   });
//             // } catch (err) {
//             //   // send the support bot error message with the ${err}
//             // }
//           } else {
//             console.log(
//               `Transaction amount is outside the allowed range: Expected between ${lowerBound} BTC and ${upperBound} BTC, but got ${transactionAmount} BTC. The equivalent in USD is ${transactionDollarAmount}`
//             );
//             // tell customer support that we have a transaction but it does not fall into the expected range
//           }
//         } else {
//           console.log("The last transaction is not yet confirmed.");
//         }
//       } else {
//         console.log("Transaction time is outside the allowed time window.");

//         // tell customer support we have a transaction but it is out side the transaction window
//       }

//       // Stop after one call since we only check once
//       clearTimeout(timeoutId);
//     }, 4.5 * 60 * 1000); // 4.5 minutes (in milliseconds)
//   } catch (error) {
//     console.error("Error fetching transactions:", error.message);
//   }
// };

// // Example usage: Call the function with a wallet address and amount (replace with actual values)
// const walletAddress = "mwSfHYg3W2YQDQWkwkMXsnwEX7kFtygFr9"; // Replace with the wallet address you want to monitor ie the wallet_address
// const amountToCheck = 0.002; // Replace with the amount (in BTC) you expect ie the Amount
// const btcRate = 60768.917; // btc rate from the db ie the asset_price

// Function to check BTC transactions for a specified wallet address
async function monitorBTCTransactions(wallet_address, acct_number, bank_name, bank_code, receiver_name, db, transac_id, timers, crypto_sent, receiver_amount, current_rate, asset_price) {
  try {
    const baseUrl = IS_TESTNET ? BASE_URL_TESTNET : BASE_URL_MAINNET;
    const url = `${baseUrl}/${wallet_address}/full?token=${BLOCKCYPHER_TOKEN}`;

     const response = await axios.get(url);
      const transactions = response.data?.txs || [];
      console.log(`The lastTransaction is: ${transactions}`);
     
            if (transactions.length === 0) {
        console.log("No transactions found for this address.");
          return;
            }
        timers[transac_id]['lastTransaction']  = transactions[0];
        timers[transac_id]['transactionDate'] = new Date(timers[transac_id]['lastTransaction'].received);
    if (timers[transac_id]['transactionDate'] >= timers[transac_id]['currentTime'] && timers[transac_id]['transactionDate'] <= timers[transac_id]['futureTime']) {

      if (timers[transac_id]['lastTransaction'].confirmations > 0) { 
        const transactionAmount = timers[transac_id]['lastTransaction'].total / 1e8;
        const actualAmount = transactionAmount.toFixed(8);
         const expectedamount = crypto_sent.replace(/[^0-9.]/g, "");
        if (actualAmount == expectedamount) {
            const nairaAmount = receiver_amount.replace(/[^0-9.]/g, "");
          const amount_sent = nairaAmount.split(".")[0];
           clearInterval(timers[transac_id]['monitoringTimer'])
           clearTimeout(timers[transac_id]['Timeout']);
           mongoroApi(acct_number, bank_name, bank_code, receiver_name, db, transac_id, amount_sent);
           setBTCWalletFlag(wallet_address, db);
          actualAmounts(transac_id, actualAmount, amount_sent, db);
        } else {
            handleSmallAmount(actualAmount, expectedamount, current_rate, transac_id, acct_number, bank_name, bank_code, receiver_name, db, wallet_address, acct_number, bank_name, bank_code, receiver_name, db, transac_id, timers, asset_price);
      }



      }
    }

  }catch (error) {
    console.error("Error fetching transactions:", error.message);
  }
}



async function monitorBTCTransactions(wallet_address, acct_number, bank_name, bank_code, receiver_name, db, transac_id, timers, crypto_sent, receiver_amount, current_rate, asset_price,mode_of_payment) {
  const baseUrl = IS_TESTNET ? BASE_URL_TESTNET : BASE_URL_MAINNET;
  const url = `https://blockchain.info/rawaddr/${wallet_address}`;

  return await addToQueue(async () => {
    try {
      const response = await axios.get(url);
      const transactions = response.data?.txs || [];
      console.log(`The lastTransaction is: ${transactions}`);

      if (transactions.length === 0) {
        console.log("No transactions found for this address.");
        return;
      }

      timers[transac_id]['lastTransaction'] = transactions[0];
      console.log(timers[transac_id]['lastTransaction'])
      timers[transac_id]['transactionDate'] = new Date(timers[transac_id]['lastTransaction'].time * 1000); // Convert UNIX timestamp to Date
      
      if (timers[transac_id]['transactionDate'] >= timers[transac_id]['currentTime'] && timers[transac_id]['transactionDate'] <= timers[transac_id]['futureTime']) {
        if (timers[transac_id]['lastTransaction'].confirmations > 0) {
          const transactionAmount = timers[transac_id]['lastTransaction'].out.reduce((total, output) => total + output.value, 0) / 1e8;
          const actualAmount = transactionAmount.toFixed(8);
          const expectedAmount = crypto_sent.replace(/[^0-9.]/g, "");

          if (actualAmount === expectedAmount) {
            const nairaAmount = receiver_amount.replace(/[^0-9.]/g, "");
            const amount_sent = nairaAmount.split(".")[0];

            // Stop monitoring and trigger further actions
            clearInterval(timers[transac_id]['monitoringTimer']);
            clearTimeout(timers[transac_id]['Timeout']);
            mongoroApi(acct_number, bank_name, bank_code, receiver_name, db, transac_id, amount_sent);
            setBTCWalletFlag(wallet_address, db);
            actualAmounts(transac_id, actualAmount, amount_sent, db);
          } else {
            handleSmallAmount(actualAmount, expectedAmount, current_rate, transac_id, acct_number, bank_name, bank_code, receiver_name, db, wallet_address, acct_number, bank_name, bank_code, receiver_name, db, transac_id, timers, asset_price);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching transactions:", error.message);
    }
  });
}