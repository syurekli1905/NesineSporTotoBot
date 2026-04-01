document.getElementById('open').addEventListener('click', () => {
    chrome.tabs.create({ url: 'dashboard.html' });
});