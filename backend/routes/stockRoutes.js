
const express = require("express");

const router = express.Router();

// Symbols use Alpha Vantage's exchange suffix.
// RELIANCE.BSE is the symbol we have tested successfully.
const stocks = {
  RELIANCE: {
    name: "Reliance Industries",
    exchange: "BSE",
    apiSymbol: "RELIANCE.BSE"
  },
  TCS: {
    name: "Tata Consultancy Services",
    exchange: "BSE",
    apiSymbol: "TCS.BSE"
  },
  INFY: {
    name: "Infosys",
    exchange: "BSE",
    apiSymbol: "INFY.BSE"
  },
  HDFCBANK: {
    name: "HDFC Bank",
    exchange: "BSE",
    apiSymbol: "HDFCBANK.BSE"
  },
  SBIN: {
    name: "State Bank of India",
    exchange: "BSE",
    apiSymbol: "SBIN.BSE"
  }
};

function findStock(symbol) {
  return stocks[symbol.toUpperCase()];
}

async function fetchDailyPrices(symbol) {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "ALPHA_VANTAGE_API_KEY is missing from backend .env"
    );
  }

  const url = new URL("https://www.alphavantage.co/query");

  url.search = new URLSearchParams({
    function: "TIME_SERIES_DAILY",
    symbol,
    outputsize: "compact",
    apikey: apiKey
  }).toString();

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error("Alpha Vantage HTTP request failed.");
  }

  if (
    data["Error Message"] ||
    data.Note ||
    data.Information
  ) {
    throw new Error(
      data["Error Message"] ||
      data.Note ||
      data.Information
    );
  }

  const timeSeries = data["Time Series (Daily)"];

  if (!timeSeries) {
    throw new Error("No daily price data returned by Alpha Vantage.");
  }

  return Object.entries(timeSeries)
    .map(([date, item]) => ({
      datetime: date,
      open: Number(item["1. open"]),
      high: Number(item["2. high"]),
      low: Number(item["3. low"]),
      close: Number(item["4. close"]),
      volume: Number(item["5. volume"])
    }))
    .sort((a, b) => a.datetime.localeCompare(b.datetime));
}

// GET /api/stocks
router.get("/", (req, res) => {
  const result = Object.entries(stocks).map(([symbol, stock]) => ({
    symbol,
    name: stock.name,
    exchange: stock.exchange
  }));

  res.json({
    success: true,
    stocks: result
  });
});

// GET /api/stocks/RELIANCE/price
router.get("/:symbol/price", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const stock = findStock(symbol);

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: "Stock symbol not supported."
      });
    }

    const prices = await fetchDailyPrices(stock.apiSymbol);
    const latest = prices[prices.length - 1];

    if (!latest) {
      return res.status(502).json({
        success: false,
        message: "No price data available."
      });
    }

    return res.json({
      success: true,
      stock: {
        symbol,
        name: stock.name,
        exchange: stock.exchange,
        price: latest.close,
        date: latest.datetime
      }
    });
  } catch (error) {
    console.error("Stock price error:", error.message);

    return res.status(502).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/stocks/RELIANCE/history?outputsize=30
router.get("/:symbol/history", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const stock = findStock(symbol);

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: "Stock symbol not supported."
      });
    }

    const requestedSize = Number(req.query.outputsize || 30);

    if (
      !Number.isInteger(requestedSize) ||
      requestedSize < 1 ||
      requestedSize > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "outputsize must be between 1 and 100."
      });
    }

    const prices = await fetchDailyPrices(stock.apiSymbol);
    const values = prices.slice(-requestedSize);

    return res.json({
      success: true,
      stock: {
        symbol,
        name: stock.name,
        exchange: stock.exchange
      },
      interval: "1day",
      values
    });
  } catch (error) {
    console.error("Stock history error:", error.message);

    return res.status(502).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
