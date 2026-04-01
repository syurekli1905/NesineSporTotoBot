// content.js - V15.1 Global Stable Version
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "ping") {
        sendResponse({ status: "alive" });
        return false;
    }

    // SCENE 1: Data Extraction (Scraping the Bulletin)
    if (request.action === "bulten_cek") {
        try {
            const matches = [];
            const rows = document.querySelectorAll('tbody.a4eea61782fc23a926ce tr');

            rows.forEach((row, i) => {
                const name = row.querySelector('td[data-test-id="name"]')?.innerText.trim().replace(/\n/g, " ");
                const p1 = row.querySelector('td[data-test-id="percentage1"]')?.innerText.replace('%', '') || "33";
                const pX = row.querySelector('td[data-test-id="percentage0"]')?.innerText.replace('%', '') || "33";
                const p2 = row.querySelector('td[data-test-id="percentage2"]')?.innerText.replace('%', '') || "34";

                if (name) matches.push({
                    id: i + 1, ad: name,
                    per: { 1: parseInt(p1), 0: parseInt(pX), 2: parseInt(p2) }
                });
            });

            // Scrape wallet balance using standard data-testid
            const balance = document.querySelector('[data-testid="header-bakiye"]')?.innerText || "0.00 units";
            sendResponse({ status: "ok", data: matches, bakiye: balance });
        } catch (err) {
            sendResponse({ status: "error", message: err.message });
        }
        return false;
    }

    // SCENE 2: Automation (Simulating Human Clicks)
    if (request.action === "oyna_batch") {
        sendResponse({ status: "processing" }); // Release message channel immediately

        // Clear existing selections by clicking the Cancel/Reset button
        document.querySelector('button[title="İptal"]')?.click();

        setTimeout(() => {
            request.data.forEach((column, colIdx) => {
                column.split('').forEach((prediction, rowIdx) => {
                    let tIdx = prediction === "1" ? 0 : (prediction === "X" || prediction === "0" ? 1 : 2);

                    // Coordinate-based selector: Unaffected by ID changes
                    const selector = `input[data-row="${rowIdx + 1}"][data-group="${colIdx}"][data-column="${tIdx}"]`;
                    document.querySelector(selector)?.click();
                });
            });

            setTimeout(() => {
                // Click the "Play Now" button
                const playBtn = document.querySelector('button[title="Hemen Oyna"]');
                if (playBtn) {
                    playBtn.click();

                    // Confirmation Loop: Look for "ONAYLA" or "CONFIRM" buttons
                    const checkConfirm = setInterval(() => {
                        const confirmBtn = Array.from(document.querySelectorAll('button')).find(b =>
                            b.innerText.includes("ONAYLA") ||
                            b.innerText.includes("CONFIRM") ||
                            b.id === 'mod-confirmation-ok'
                        );

                        if (confirmBtn) {
                            confirmBtn.click();
                            clearInterval(checkConfirm);
                            // Signal back to Dashboard that this batch is done
                            chrome.runtime.sendMessage({ action: "batch_tamamlandi" });
                        }
                    }, 500);
                }
            }, 500);
        }, 600);
        return false;
    }
});