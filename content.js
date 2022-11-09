const script = document.createElement('script');
script.src = chrome.runtime.getURL('script.js');
script.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(script);