const http = require('node:http');

const PORT = 8787;
const KIMI_ENDPOINT = 'https://api.moonshot.cn/v1/chat/completions';
const DEFAULT_MODEL = 'kimi-k3';
const SYSTEM_PROMPT = '你是 Kimi，由 Moonshot AI 提供的人工智能助手。你會為用戶提供安全、有幫助、準確的回答。你是專為高密度都市（如澳門）設計的視障人士出行安全助手。你的最高原則是：提供極度簡練、致命度優先的警告，絕對不輸出多餘的廢話，以免語音播報遮蔽盲人聆聽真實環境的聲音（如車流聲）。';

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => {
      body += chunk;
      if (body.length > 12 * 1024 * 1024) {
        reject(new Error('影像請求太大，請降低圖片尺寸。'));
        request.destroy();
      }
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

function getText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.filter(item => item.type === 'text').map(item => item.text).join('\n');
  }
  return '';
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {});
    return;
  }

  if (request.method === 'GET' && request.url === '/health') {
    sendJson(response, 200, { ok: true, service: 'kimi-proxy' });
    return;
  }

  if (request.method !== 'POST' || request.url !== '/api/kimi') {
    sendJson(response, 404, { error: '找不到 Kimi proxy 路由。' });
    return;
  }

  try {
    const requestBody = JSON.parse(await readBody(request));
    const apiKey = String(requestBody.apiKey || '').trim();
    const imageDataUrl = String(requestBody.imageDataUrl || '');
    const language = requestBody.language === 'en-US' ? 'English' : requestBody.language === 'zh-CN' ? '普通話' : '廣東話';

    if (!apiKey) throw new Error('未提供 Kimi API key。');
    if (!imageDataUrl.startsWith('data:image/')) throw new Error('未提供有效的鏡頭影像。');

    const kimiResponse = await fetch(KIMI_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        temperature: 1,
        max_tokens: 1024,
        messages: [{
          role: 'system',
          content: SYSTEM_PROMPT
        }, {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `請用${language}，只用一句極短句（不超過 15 個字）描述鏡頭前最需要注意的障礙物、方向和緊急程度。請優先偵測以下澳門街道常見威脅：1. 半空危機（白手杖掃不到的頭胸高度）：突出的招牌、冷氣機、大廈維修棚架。2. 不規則地面障礙：違泊電單車（機車）、臨時水馬、掘路工程。不要猜測距離，不要打招呼，不要輸出分析過程。如果沒有明顯碰撞威脅，請嚴格只回答「暫無明顯威脅」。`
            },
            { type: 'image_url', image_url: { url: imageDataUrl } }
          ]
        }]
      })
    });

    const result = await kimiResponse.json();
    console.log("Kimi API 原始回應：", JSON.stringify(result, null, 2));

    if (!kimiResponse.ok) {
      throw new Error(result.error?.message || `Kimi API HTTP ${kimiResponse.status}`);
    }

    sendJson(response, 200, { text: getText(result.choices?.[0]?.message?.content) });
  } catch (error) {
    sendJson(response, 400, { error: error.message || 'Kimi proxy 發生未知錯誤。' });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Kimi proxy listening at http://localhost:${PORT}`);
});
