export function loadDigioSDK() {
    return new Promise((resolve, reject) => {
      if (document.getElementById('digio-sdk')) return resolve();
  
      const script = document.createElement('script');
      script.src = 'https://app.digio.in/sdk/v11/digio.js';
      script.id = 'digio-sdk';
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }
  