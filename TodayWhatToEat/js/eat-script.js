// const foodDatabase = [
//     { name: "中山區日式拉麵", emoji: "🍜", price: "NT$ 230 - 350", desc: "台北人的拉麵戰場，每一口都是對湯頭的執著。", tag: "#紅線美食" },
//     { name: "萬華龍山寺滷肉飯", emoji: "🍚", price: "NT$ 40 - 100", desc: "老台北的早午餐，鹹甜適中的膠質與米香。", tag: "#萬華老味" },
//     { name: "信義區精品外帶咖啡", emoji: "☕", price: "NT$ 120 - 180", desc: "在都市叢林中找一點儀式感，適合配個肉桂捲。", tag: "#時尚下午茶" },
//     { name: "公館黑糖珍珠鮮奶", emoji: "🧋", price: "NT$ 50 - 75", desc: "濃郁黑糖與Q彈珍珠，是台北學子的集體回憶。", tag: "#學生最愛" },
//     { name: "寧夏夜市蚵仔煎", emoji: "🍳", price: "NT$ 70 - 120", desc: "鑊氣十足，記得多加一點甜辣醬才是正宗吃法。", tag: "#深夜食堂" },
//     { name: "士林大香腸", emoji: "🌭", price: "NT$ 60 - 100", desc: "豪邁的尺寸與蒜頭，才是台北生活的氣魄。", tag: "#夜市巡禮" },
//     { name: "東區網美早午餐", emoji: "🥑", price: "NT$ 350 - 500", desc: "雖然有點貴，但拍照好看、心情也會變好。", tag: "#忠孝敦化" }
// ];

// let selectedFood = "";



let foodDatabase = [];
const gasUrl = "https://script.google.com/macros/s/AKfycbyFnXnrq5HLea8OhJoaz-vQX4HgF4Da1BB69HeDN1kICJ2kFQSXLC71vOMsJuqURHb4wg/exec";

window.onload = async () => {
    await fetchFoodFromGAS();
};

async function fetchFoodFromGAS() {
    try {
        const response = await fetch(gasUrl);
        // GAS 會回傳 JSON
        foodDatabase = await response.json(); 
        console.log("GAS 美食庫同步成功！共有 " + foodDatabase.length + " 筆");
    } catch (error) {
        console.error("同步失敗：", error);
        foodDatabase = [{ name: "載入失敗", emoji: "⚠️", price: "0", desc: "請確認網路或 GAS 部署", tag: "ERROR" }];
    }
}

let currentMapUrl = ""; //地圖連結

async function drawFood(category) {
    if (foodDatabase.length === 0) return;

    // 1. 篩選資料
    const filteredFoods = foodDatabase.filter(item => {
        // 確保比對時去掉空白，增加容錯率
        const itemCat = String(item.category || item.Category || "").trim();
        return itemCat === category;
    });

    if (filteredFoods.length === 0) {
        alert(`目前「${category}」清單裡還沒有美食喔！請檢查 Google Sheet 欄位。`);
        return;
    }

    // 2. 核心修正：觸發 Shake 動畫
    // 使用 event.currentTarget 抓取目前點擊的那個箱子
    const targetBox = event.currentTarget;
    
    // 先移除 shake 類別 (預防萬一)
    targetBox.classList.remove('shake');
    
    // 強制瀏覽器重繪 (Reflow)，這是讓動畫重啟的關鍵
    void targetBox.offsetWidth; 
    
    // 重新加入 shake 類別
    targetBox.classList.add('shake');

    // 3. 抽籤邏輯
    setTimeout(() => {
        // 動畫結束後移除，方便下次點擊
        targetBox.classList.remove('shake');
        
        const res = filteredFoods[Math.floor(Math.random() * filteredFoods.length)];
        
        // 更新 UI (保持你之前的邏輯)
        document.getElementById('res-name').innerText = res.name;
        document.getElementById('res-price').innerText = `預估價格：${res.price}`;
        document.getElementById('res-desc').innerText = res.desc;
        
        // 設定地圖 (自動備案)
        let foundUrl = "";
        for (let key in res) {
            if (String(res[key]).startsWith('http')) { foundUrl = res[key]; break; }
        }
        currentMapUrl = foundUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(res.name)}`;

        document.getElementById('result-overlay').style.display = 'flex';
    }, 600); // 這裡的時間要跟 CSS 動畫時間差不多
}


function closeResult() {
    document.getElementById('result-overlay').style.display = 'none';
}

function openMap() {
    if (currentMapUrl) {
        window.open(currentMapUrl, '_blank');
    }
}

// function openMap() {
//     window.open(`https://www.google.com/maps/search/台北+${encodeURIComponent(selectedFood)}`, '_blank');
// }