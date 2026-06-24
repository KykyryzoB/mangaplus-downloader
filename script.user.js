// ==UserScript==
// @name         MangaPlus Sorted Stream Downloader (PNG)
// @namespace    http://tampermonkey.net
// @version      6.0
// @description  Easy mangaPlus downloader
// @author       AI Assistant
// @match        *://*.shueisha.co.jp/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const downloadedUrls = new Set();
    let isDownloading = false;

    // Create control panel in the corner of the screen
    const panel = document.createElement('div');
    panel.style = 'position:fixed; top:20px; right:20px; z-index:999999; background:#111; padding:15px; border-radius:8px; box-shadow:0 4px 20px rgba(0,0,0,0.8); font-family:sans-serif; color:#fff; width:220px; text-align:center; border: 1px solid #333;';

    const status = document.createElement('div');
    status.innerText = '🔴 Download Mode Off';
    status.style = 'margin-bottom:12px; font-size:13px; font-weight:bold; color:#ff4d4d;';
    panel.appendChild(status);

    const btn = document.createElement('button');
    btn.innerText = 'Enable Auto-Scan';
    btn.style = 'width:100%; padding:10px; background:#007bff; color:#fff; border:none; border-radius:4px; cursor:pointer; font-weight:bold;';
    panel.appendChild(btn);

    document.body.appendChild(panel);

    function captureAndDownloadSorted() {
        if (!isDownloading) return;

        // Find all potential page elements
        const rawElements = Array.from(document.querySelectorAll('canvas, img'));

        // Filter: keep only large elements and collect their Y positions
        const validPages = rawElements
            .filter(el => el.offsetWidth >= 300)
            .map(el => {
                const rect = el.getBoundingClientRect();
                // Physical Y coordinate on page = current window position + scroll
                const absoluteY = rect.top + window.scrollY;
                return { element: el, y: absoluteY, src: el.src || '' };
            });

        // Sort all found elements strictly by height from top to bottom
        validPages.sort((a, b) => a.y - b.y);

        // Iterate through sorted list and download what hasn't been downloaded yet
        validPages.forEach((page, index) => {
            const pageNum = index + 1; // Page sequence number based on its height

            // Unique identifier for duplicate checking
            const uniqueId = page.src || `canvas_${Math.round(page.y)}`;

            if (!downloadedUrls.has(uniqueId)) {
                let dataUrl = null;
                const el = page.element;

                if (el.tagName.toLowerCase() === 'canvas') {
                    // Convert canvas to pure PNG
                    dataUrl = el.toDataURL('image/png');
                } else if (el.tagName.toLowerCase() === 'img' && page.src) {
                    // Redraw image onto a canvas and save as PNG
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = el.naturalWidth || el.offsetWidth;
                    tempCanvas.height = el.naturalHeight || el.offsetHeight;
                    const ctx = tempCanvas.getContext('2d');
                    ctx.drawImage(el, 0, 0);
                    dataUrl = tempCanvas.toDataURL('image/png');
                }

                if (dataUrl) {
                    downloadedUrls.add(uniqueId);

                    // Download file with proper sequence number and .png extension
                    const a = document.createElement('a');
                    a.href = dataUrl;
                    const formattedNum = String(pageNum).padStart(3, '0');
                    a.download = `manga_page_${formattedNum}.png`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();

                    status.innerText = `⏳ Pages downloaded: ${downloadedUrls.size}`;
                }
            }
        });
    }

    // Mode toggler
    btn.addEventListener('click', () => {
        isDownloading = !isDownloading;
        if (isDownloading) {
            btn.innerText = '⏸ Pause';
            btn.style.background = '#dc3545';
            status.innerText = '🟢 Scanning Active...';
            status.style.color = '#28a745';
            window.mpInterval = setInterval(captureAndDownloadSorted, 500);
        } else {
            btn.innerText = 'Enable Auto-Scan';
            btn.style.background = '#007bff';
            status.innerText = '🔴 Download Mode Off';
            status.style.color = '#ff4d4d';
            clearInterval(window.mpInterval);
        }
    });
})();
