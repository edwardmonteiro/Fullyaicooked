(() => {
  'use strict';
  const config = window.ARCADE_ADS;
  if (!config?.enabled || /FullyAICooked\/1/.test(navigator.userAgent)) return;
  let requested = false;
  function requestBanner() {
    if (requested) return;
    requested = true;
    const script = document.createElement('script'); script.async = true; script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(config.publisherId)}`;
    const slot = document.createElement('ins'); slot.className = 'adsbygoogle'; slot.style.display = 'block'; slot.dataset.adClient = config.publisherId; slot.dataset.adSlot = config.bannerSlot; slot.dataset.adFormat = 'horizontal'; slot.dataset.fullWidthResponsive = 'true';
    document.getElementById('ad-content').append(slot); document.getElementById('web-ad').hidden = false;
    script.onload = () => { (window.adsbygoogle = window.adsbygoogle || []).push({}); };
    script.onerror = () => { document.getElementById('web-ad').hidden = true; };
    document.head.append(script);
  }
  // Publisher must configure a Google-certified TCF CMP. No CMP means no ad request.
  function consentReady() {
    if (typeof window.__tcfapi !== 'function') return;
    window.__tcfapi('addEventListener', 2, (tc, success) => {
      if (!success || !['tcloaded', 'useractioncomplete'].includes(tc.eventStatus)) return;
      window.setAdPrivacyAvailable?.(true);
      const allowed = tc.gdprApplies === false || (tc.purpose?.consents?.[1] && tc.vendor?.consents?.[755]);
      if (allowed) requestBanner();
      else if (requested) { document.getElementById('ad-content').replaceChildren(); document.getElementById('web-ad').hidden = true; }
    });
  }
  window.CookedAds = { privacy: () => { if (window.googlefc?.showRevocationMessage) window.googlefc.showRevocationMessage(); } };
  window.googlefc = window.googlefc || {}; window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
  window.googlefc.callbackQueue.push({ CONSENT_DATA_READY: consentReady });
  const cmp = document.createElement('script'); cmp.async = true; cmp.src = `https://fundingchoicesmessages.google.com/i/${config.publisherId}?ers=1`; cmp.onload = consentReady; document.head.append(cmp);
})();
