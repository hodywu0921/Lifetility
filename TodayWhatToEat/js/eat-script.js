/**
 * 系統配置與常數管理
 */
const CONFIG = {
    GAS_URL: "https://script.google.com/macros/s/AKfycbyFnXnrq5HLea8OhJoaz-vQX4HgF4Da1BB69HeDN1kICJ2kFQSXLC71vOMsJuqURHb4wg/exec",
    ANIMATION_DURATION: 600, // 與 CSS shake 動畫時間一致
    SELECTORS: {
        overlay: 'result-overlay',
        resName: 'res-name',
        resPrice: 'res-price',
        resAddress: 'res-address',
        resDesc: 'res-desc',
        resTag: 'res-tag',
        resEmoji: 'res-emoji',
        verifyOverlay: 'verify-overlay',
        captchaCode: 'captcha-code',
        verifyInput: 'verify-input',
        addFoodOverlay: 'add-food-overlay'
    },
    ERROR_PLACEHOLDER: {
        name: "載入失敗",
        emoji: "⚠️",
        price: "0",
        desc: "請確認網路或 GAS 部署",
        tag: "ERROR"
    }
};

/**
 * 全域狀態管理
 */
let state = {
    foodDatabase: [],
    currentMapUrl: "",
    currentAnswer: 0
};

/**
 * 初始化：載入資料
 */
window.onload = async () => {
    await fetchFoodFromGAS();
};

/**
 * [GAS 串接部分] 保持原有的運行邏輯
 */
async function fetchFoodFromGAS() {
    try {
        const response = await fetch(CONFIG.GAS_URL);
        state.foodDatabase = await response.json();
        console.log(`GAS 美食庫同步成功！共有 ${state.foodDatabase.length} 筆`);
    } catch (error) {
        console.error("同步失敗：", error);
        state.foodDatabase = [CONFIG.ERROR_PLACEHOLDER];
    }
}

/**
 * 使用哈弗辛公式計算兩點間的直線距離 (單位: 公里)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 地球半徑 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
}

/**
 * 獲取使用者當前 GPS 位置
 */
async function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('您的瀏覽器不支援定位功能'));
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 5000 }
        );
    });
}

/**
 * 核心抽籤函式：整合類別篩選與地理位置判斷
 */
async function drawFood(category) {
    // 1. 【關鍵修正】在進入 async 邏輯前，先擷取 event 與 targetBox
    const targetBox = event ? event.currentTarget : null; 

    // 防呆檢查
    if (!state.foodDatabase || !state.foodDatabase.length) {
        console.warn("資料庫尚無資料，請稍候...");
        return;
    }

    let filteredFoods = [];
    const isLazyBox = (category === 'veg');

    // 2. 執行晃動動畫 (搬到最前面，讓使用者點擊後立刻有反應)
    if (targetBox && typeof triggerShakeAnimation === 'function') {
        triggerShakeAnimation(targetBox);
    }

    // 3. 距離過濾邏輯
    if (isLazyBox) {
        try {
            console.log("偵測到『我就廢』模式，正在嘗試獲取位置...");
            const userLoc = await getUserLocation(); 
            console.log(`成功取得裝置位置！`);
            console.log(`緯度 (Lat): ${userLoc.lat}`);
            console.log(`經度 (Lng): ${userLoc.lng}`);

            filteredFoods = state.foodDatabase.filter(item => {
                const itemCat = String(item.category || item.Category || "").trim();
                // 確保試算表對應欄位名稱正確 (lat, lng)
                if (itemCat === 'veg' && item.lat && item.lng) {
                    const dist = calculateDistance(
                        userLoc.lat, userLoc.lng, 
                        parseFloat(item.lat), parseFloat(item.lng)
                    );
                    return dist <= 2; 
                }
                return false;
            });

            if (filteredFoods.length === 0) {
                console.log("範圍內無符合美食，準備回退至全區 veg 抽籤");
            }
        } catch (error) {
            console.warn("定位獲取失敗:", error.message);
        }
    }

    // 4. 通用篩選邏輯
    if (filteredFoods.length === 0) {
        filteredFoods = state.foodDatabase.filter(item => {
            const itemCat = String(item.category || item.Category || "").trim();
            return itemCat === category;
        });
    }

    if (filteredFoods.length === 0) {
        alert(`目前「${category}」清單裡還沒有美食喔！`);
        return;
    }

    // 5. 執行抽籤延遲並顯示結果
    setTimeout(() => {
        const randomResult = filteredFoods[Math.floor(Math.random() * filteredFoods.length)];
        updateResultUI(randomResult);
    }, CONFIG.ANIMATION_DURATION || 500);
}

/**
 * [UI 輔助] 觸發箱子抖動動畫
 */
function triggerShakeAnimation(element) {
    if (!element) return;
    element.classList.remove('shake');
    void element.offsetWidth;
    element.classList.add('shake');
    
    setTimeout(() => element.classList.remove('shake'), CONFIG.ANIMATION_DURATION);
}

/**
 * [UI 輔助] 更新結果卡片畫面
 */
function updateResultUI(res) {
    const { SELECTORS } = CONFIG;
    
    document.getElementById(SELECTORS.resName).innerText = res.name;
    document.getElementById(SELECTORS.resPrice).innerText = `價格：${res.price}`;
    document.getElementById(SELECTORS.resDesc).innerText = res.desc || "暫無詳細描述";
    
    if (document.getElementById(SELECTORS.resAddress)) {
        document.getElementById(SELECTORS.resAddress).innerText = res.address ? `📍 ${res.address}` : "📍 暫無地址資訊";
    }

    const tagContainer = document.getElementById(SELECTORS.resTag);
    if (tagContainer) {
        tagContainer.innerHTML = '';
        
        if (res.tag) {
            // 依空格拆分並過濾空字串
            const tags = res.tag.split(' ').filter(t => t.trim() !== '');
            
            tags.forEach(tagText => {
                const span = document.createElement('span');
                span.className = 'tag-sticker'; // 對應 CSS 中的貼紙樣式
                span.innerText = tagText;
                tagContainer.appendChild(span);
            });
        } else {
            tagContainer.innerText = "暫無標記資訊";
        }
    }

    if (res.emoji && document.getElementById(SELECTORS.resEmoji)) {
        document.getElementById(SELECTORS.resEmoji).innerText = res.emoji;
    }

    state.currentMapUrl = resolveMapUrl(res);
    document.getElementById(SELECTORS.overlay).style.display = 'flex';
}

/**
 * [邏輯輔助] 解析地圖連結
 */
function resolveMapUrl(res) {
    let foundUrl = "";
    for (let key in res) {
        if (typeof res[key] === 'string' && res[key].startsWith('http')) {
            foundUrl = res[key];
            break;
        }
    }
    return foundUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(res.name)}`;
}

// ==========================================
// 新增美食與驗證邏輯
// ==========================================

/**
 * 開啟算術驗證彈窗
 */
function openVerifyModal() {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operators = ['+', '-', '×'];
    const op = operators[Math.floor(Math.random() * operators.length)];

    if (op === '+') state.currentAnswer = num1 + num2;
    else if (op === '-') state.currentAnswer = num1 - num2;
    else state.currentAnswer = num1 * num2;

    document.getElementById(CONFIG.SELECTORS.captchaCode).innerText = `${num1} ${op} ${num2} = ?`;
    document.getElementById(CONFIG.SELECTORS.verifyInput).value = "";
    document.getElementById(CONFIG.SELECTORS.verifyOverlay).style.display = 'flex';
}

/**
 * 檢查驗證碼，成功則關閉舊卡片，開啟表單卡片
 */
function checkVerify() {
    const userInput = parseInt(document.getElementById(CONFIG.SELECTORS.verifyInput).value);
    
    if (!isNaN(userInput) && userInput === state.currentAnswer) {
        // 1. 關閉驗證彈窗
        closeVerifyModal();
        
        // 2. 延遲開啟表單彈窗，讓視覺轉場更自然
        setTimeout(() => {
            document.getElementById(CONFIG.SELECTORS.addFoodOverlay).style.display = 'flex';
        }, 300);
    } else {
        alert("答案錯誤，請重新計算！");
        openVerifyModal();
    }
}

/**
 * 關閉表單彈窗並重設表單
 */
function closeAddFoodModal() {
    document.getElementById(CONFIG.SELECTORS.addFoodOverlay).style.display = 'none';
    document.getElementById('food-form').reset();
}

/**
 * 處理美食表單送出並寫入 Google Sheets
 */
async function submitFoodForm() {
    const name = document.getElementById('new-food-name').value.trim();
    const price = document.getElementById('new-food-price').value.trim();
    const category = document.getElementById('new-food-category').value;
    const address = document.getElementById('new-food-address').value.trim();
    const desc = document.getElementById('new-food-desc').value.trim();

    // 建立推薦類型與 Emoji 的對照表
    const emojiMap = {
        "veg": "🛌",
        "rich": "💎",
        "poor": "💸"
    };

    // 根據選擇的類型取得對應的 emoji，若無匹配則給預設值
    const selectedEmoji = emojiMap[category] || "🍴";


    // 1. 必填欄位檢查
    if (!name || !price || !category) {
        alert("請完整填寫：美食名稱、價格、以及推薦類型喔！");
        return;
    }

    // 2. 顯示讀取狀態 (選配)
    const btn = event.currentTarget;
    const originalText = btn.innerText;
    btn.innerText = "傳送中...";
    btn.disabled = true;

    // 3. 封裝資料
    const formData = {
        name: name,
        emoji: selectedEmoji,
        price: price,
        desc: desc,
        tag: "#網友推薦",
        address: address,
        map: "",
        category: category
    };

    try {
        const GAS_DEPLOY_URL = CONFIG.GAS_URL;

        const response = await fetch(GAS_DEPLOY_URL, {
            method: "POST",
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.result === "success") {
            alert(`感謝！「${name}」已成功加入美食庫！`);
            closeAddFoodModal();
            fetchFoodFromGAS();
        } else {
            throw new Error(result.message);
        }

    } catch (error) {
        console.error("提交失敗:", error);
        alert("提交時發生錯誤，請稍後再試。");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

/**
 * 切換下拉選單顯示/隱藏
 */
function toggleDropdown() {
    const select = document.getElementById('custom-select');
    const options = document.getElementById('select-options');
    select.classList.toggle('open');
    options.classList.toggle('active');
}

/**
 * 選擇選項邏輯
 */
function selectOption(value, emoji) {

    // 建立一個轉換表，將英文代碼轉回中文顯示標籤
    const labelMap = {
        "poor": "能吃啥",
        "rich": "想吃啥",
        "veg": "我就廢"
    };

    // 1. 更新顯示文字：從 labelMap 取得中文名稱，不要直接顯示 value (英文)
    const chineseLabel = labelMap[value] || value;

    // 2. 更新顯示文字
    document.getElementById('select-text').innerText = `${chineseLabel} (${emoji})`;
    
    // 3. 更新隱藏的 input 數值供提交使用
    document.getElementById('new-food-category').value = value;
    
    // 4. 關閉選單
    toggleDropdown();
    
    // 5. 視覺回饋：稍微閃爍一下
    document.getElementById('custom-select').style.borderColor = 'var(--primary)';
    setTimeout(() => {
        document.getElementById('custom-select').style.borderColor = 'var(--brown)';
    }, 200);
}

/**
 * 點擊頁面其他地方時收起選單
 */
window.addEventListener('click', function(e) {
    const select = document.getElementById('custom-select');
    if (!select.contains(e.target)) {
        select.classList.remove('open');
        document.getElementById('select-options').classList.remove('active');
    }
});

/**
 * 基礎視窗控制
 */
function closeResult() {
    document.getElementById(CONFIG.SELECTORS.overlay).style.display = 'none';
}

function closeVerifyModal() {
    document.getElementById(CONFIG.SELECTORS.verifyOverlay).style.display = 'none';
}

function openMap() {
    if (state.currentMapUrl) window.open(state.currentMapUrl, '_blank');
}


