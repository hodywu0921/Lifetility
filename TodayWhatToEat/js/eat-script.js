/**
 * 1. 系統配置與常數管理
 */
const CONFIG = {
    GAS_URL: "https://script.google.com/macros/s/AKfycbyFnXnrq5HLea8OhJoaz-vQX4HgF4Da1BB69HeDN1kICJ2kFQSXLC71vOMsJuqURHb4wg/exec",
    ANIMATION_DURATION: 600,
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
        addFoodOverlay: 'add-food-overlay',
        loadingOverlay: 'loading-overlay'
    },
    CATEGORY_MAP: { "poor": "能吃啥", "rich": "想吃啥", "veg": "我就廢" },
    EMOJI_MAP: { "veg": "🛌", "rich": "💎", "poor": "💸" }
};

/**
 * 2. 全域狀態管理
 */
let state = {
    foodDatabase: [],
    currentMapUrl: "",
    currentAnswer: 0,
    tempCoords: { lat: null, lng: null }
};

/**
 * 3. 初始化入口
 */
window.onload = async () => {
    await API.fetchFoodFromGAS();
};

/**
 * 4. API 模組：處理與 Google Apps Script 的串接
 */
const API = {
    async fetchFoodFromGAS() {
        try {
            const response = await fetch(CONFIG.GAS_URL);
            const data = await response.json();
            state.foodDatabase = data;
            console.log(`GAS 美食庫同步成功！共有 ${state.foodDatabase.length} 筆`);
            UI.hideLoading();
        } catch (error) {
            console.error("載入失敗", error);
            const statusText = document.querySelector('#loading-overlay p');
            if (statusText) statusText.innerText = "連線不穩定，請重新整理頁面 😢";
        }
    },

    async postFood(formData) {
        const response = await fetch(CONFIG.GAS_URL, {
            method: "POST",
            body: JSON.stringify(formData)
        });
        return await response.json();
    }
};

/**
 * 5. Location 模組：處理地理位置計算與獲取
 */
const Location = {
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    },

    getUserLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) return reject(new Error('您的瀏覽器不支援定位功能'));
            
            const geoOptions = { 
                enableHighAccuracy: true, 
                timeout: 15000, maximumAge: 0 
            };
            
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    console.log(`定位成功，精度誤差：${pos.coords.accuracy} 公尺`);
                    resolve({ 
                        lat: pos.coords.latitude, 
                        lng: pos.coords.longitude 
                    });
                },
                (err) => {
                    let errorMsg = "定位失敗";
                    if (err.code === 1) errorMsg = "請開啟位置權限以獲取精確位置";
                    else if (err.code === 2) errorMsg = "無法獲取目前位置（請檢查 GPS 訊號）";
                    else if (err.code === 3) errorMsg = "定位逾時，請至收訊較佳處再試一次";
                    reject(new Error(errorMsg));
                },
                geoOptions
            );
        });
    }
};

/**
 * 6. UI 模組：處理所有視覺渲染與遮罩控制
 */
const UI = {
    hideLoading() {
        const overlay = document.getElementById(CONFIG.SELECTORS.loadingOverlay);
        if (overlay) {
            overlay.classList.add('fade-out');
            setTimeout(() => { overlay.style.display = 'none'; }, 500);
        }
    },

    triggerShakeAnimation(element) {
        if (!element) return;
        element.classList.remove('shake');
        void element.offsetWidth;
        element.classList.add('shake');
        setTimeout(() => element.classList.remove('shake'), CONFIG.ANIMATION_DURATION);
    },

    updateResultUI(res) {
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
                res.tag.split(' ').filter(t => t.trim() !== '').forEach(tagText => {
                    const span = document.createElement('span');
                    span.className = 'tag-sticker';
                    span.innerText = tagText;
                    tagContainer.appendChild(span);
                });
            } else { tagContainer.innerText = "暫無標記資訊"; }
        }

        if (res.emoji && document.getElementById(SELECTORS.resEmoji)) {
            document.getElementById(SELECTORS.resEmoji).innerText = res.emoji;
        }

        state.currentMapUrl = this.resolveMapUrl(res);
        document.getElementById(SELECTORS.overlay).style.display = 'flex';
    },

    resolveMapUrl(res) {
        let foundUrl = "";
        for (let key in res) {
            if (typeof res[key] === 'string' && res[key].startsWith('http')) {
                foundUrl = res[key];
                break;
            }
        }
        return foundUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(res.name)}`;
    }
};

/**
 * 7. Actions：核心業務邏輯
 */

async function drawFood(category) {
    const targetBox = event ? event.currentTarget : null;
    if (!state.foodDatabase || !state.foodDatabase.length) {
        console.warn("資料庫尚無資料，請稍候...");
        return;
    }

    let filteredFoods = [];
    UI.triggerShakeAnimation(targetBox);

    if (category === 'veg') {
        try {
            console.log("偵測到『我就廢』模式，正在嘗試獲取位置...");
            const userLoc = await Location.getUserLocation();
            console.log(`成功取得裝置位置！`);
            console.log(`緯度 (Lat): ${userLoc.lat}`);
            console.log(`經度 (Lng): ${userLoc.lng}`);

            filteredFoods = state.foodDatabase.filter(item => {
                const itemCat = String(item.category || item.Category || "").trim();
                if (itemCat === 'veg' && item.lat && item.lng) {
                    const dist = Location.calculateDistance(userLoc.lat, userLoc.lng, parseFloat(item.lat), parseFloat(item.lng));
                    return dist <= 2;
                }
                return false;
            });
            if (filteredFoods.length === 0) console.log("範圍內無符合美食，準備回退至我就廢全域池抽籤");
        } catch (error) { console.warn("定位獲取失敗:", error.message); }
    }

    if (filteredFoods.length === 0) {
        filteredFoods = state.foodDatabase.filter(item => String(item.category || item.Category || "").trim() === category);
    }

    if (filteredFoods.length === 0) return alert(`目前「${category}」清單裡還沒有美食喔！`);

    setTimeout(() => {
        const randomResult = filteredFoods[Math.floor(Math.random() * filteredFoods.length)];
        UI.updateResultUI(randomResult);
    }, CONFIG.ANIMATION_DURATION);
}

function openVerifyModal() {
    const num1 = Math.floor(Math.random() * 10) + 1, num2 = Math.floor(Math.random() * 10) + 1;
    const operators = ['+', '-', '×'], op = operators[Math.floor(Math.random() * 3)];
    state.currentAnswer = (op === '+') ? num1 + num2 : (op === '-') ? num1 - num2 : num1 * num2;
    document.getElementById(CONFIG.SELECTORS.captchaCode).innerText = `${num1} ${op} ${num2} = ?`;
    document.getElementById(CONFIG.SELECTORS.verifyInput).value = "";
    document.getElementById(CONFIG.SELECTORS.verifyOverlay).style.display = 'flex';
}

function checkVerify() {
    const userInput = parseInt(document.getElementById(CONFIG.SELECTORS.verifyInput).value);
    if (!isNaN(userInput) && userInput === state.currentAnswer) {
        closeVerifyModal();
        setTimeout(() => { document.getElementById(CONFIG.SELECTORS.addFoodOverlay).style.display = 'flex'; }, 300);
    } else {
        alert("答案錯誤，請重新計算！");
        openVerifyModal();
    }
}

async function submitFoodForm() {
    const name = document.getElementById('new-food-name').value.trim();
    const price = document.getElementById('new-food-price').value.trim();
    const category = document.getElementById('new-food-category').value;
    const address = document.getElementById('new-food-address').value.trim();
    const desc = document.getElementById('new-food-desc').value.trim();

    if (!name || !price || !category) return alert("請完整填寫：美食名稱、價格、以及推薦類型喔！");

    const btn = event.currentTarget;
    const originalText = btn.innerText;
    btn.innerText = "傳送中..."; 
    btn.disabled = true;

    const formData = {
        name, 
        emoji: CONFIG.EMOJI_MAP[category] || "🍴", 
        price, 
        desc,
        tag: "#網友推薦", 
        address, 
        map: "", 
        category,
        lat: state.tempCoords.lat || "", 
        lng: state.tempCoords.lng || ""
    };

    try {
        const result = await API.postFood(formData);
        if (result.result === "success") {
            alert(`感謝！「${name}」已成功加入美食庫！`);
            closeAddFoodModal(); 
            API.fetchFoodFromGAS();
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
 * 8. 事件監聽與基礎控制
 */

document.getElementById('quick-geo-btn').addEventListener('click', async () => {
    const btn = document.getElementById('quick-geo-btn');
    const statusContainer = document.getElementById('geo-status-container');
    try {
        btn.innerText = "⏳ 定位中...";
        const loc = await Location.getUserLocation();
        state.tempCoords = { lat: loc.lat, lng: loc.lng };
        btn.innerText = "📍 重新定位";
        statusContainer.style.display = "";
        console.log("已暫存座標:", state.tempCoords);
    } catch (error) {
        btn.innerText = "📍 自動定位";
        alert("定位失敗：" + error.message);
    }
});

document.getElementById('clear-geo').addEventListener('click', () => {
    state.tempCoords = { lat: null, lng: null };
    document.getElementById('geo-status-container').style.display = "none";
    document.getElementById('quick-geo-btn').innerText = "📍 自動定位";
});

function toggleDropdown() {
    document.getElementById('custom-select').classList.toggle('open');
    document.getElementById('select-options').classList.toggle('active');
}

function selectOption(value, emoji) {
    const label = CONFIG.CATEGORY_MAP[value] || value;
    document.getElementById('select-text').innerText = `${label} (${emoji})`;
    document.getElementById('new-food-category').value = value;
    toggleDropdown();
    document.getElementById('custom-select').style.borderColor = 'var(--primary)';
    setTimeout(() => { document.getElementById('custom-select').style.borderColor = 'var(--brown)'; }, 200);
}

window.addEventListener('click', (e) => {
    if (!document.getElementById('custom-select').contains(e.target)) {
        document.getElementById('custom-select').classList.remove('open');
        document.getElementById('select-options').classList.remove('active');
    }
});

function closeResult() { document.getElementById(CONFIG.SELECTORS.overlay).style.display = 'none'; }
function closeVerifyModal() { document.getElementById(CONFIG.SELECTORS.verifyOverlay).style.display = 'none'; }
function closeAddFoodModal() { 
    document.getElementById(CONFIG.SELECTORS.addFoodOverlay).style.display = 'none'; 
    document.getElementById('food-form').reset();
}
function openMap() { if (state.currentMapUrl) window.open(state.currentMapUrl, '_blank'); }
