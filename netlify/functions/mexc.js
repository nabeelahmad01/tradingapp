// Netlify Function: Proxy to MEXC API with CORS
// Usage (prod): /.netlify/functions/mexc/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=500

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 204, headers: corsHeaders(), body: '' }
    }
    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers: corsHeaders(),
        body: 'Method Not Allowed',
      }
    }

    // Compute the path after the function prefix
    const functionPrefix = '/.netlify/functions/mexc'
    const originalPath = event.path || ''
    const forwardPath = originalPath.startsWith(functionPrefix)
      ? originalPath.slice(functionPrefix.length)
      : originalPath

    // Build the forward URL
    const qs = new URLSearchParams(event.queryStringParameters || {}).toString()
    const url = `https://api.mexc.com${forwardPath}${qs ? `?${qs}` : ''}`

    const res = await fetch(url)
    const text = await res.text()
    return {
      statusCode: res.status,
      headers: {
        ...corsHeaders(),
        'Content-Type': res.headers.get('content-type') || 'application/json',
      },
      body: text,
    }
  } catch (e) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: e.message }),
    }
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}
