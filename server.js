require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/chat', async (req, res) => {
  console.log('POST /api/chat', Date.now(), req.body?.message);

  try {
    const { message, state, history } = req.body || {};

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({
        reply: '未設定 OPENROUTER_API_KEY。'
      });
    }

    const safeHistory = Array.isArray(history)
      ? history
          .filter(
            (item) =>
              item &&
              (item.role === 'user' || item.role === 'assistant') &&
              typeof item.content === 'string'
          )
          .slice(-8)
      : [];

    const systemPrompt = `
你係一個武俠文字RPG旁白。
所有內容必須使用自然、流暢、地道的繁體中文。
用香港常用書面語，但不要用生硬口語。
文風要有江湖味、畫面感，同時清晰易明。
嚴禁輸出簡體中文、奇怪病句、重複字詞、思考過程、備註、括號標題。
直接輸出最終內容。

回覆格式必須固定：
第一段：武俠敘事，2至4句。
第二段：一句人物對話或環境反應。
第三段：列出三個建議行動，用 A / B / C 開頭。
`;

    const userPrompt = `
玩家目前狀態：
等級：${state?.level ?? 1}
經驗：${state?.exp ?? 0}
血量：${state?.hp ?? 100}
銀兩：${state?.money ?? 10}
名望：${state?.fame ?? 0}

玩家行動：
${message ?? '無'}

請根據以上狀態延續上一段劇情，保持前後連貫。
`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-OpenRouter-Title': 'Blade RPG MVP'
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'openrouter/free',
        messages: [
          { role: 'system', content: systemPrompt },
          ...safeHistory,
          { role: 'user', content: userPrompt }
        ],
        reasoning: {
          exclude: true
        },
        temperature: 0.6,
        top_p: 0.9,
        frequency_penalty: 0.2,
        presence_penalty: 0.1,
        max_completion_tokens: 1200
      })
    });

    const rawText = await response.text();
    console.log('OpenRouter status:', response.status);

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      console.log('OpenRouter raw parse failed:', rawText);
      return res.status(500).json({
        reply: 'OpenRouter 回傳唔係 JSON。',
        error: rawText
      });
    }

    if (!response.ok) {
      console.log('OpenRouter error:', JSON.stringify(data, null, 2));

      const code = data?.error?.code;

      if (code === 429) {
        return res.status(429).json({
          reply: '目前免費模型繁忙，請稍後再試。'
        });
      }

      return res.status(500).json({
        reply: 'AI 暫時無法回應。',
        error: data
      });
    }

    if (!Array.isArray(data?.choices) || data.choices.length === 0) {
      console.log('OpenRouter unexpected response:', JSON.stringify(data, null, 2));
      return res.status(500).json({
        reply: 'AI 回應格式異常。'
      });
    }

    const choice = data.choices[0];
    console.log('OpenRouter first choice:', JSON.stringify(choice, null, 2));

    const finishReason = choice?.finish_reason || '';
    const reply =
      typeof choice?.message?.content === 'string'
        ? choice.message.content.trim()
        : '';

    console.log('OpenRouter reply preview:', reply ? reply.slice(0, 120) : '[empty]');

    if (!reply) {
      if (finishReason === 'length') {
        return res.status(502).json({
          reply: 'AI 回應過長而被截斷，請再試一次。'
        });
      }

      return res.status(502).json({
        reply: 'AI 沒有返回可用內容，請再試一次。'
      });
    }

    return res.json({ reply });
  } catch (error) {
    console.error('SERVER ERROR:', error);
    return res.status(500).json({
      reply: '伺服器出現錯誤。',
      error: error.message
    });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Server running ');
});
