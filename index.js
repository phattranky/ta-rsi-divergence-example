const axios = require('axios');
const ta = require('ta.js');

// timeFrame: '5m' | '15m' | '30m' | '1h' | '4h' | '1d'
const CONTRACT_TYPE = 'PERPETUAL';

function generateUrl(pair, timeFrame, startTime, endTime) {
  return `https://fapi.binance.com/fapi/v1/continuousKlines?pair=${pair}&contractType=${CONTRACT_TYPE}&interval=${timeFrame}&startTime=${startTime}&endTime=${endTime}`;
}

function transformBinancePriceValues(chunks) {
  return {
    openTime: Number(chunks[0]),
    openPrice: Number(chunks[1]),
    highPrice: Number(chunks[2]),
    lowPrice: Number(chunks[3]),
    closePrice: Number(chunks[4]),
    volume: Number(chunks[5]),
    closeTime: Number(chunks[6]),
    quoteAssetVolume: Number(chunks[7]),
    numberOfTrades: Number(chunks[8]),
    takerBuyVolume: Number(chunks[9]),
    takerBuyQuoteAssetVolume: Number(chunks[10]),
  };
}

function checkRSIDivergence(items) {
  for (let i = 0; i < items.length; i++) {
    const pairItem = items[i];

    if (pairItem.data.length < 80) {
      continue;
    }

    const availableCandles =
      pairItem.data[pairItem.data.length - 1].closeTime <= new Date().getTime()
        ? pairItem.data
        : pairItem.data.slice(0, pairItem.data.length - 1);
    const closePrices = availableCandles.map(
      (itemDetail) => itemDetail.closePrice
    );

    const RSI_LENGTH = 14;
    const rsi_function = ta.wrsi; // default (the tradingview rsi indicator)
    const rsiValues = rsi_function(closePrices, RSI_LENGTH);
    const length = 12; // array length to check
    const threshold_exaggerated = 0.03; // percentual change threshold for 'exaggerated' divergence
    const threshold_normal = 0.01; // percentua

    for (let currLookBack = 3; currLookBack <= 30; currLookBack++) {
      console.log(`${pairItem.pair} - ${currLookBack}`);
      // console.log(closePrices);
      // console.log(rsiValues);
      const divergenceResult = ta.divergence_state(
        closePrices,
        rsiValues,
        length,
        currLookBack,
        threshold_exaggerated,
        threshold_normal
      );

      divergenceResult.forEach((itm) => {
        itm.forEach((aa) => {
          if (aa !== 'convergence') {
            console.log('Found');
          }
        });
      });
    }
  }
}

async function main() {
  const checkingPairs = ['LINKUSDT'];
  const startTime = new Date('2023-01-14').getTime();
  const endTime = new Date('2023-03-30').getTime();
  const timeFrame = '1h';

  //  fetch Data
  const responses = [];
  for (let i = 0; i < checkingPairs.length; i++) {
    const item = checkingPairs[i];
    console.log(`GET: ${item} - ${timeFrame}`);
    const url = generateUrl(item, timeFrame, startTime, endTime);
    responses.push(await axios.get(url));
  }

  const transformedData = responses.map((response, index) => {
    return {
      pair: checkingPairs[index],
      data: response.data.map((item) => transformBinancePriceValues(item)),
    };
  });

  //
  checkRSIDivergence(transformedData);
}

main();
