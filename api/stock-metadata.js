const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.5 Safari/605.1.15';

const sendJSON = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    sendJSON(res, 200, { ok: true });
    return;
  }

  const symbol = (req.query.symbol || '').toString().trim();
  if (!symbol) {
    sendJSON(res, 400, { error: 'Symbol required' });
    return;
  }

  const upperSymbol = symbol.toUpperCase();
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
    upperSymbol
  )}?modules=assetProfile,fundProfile,summaryProfile`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      sendJSON(res, response.status, { error: `Failed to fetch metadata: ${response.status}` });
      return;
    }

    const data = await response.json();
    const summary = data?.quoteSummary?.result?.[0];
    const assetProfile = summary?.assetProfile;
    const fundProfile = summary?.fundProfile;
    const summaryProfile = summary?.summaryProfile;

    if (!assetProfile && !fundProfile && !summaryProfile) {
      sendJSON(res, 200, {
        symbol: upperSymbol,
        sector: null,
        industry: null,
        country: null,
        category: null,
      });
      return;
    }

    sendJSON(res, 200, {
      symbol: upperSymbol,
      sector: assetProfile?.sector ?? summaryProfile?.sector ?? null,
      industry: assetProfile?.industry ?? summaryProfile?.industry ?? null,
      country: assetProfile?.country ?? summaryProfile?.country ?? null,
      category: fundProfile?.categoryName ?? fundProfile?.investmentStyle ?? null,
    });
  } catch (error) {
    console.error(`Error fetching metadata for ${upperSymbol}:`, error);
    sendJSON(res, 500, { error: 'Failed to fetch stock metadata' });
  }
};

