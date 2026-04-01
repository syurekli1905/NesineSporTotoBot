// dashboard.js - V15.2 Karargah Yerel Motoru
let currentPool = [];
let currentIndex = 0;
let isRunning = false;
let bulten = [];
let userSelections = {};

document.addEventListener('DOMContentLoaded', () => {
    loadArchive();
    chrome.storage.local.get(['activePool', 'activeIdx'], (data) => {
        if (data.activePool && data.activeIdx < data.activePool.length) {
            currentPool = data.activePool;
            currentIndex = data.activeIdx;
            document.getElementById('progress').innerText = `${currentIndex} / ${currentPool.length}`;
            writeLog(`📡 Yarım kalan operasyon bulundu: ${currentIndex}/${currentPool.length}. Devam etmek için SİSTEMİ ATEŞLE butonuna basın.`, true);
        }
    });

    document.getElementById('btnSync')?.addEventListener('click', fetchData);
    document.getElementById('btnStart')?.addEventListener('click', startDeployment);
    document.getElementById('btnStop')?.addEventListener('click', stopDeployment);
    document.getElementById('btnReset')?.addEventListener('click', resetHQ);
    document.getElementById('btnSave')?.addEventListener('click', saveStrategy);
    document.getElementById('btnCalc')?.addEventListener('click', calculateMatrix);
    document.getElementById('btnClearLog')?.addEventListener('click', () => { document.getElementById('logBox').innerHTML = "> Loglar temizlendi."; });
    document.getElementById('systemMode')?.addEventListener('change', runAnalysis);
    document.getElementById('savedStrats')?.addEventListener('change', loadStrategy);
    document.getElementById('btnExport')?.addEventListener('click', exportToClipboard);

    document.getElementById('macBody').addEventListener('click', (e) => {
        if (isRunning) return;
        if (e.target.classList.contains('btn-ch')) toggleChoice(e.target.dataset.id, e.target.dataset.val);
    });
});

function setControlState(active) {
    const ids = ['btnSync', 'btnReset', 'btnSave', 'btnCalc', 'systemMode', 'savedStrats'];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = !active; });
    document.querySelectorAll('.btn-ch').forEach(btn => btn.style.pointerEvents = active ? 'auto' : 'none');
}

function runAnalysis() {
    let fullComb = 1;
    let realisticProb15 = 1.0;
    let anyEmpty = false;

    for (let i = 1; i <= 15; i++) {
        let choices = userSelections[i] || [];
        if (choices.length === 0) { anyEmpty = true; continue; }
        fullComb *= choices.length;
        const match = bulten.find(m => m.id == i);
        if (match) {
            let probSum = 0;
            choices.forEach(c => probSum += (match.per[c === 'X' ? 0 : c] / 100));
            realisticProb15 *= probSum;
        }
    }

    const mode = document.getElementById('systemMode').value;
    const unitPrice = 10;
    let reduction = (mode === "14G") ? 0.334 : 1.0;

    const filteredCols = anyEmpty ? 0 : Math.ceil(fullComb * reduction);
    const fullCost = fullComb * unitPrice;
    const reducedCost = filteredCols * unitPrice;

    document.getElementById('fullCost').innerText = fullCost.toLocaleString() + " TL";
    document.getElementById('reducedCost').innerText = reducedCost.toLocaleString() + " TL";
    document.getElementById('totalSaving').innerText = (fullCost - reducedCost).toLocaleString() + " TL";

    if (!anyEmpty) {
        document.getElementById('p15').innerText = `%${(realisticProb15 * reduction * 100).toFixed(6)}`;
        document.getElementById('p14').innerText = `%${(realisticProb15 * reduction * 100 * 4.2).toFixed(4)}`;
        document.getElementById('p13').innerText = `%${(realisticProb15 * reduction * 100 * 22).toFixed(3)}`;
        document.getElementById('p12').innerText = `%${(realisticProb15 * reduction * 100 * 85).toFixed(2)}`;
    }
}

function calculateMatrix() {
    runAnalysis();
    const countText = document.getElementById('reducedCost').innerText.replace(/[^0-9]/g, '');
    const count = Math.ceil(parseInt(countText) / 10);

    if (count === 0) return alert("Önce maç seçimi yapmalısınız!");

    currentIndex = 0;
    currentPool = [];
    const preview = document.getElementById('previewList');
    if (preview) preview.innerHTML = "🧪 Matris hesaplanıyor, lütfen bekleyin...";

    let htmlContent = "";
    for (let i = 0; i < count; i++) {
        let col = "";
        for (let m = 1; m <= 15; m++) {
            let choices = userSelections[m];
            col += choices[Math.floor(Math.random() * choices.length)];
        }
        currentPool.push(col);
        if (i < 2000) htmlContent += `<div style="border-bottom: 1px solid #222; padding: 2px 0;">KUPON #${i + 1}: ${col}</div>`;
    }

    if (preview) {
        preview.innerHTML = htmlContent;
        if (count > 2000) preview.innerHTML += `<div style="padding:10px; color:var(--yellow); text-align:center;">... Toplam ${count} kolon üretildi. İlk 2000 tanesi listelendi.</div>`;
    }

    document.getElementById('progress').innerText = `0 / ${currentPool.length}`;
    writeLog(`✅ Matris Kilitlendi: ${currentPool.length} kolon oluşturuldu.`);
    chrome.storage.local.set({ activePool: currentPool, activeIdx: 0 });
}

function exportToClipboard() {
    if (currentPool.length === 0) return alert("Dışarı aktarılacak kolon bulunamadı!");
    navigator.clipboard.writeText(currentPool.join('\n')).then(() => {
        alert(`${currentPool.length} adet kolon başarıyla kopyalandı.`);
        writeLog("📋 Tüm kolonlar panoya kopyalandı.", true);
    });
}

function startDeployment() {
    if (currentPool.length === 0) return alert("Önce formülleri hesaplamalı ve kilitlemelisiniz!");
    isRunning = true;
    setControlState(false);
    document.getElementById('btnStart').style.display = "none";
    document.getElementById('btnStop').style.display = "block";
    writeLog("🚀 Operasyon başlatıldı. Sistem kilidi aktif.");
    deployBatch();
}

function deployBatch() {
    if (!isRunning || currentIndex >= currentPool.length) { if (currentIndex >= currentPool.length) stopDeployment(); return; }
    const batch = currentPool.slice(currentIndex, currentIndex + 4);
    chrome.tabs.query({ url: "*://*.nesine.com/sportoto*" }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "oyna_batch", data: batch });
            currentIndex += batch.length;
            chrome.storage.local.set({ activeIdx: currentIndex });
            document.getElementById('progress').innerText = `${currentIndex} / ${currentPool.length}`;
        }
    });
}

function stopDeployment() {
    isRunning = false;
    setControlState(true);
    document.getElementById('btnStart').style.display = "block";
    document.getElementById('btnStop').style.display = "none";
    writeLog("🛑 Operasyon durduruldu.");
}

function saveStrategy() {
    const name = document.getElementById('stratName').value;
    if (!name) return alert("Lütfen strateji için bir isim girin!");
    chrome.storage.local.get(['archive'], (data) => {
        let arc = data.archive || {};
        arc[name] = JSON.parse(JSON.stringify(userSelections));
        chrome.storage.local.set({ archive: arc }, () => { writeLog(`💾 "${name}" stratejisi arşive kaydedildi.`); loadArchive(); });
    });
}

function loadArchive() {
    chrome.storage.local.get(['archive'], (data) => {
        const select = document.getElementById('savedStrats');
        select.innerHTML = '<option value="">-- Kayıtlı Stratejiler --</option>';
        if (data.archive) Object.keys(data.archive).forEach(n => select.innerHTML += `<option value="${n}">${n}</option>`);
    });
}

function loadStrategy(e) {
    const name = e.target.value;
    if (!name) return;
    chrome.storage.local.get(['archive'], (data) => {
        userSelections = JSON.parse(JSON.stringify(data.archive[name]));
        renderBulletin();
        writeLog(`📂 "${name}" stratejisi yüklendi.`);
    });
}

function fetchData() {
    chrome.tabs.query({ url: "*://*.nesine.com/sportoto*" }, (tabs) => {
        if (!tabs[0]) return writeLog("❌ Nesine sekmesi bulunamadı!", true);
        chrome.tabs.sendMessage(tabs[0].id, { action: "bulten_cek" }, (res) => {
            if (res && res.status === "ok") {
                bulten = res.data;
                document.getElementById('bakiyeVal').innerText = `Cüzdan Bakiyesi: ${res.bakiye}`;
                renderBulletin();
                writeLog("🔄 Bülten ve yüzdelikler güncellendi.");
            }
        });
    });
}

function renderBulletin() {
    const body = document.getElementById('macBody');
    body.innerHTML = bulten.map(m => {
        if (!userSelections[m.id]) userSelections[m.id] = [];
        const s = userSelections[m.id];
        return `
        <div class="mac-row">
            <span class="mac-name"><b>${m.id}.</b> ${m.ad} <span class="per-info">1:%${m.per[1]} X:%${m.per[0]} 2:%${m.per[2]}</span></span>
            <div class="choice-btns">
                <button class="btn-ch ${s.includes('1') ? 'active' : ''}" data-id="${m.id}" data-val="1">1</button>
                <button class="btn-ch ${s.includes('X') ? 'active' : ''}" data-id="${m.id}" data-val="X">X</button>
                <button class="btn-ch ${s.includes('2') ? 'active' : ''}" data-id="${m.id}" data-val="2">2</button>
            </div>
        </div>`;
    }).join('');
    runAnalysis();
}

function toggleChoice(id, choice) {
    if (!userSelections[id]) userSelections[id] = [];
    const idx = userSelections[id].indexOf(choice);
    if (idx > -1) userSelections[id].splice(idx, 1); else userSelections[id].push(choice);
    renderBulletin();
}

function resetHQ() { if (isRunning) return; userSelections = {}; currentPool = []; currentIndex = 0; document.getElementById('progress').innerText = "0 / 0"; renderBulletin(); writeLog("🗑️ Tüm seçimler sıfırlandı."); }
function writeLog(msg, isWarn = false) { const box = document.getElementById('logBox'); box.innerHTML += `<br><span style="color:${isWarn ? 'var(--yellow)' : '#0f0'}">> ${msg}</span>`; box.scrollTop = box.scrollHeight; }

chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "batch_tamamlandi" && isRunning) {
        writeLog(`✅ Paket #${currentIndex} onaylandı.`);
        setTimeout(deployBatch, 3500);
    }
});