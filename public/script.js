const STORAGE_KEYS = {
  state: 'blade_rpg_state',
  log: 'blade_rpg_log',
  history: 'blade_rpg_history',
  scene: 'blade_rpg_scene'
};

const SCENE_NAMES = {
  start: '江湖路口',
  camp: '林間營地',
  village: '山中小村',
  market: '熱鬧市集',
  mountain: '山中深處'
};

const SCENE_ICONS = {
  start: '路',
  camp: '營',
  village: '村',
  market: '市',
  mountain: '山'
};

const SCENE_DESCRIPTIONS = {
  start: '四方道路交錯之地，適合作為初入江湖的起點。',
  camp: '林木幽深，最適合打坐養息與整理內力。',
  village: '隱於山坳的小村，常有零散消息與奇異傳聞。',
  market: '人聲鼎沸、消息靈通，也是買藥補給的好地方。',
  mountain: '山霧瀰漫，路徑難辨，常藏危機也藏機緣。'
};

const gameState = {
  level: 1,
  exp: 0,
  hp: 100,
  money: 10,
  fame: 0
};

let gameHistory = [];
let currentScene = 'start';
let audioCtx = null;

const logEl = document.getElementById('log');
const meditateBtn = document.getElementById('meditateBtn');
const exploreBtn = document.getElementById('exploreBtn');
const marketBtn = document.getElementById('marketBtn');
const resetBtn = document.getElementById('resetBtn');
const choiceActionsEl = document.getElementById('choiceActions');
const locationBadgeEl = document.getElementById('locationBadge');
const hpCardEl = document.getElementById('hpCard');
const apiStatusEl = document.getElementById('apiStatus');
const apiStatusTextEl = document.getElementById('apiStatusText');
const mapInfoTitleEl = document.getElementById('mapInfoTitle');
const mapInfoTextEl = document.getElementById('mapInfoText');
const mapNodes = document.querySelectorAll('.map-node');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setApiStatus(status) {
  const textMap = {
    unknown: '未檢查',
    checking: '連線中',
    online: '可使用',
    busy: '繁忙中',
    offline: '不可用'
  };

  apiStatusEl.className = `signal-chip ${status}`;
  apiStatusTextEl.textContent = textMap[status] || '未檢查';
}

function ensureAudioContext() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) audioCtx = new Ctx();
  }

  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playButtonSound(kind = 'main') {
  try {
    ensureAudioContext();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = kind === 'choice' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(kind === 'choice' ? 520 : 420, now);
    osc.frequency.exponentialRampToValueAtTime(kind === 'choice' ? 680 : 560, now + 0.08);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.035, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  } catch (e) {}
}

function renderLocation() {
  const sceneName = SCENE_NAMES[currentScene] || '未知地點';
  const sceneIcon = SCENE_ICONS[currentScene] || '地';

  locationBadgeEl.innerHTML = `
    <span class="location-icon">${sceneIcon}</span>
    <span>${sceneName}</span>
  `;
}

function renderHpState() {
  hpCardEl.classList.remove('safe', 'warn', 'danger');

  if (gameState.hp <= 30) {
    hpCardEl.classList.add('danger');
  } else if (gameState.hp <= 60) {
    hpCardEl.classList.add('warn');
  } else {
    hpCardEl.classList.add('safe');
  }
}

function renderMap() {
  mapNodes.forEach((node) => {
    const scene = node.dataset.scene;
    node.classList.toggle('active', scene === currentScene);
  });

  if (mapInfoTitleEl) {
    mapInfoTitleEl.textContent = SCENE_NAMES[currentScene] || '未知地點';
  }

  if (mapInfoTextEl) {
    mapInfoTextEl.textContent = SCENE_DESCRIPTIONS[currentScene] || '江湖廣闊，前路未明。';
  }
}

function renderStats() {
  document.getElementById('level').textContent = gameState.level;
  document.getElementById('exp').textContent = gameState.exp;
  document.getElementById('hp').textContent = gameState.hp;
  document.getElementById('money').textContent = gameState.money;
  document.getElementById('fame').textContent = gameState.fame;

  renderLocation();
  renderHpState();
  renderMap();
}

function appendMessage(text) {
  logEl.textContent += `\n\n${text}`;
  logEl.scrollTop = logEl.scrollHeight;
  saveGame();
}

async function appendTypedMessage(text, speed = 14) {
  logEl.textContent += '\n\n';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    logEl.textContent += char;

    if (i % 3 === 0 || char === '\n') {
      logEl.scrollTop = logEl.scrollHeight;
    }

    if (char === '\n') {
      await sleep(speed * 2);
    } else {
      await sleep(speed);
    }
  }

  logEl.scrollTop = logEl.scrollHeight;
  saveGame();
}

function setButtonsDisabled(disabled) {
  meditateBtn.disabled = disabled;
  exploreBtn.disabled = disabled;
  marketBtn.disabled = disabled;

  document.querySelectorAll('.choice-btn').forEach((btn) => {
    btn.disabled = disabled;
  });

  mapNodes.forEach((node) => {
    node.disabled = disabled;
  });
}

function saveGame() {
  localStorage.setItem(STORAGE_KEYS.state, JSON.stringify(gameState));
  localStorage.setItem(STORAGE_KEYS.log, logEl.textContent);
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(gameHistory));
  localStorage.setItem(STORAGE_KEYS.scene, currentScene);
}

function loadGame() {
  const savedState = localStorage.getItem(STORAGE_KEYS.state);
  const savedLog = localStorage.getItem(STORAGE_KEYS.log);
  const savedHistory = localStorage.getItem(STORAGE_KEYS.history);
  const savedScene = localStorage.getItem(STORAGE_KEYS.scene);

  if (savedState) {
    try {
      Object.assign(gameState, JSON.parse(savedState));
    } catch (e) {}
  }

  if (savedLog) {
    logEl.textContent = savedLog;
  }

  if (savedHistory) {
    try {
      const parsed = JSON.parse(savedHistory);
      gameHistory = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      gameHistory = [];
    }
  }

  if (savedScene) {
    currentScene = savedScene;
  }

  renderStats();
}

function resetGame() {
  localStorage.removeItem(STORAGE_KEYS.state);
  localStorage.removeItem(STORAGE_KEYS.log);
  localStorage.removeItem(STORAGE_KEYS.history);
  localStorage.removeItem(STORAGE_KEYS.scene);

  gameState.level = 1;
  gameState.exp = 0;
  gameState.hp = 100;
  gameState.money = 10;
  gameState.fame = 0;

  gameHistory = [];
  currentScene = 'start';
  logEl.textContent = '江湖風起，前路未明。你正站在命運的岔口。';
  choiceActionsEl.innerHTML = '';

  renderStats();
  saveGame();
  setApiStatus('unknown');
}

function pushHistory(role, content) {
  gameHistory.push({ role, content });
  gameHistory = gameHistory
    .filter(
      (item) =>
        item &&
        (item.role === 'user' || item.role === 'assistant') &&
        typeof item.content === 'string'
    )
    .slice(-8);

  saveGame();
}

function applyGameEffects(message) {
  if (message === '靜坐練功') {
    gameState.exp += 10;
    gameState.hp = Math.min(100, gameState.hp + 2);
    currentScene = 'camp';
  } else if (message === '四處遊歷') {
    gameState.exp += 6;
    gameState.money += 2;
    gameState.hp = Math.max(1, gameState.hp - 3);
    currentScene = 'village';
  } else if (message === '前往市集') {
    gameState.fame += 1;
    gameState.money = Math.max(0, gameState.money - 1);
    currentScene = 'market';
  } else if (message.startsWith('我選 A')) {
    if (currentScene === 'village') {
      gameState.exp += 4;
      gameState.fame += 1;
    } else if (currentScene === 'market') {
      gameState.exp += 5;
    } else {
      gameState.exp += 4;
    }
  } else if (message.startsWith('我選 B')) {
    if (currentScene === 'village') {
      gameState.money = Math.max(0, gameState.money - 10);
      gameState.exp += 3;
    } else if (currentScene === 'market') {
      gameState.money = Math.max(0, gameState.money - 2);
      gameState.hp = Math.min(100, gameState.hp + 8);
      gameState.exp += 2;
    } else {
      gameState.money = Math.max(0, gameState.money - 2);
      gameState.exp += 3;
    }
  } else if (message.startsWith('我選 C')) {
    if (currentScene === 'village') {
      currentScene = 'mountain';
      gameState.exp += 5;
      gameState.hp = Math.max(1, gameState.hp - 1);
    } else if (currentScene === 'market') {
      gameState.exp += 5;
    } else {
      gameState.exp += 5;
    }
  } else {
    gameState.exp += 2;
  }

  while (gameState.exp >= 100) {
    gameState.level += 1;
    gameState.exp -= 100;
    gameState.hp = Math.min(100, gameState.hp + 20);
    appendMessage('你氣息貫通，成功突破一重境界。');
  }

  renderStats();
  saveGame();
}

function parseChoices(reply) {
  const lines = reply
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const choices = [];

  for (const line of lines) {
    const match = line.match(/^([ABC])[\/、.．\s:：-]?\s*(.+)$/i);
    if (match) {
      choices.push({
        key: match[1].toUpperCase(),
        text: match[2].trim()
      });
    }
  }

  return choices.slice(-3);
}

function renderChoiceButtons(reply) {
  choiceActionsEl.innerHTML = '';

  const choices = parseChoices(reply);
  if (!choices.length) return;

  choices.forEach((choice) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = `${choice.key}：${choice.text}`;
    btn.addEventListener('click', () => {
      playButtonSound('choice');
      sendAction(`我選 ${choice.key}：${choice.text}`);
    });
    choiceActionsEl.appendChild(btn);
  });
}

function localStoryForAction(message) {
  if (message === '靜坐練功') {
    currentScene = 'camp';
    return `你在樹蔭下盤膝而坐，將心神沉入丹田，呼吸漸漸綿長。四周風聲漸止，只餘落葉輕掃衣角，內息如細流般沿經脈慢慢推進。

「氣息比先前穩了幾分，再沉住心神，或可窺見更深一層門徑。」

A/ 繼續運氣行周天，鞏固內力根基
B/ 起身演練拳腳，將內息化入招式
C/ 收功後打聽附近可有隱士高人`;
  }

  if (message === '四處遊歷') {
    currentScene = 'village';
    return `你沿山徑前行，行了半個時辰，前方忽現一座隱在山坳中的小村。村口古槐垂蔭，幾名村民正挑著木桶往井邊去，遠處炊煙裊裊，帶來淡淡米香。

「外鄉人，你腳程不慢，若想借宿，村東頭還有幾間空房。」

A/ 上前詢問村中是否有落腳處
B/ 取出十兩銀子，詢問是否能介紹本地的風土人情
C/ 轉身離去，繼續向山中深處探索`;
  }

  if (message === '前往市集') {
    currentScene = 'market';
    return `你踏入熱鬧市集，叫賣聲與討價還價聲此起彼落。布匹、藥材、刀石與乾糧攤位排成長列，不少江湖客混在人群之中，目光卻比貨品更鋒利。

「少俠，可要買點行走江湖的東西？再往前走，還有茶館消息最靈通。」

A/ 詢問附近是否有可練武的場所或師父
B/ 購買一些基本療傷藥材補充體力
C/ 四處觀察，看是否有可接取的任務或線索`;
  }

  if (message.startsWith('我選 A')) {
    if (currentScene === 'village') {
      return `你上前與老者拱手寒暄，對方見你言談有禮，神色便和緩下來。老者說村東有一間空屋可暫住一晚，只是夜裡偶有陌生人影在村外徘徊，叫你多加提防。

「若你不嫌簡陋，我可帶你去看看，但近來山外不太平，入夜最好別獨自行動。」

A/ 跟老者前往空屋安頓，順便套取更多消息
B/ 詢問那些陌生人影是否與江湖門派有關
C/ 婉拒借宿，趁天色未晚先往村外查探`;
    }

    if (currentScene === 'market') {
      return `你向老攤販打聽練武去處，對方壓低聲音，說城西舊武館雖已敗落，仍有位退隱老拳師偶爾現身指點後輩。茶館角落幾名佩刀漢子聽到這話，眼神也微微一動。

「若你真想學點真本事，黃昏前趕去，錯過了便未必再見得到他。」

A/ 立刻前往城西舊武館碰碰運氣
B/ 先去茶館打聽老拳師底細
C/ 留在市集觀察那幾名佩刀漢子的動靜`;
    }

    return `你依着心中判斷向前一步，局勢果然有了新變化。眼前的人與事都像被輕輕撥開一層霧，露出更深的線索。

「這一步走得不差，真正的門道，也許就藏在下一個轉角。」

A/ 乘勝追查線索
B/ 暫緩一步，先整備自身
C/ 換個方向，另尋旁證`;
  }

  if (message.startsWith('我選 B')) {
    if (currentScene === 'village') {
      return `你取出十兩銀子遞給老者，對方神色一變，連忙將你拉到一旁低聲說話。原來近月常有可疑人物夜訪山中破廟，村民皆不敢靠近，只聽說那裡偶有兵刃交擊之聲傳出。

「銀子我收下，但這消息只說一次；若真要去那破廟，最好在天黑前摸清路線。」

A/ 立即前往山中破廟探查
B/ 再追問那些人用的兵器與來歷
C/ 先回村中找個落腳處，準備夜探`;
    }

    if (currentScene === 'market') {
      return `你花了些銀兩買下療傷藥材與止血散，藥香辛烈，卻令人心安。攤販順手附送一小包乾糧，還提醒你近來城外路上不甚太平，獨行者最好早作準備。

「藥先備著總不會錯，真遇上事，手邊有東西比什麼都實在。」

A/ 先在市集休整片刻，再作打算
B/ 順勢向藥販打探附近傷者與鬥爭消息
C/ 帶齊東西後離開市集，往城外探索`;
    }

    return `你選擇先從旁細問，雖然花了點代價，卻也換來更紮實的情報。江湖路險，肯用心搜集消息的人，往往比只靠一腔熱血的人走得更遠。

「多聽一分，多活一日，這是老江湖最不肯明說的道理。」

A/ 追查剛得來的線索
B/ 再花些心思打點人情
C/ 收好消息，暫且離開`;
  }

  if (message.startsWith('我選 C')) {
    if (currentScene === 'village') {
      currentScene = 'mountain';
      return `你不願久留，轉身離開村口，沿著山道往更深處行去。山林漸密，鳥鳴聲反而稀疏下來，前方一條被荒草遮住的小徑若隱若現，盡頭似有殘破石階沒入霧氣之中。

「前面那路多年少人走，若真要去，可得把腳步放輕。」

A/ 沿石階而上，探查霧中建築
B/ 先在附近觀察腳印與痕跡
C/ 暫時退回村邊，待備妥再來`;
    }

    if (currentScene === 'market') {
      return `你收斂氣息，在市集人潮間慢慢遊走，暗中觀察往來人物。很快你便發現一名黑衣漢子多次出入茶館後巷，袖口還沾着新泥，像是剛從城外趕回來。

「那人腳步匆匆，像在避人耳目，跟不跟上去就看你膽色了。」

A/ 暗中尾隨黑衣漢子
B/ 先去茶館打聽他的來路
C/ 記下此人樣貌，暫不打草驚蛇`;
    }

    return `你決定不硬碰眼前局勢，而是換一條較穩妥的路走。江湖高手未必每步都搶先，但懂得何時抽身，往往才是真本事。

「退一步未必是怯，能看清局勢的人，才配談進退。」

A/ 換條路繼續追查
B/ 暫回原地整備
C/ 先觀望再作決定`;
  }

  return `夜色微沉，風從林間穿過，將遠處的犬吠聲一併送來。你站定片刻，重新整理思緒，知道下一步仍得由自己作主。

「江湖路遠，無論進退，都得自己拿主意。」

A/ 沿原定方向前進
B/ 先找人打探消息
C/ 暫且歇息，養足精神`;
}

async function sendAction(message) {
  if (meditateBtn.disabled || exploreBtn.disabled || marketBtn.disabled) {
    return;
  }

  setButtonsDisabled(true);
  setApiStatus('checking');

  try {
    appendMessage(`你選擇：${message}`);

    let reply = '';
    let useLocalFallback = false;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          state: gameState,
          history: gameHistory
        })
      });

      let data = {};
      try {
        data = await res.json();
      } catch (e) {
        data = {};
      }

      if (!res.ok) {
        useLocalFallback = true;

        if (res.status === 429) {
          setApiStatus('busy');
        } else {
          setApiStatus('offline');
        }
      } else {
        reply = data?.reply?.trim() || '';

        if (!reply) {
          useLocalFallback = true;
          setApiStatus('offline');
        } else {
          setApiStatus('online');
        }
      }
    } catch (err) {
      useLocalFallback = true;
      setApiStatus('offline');
    }

    if (useLocalFallback) {
      reply = `（本地劇情）\n${localStoryForAction(message)}`;
    }

    pushHistory('user', `玩家行動：${message}`);
    pushHistory('assistant', reply);

    await appendTypedMessage(`江湖回應：${reply}`, 12);

    applyGameEffects(message);
    renderChoiceButtons(reply);
  } catch (err) {
    console.error(err);
    setApiStatus('offline');

    const reply = `（本地劇情）\n${localStoryForAction(message)}`;
    pushHistory('user', `玩家行動：${message}`);
    pushHistory('assistant', reply);

    await appendTypedMessage(`江湖回應：${reply}`, 12);

    applyGameEffects(message);
    renderChoiceButtons(reply);
  } finally {
    setButtonsDisabled(false);
  }
}

meditateBtn.addEventListener('click', () => {
  playButtonSound('main');
  sendAction('靜坐練功');
});

exploreBtn.addEventListener('click', () => {
  playButtonSound('main');
  sendAction('四處遊歷');
});

marketBtn.addEventListener('click', () => {
  playButtonSound('main');
  sendAction('前往市集');
});

mapNodes.forEach((node) => {
  node.addEventListener('mouseenter', () => {
    const scene = node.dataset.scene;
    mapInfoTitleEl.textContent = SCENE_NAMES[scene] || '未知地點';
    mapInfoTextEl.textContent = SCENE_DESCRIPTIONS[scene] || '江湖廣闊，前路未明。';
  });

  node.addEventListener('mouseleave', () => {
    renderMap();
  });

  node.addEventListener('click', async () => {
    if (node.disabled) return;

    const scene = node.dataset.scene;
    playButtonSound('choice');

    currentScene = scene;
    renderStats();

    const textMap = {
      start: '你回到江湖路口，四方來路皆可通行。',
      camp: '你回到林間營地，耳邊只聞風聲與葉響。',
      village: '你走回山中小村，村人目光仍帶幾分戒備。',
      market: '你再度踏入熱鬧市集，叫賣聲又在耳邊響起。',
      mountain: '你沿山道深入，再次踏進雲霧籠罩的深山。'
    };

    appendMessage(`你查看地圖，動身前往：${SCENE_NAMES[scene]}`);
    await appendTypedMessage(`江湖回應：（地圖移動）\n${textMap[scene] || '你已換到另一處地點。'}`, 10);

    renderChoiceButtons('');
    saveGame();
  });
});

resetBtn.addEventListener('click', () => {
  playButtonSound('choice');
  const ok = confirm('確定要開新遊戲？目前進度會被清除。');
  if (ok) resetGame();
});

loadGame();
renderChoiceButtons(logEl.textContent);
renderMap();
setApiStatus('unknown');

if (!logEl.textContent.trim()) {
  logEl.textContent = '江湖風起，前路未明。你正站在命運的岔口。';
  saveGame();
}
