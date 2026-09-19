# Activate advertising

The delivered preview does not earn money. Android uses Google's official test ad IDs. Website ads are disabled. Advertising revenue begins only after the publisher's accounts, app/site reviews, real ad units, and live distribution are ready. Revenue is not guaranteed.

## Android: AdMob

1. Create or use your own AdMob account. Register `com.fullyaicooked.arcade` as an Android app.
2. Create an adaptive banner and an interstitial ad unit. Configure Privacy & messaging consent forms for the markets you serve.
3. Put your AdMob application ID, banner ID, and interstitial ID into the Android section of `monetization.json`. Set `mode` to `live`. These IDs are public configuration, not secret API keys. Never put an account password or API secret there.
4. Replace the preview privacy wording with the accurate live data-use disclosures and operator contact details. Update the app's Play Console Data safety form based on the SDKs actually included.
5. Build a release APK/AAB and sign it with your own retained release key. Enable Play App Signing for store distribution. Keep signing passwords in CI secrets or local environment variables, never Git.
6. Configure the app's public developer website and publish the generated `app-ads.txt` on its root. Complete AdMob app verification, readiness, and applicable store requirements.
7. Verify consent and ad dismissal behavior on a physical Android device, including offline and background/resume. Use test devices while validating live configuration.

The included APK uses package `com.fullyaicooked.arcade.preview` and a development certificate. It is suitable for installation and testing, not a store-ready signed release. Debug and production apps are intentionally separate.

The app uses native AdMob views, not AdSense inside a WebView. UMP gates live ad requests. Privacy options remain available when UMP requires them. Banner ads appear in the catalog; interstitials are capped and considered only after game sessions. No ad is required to unlock a game.

## Website: AdSense

1. Register the public site/domain in your AdSense account and obtain approval.
2. Create a horizontal responsive display-ad unit and a Google-certified consent message using Google's Privacy & messaging product.
3. Set `web.publisherId` (`ca-pub-...`) and `web.bannerSlot` in `monetization.json`. After configuring and verifying the CMP, set `certifiedCmpConfigured` and `enabled` to `true`.
4. Rebuild and publish. The build creates the appropriate `ads.txt` from the publisher ID.
5. Validate consent region behavior and ad placement before promoting the site. The implementation waits for the CMP's TCF callback; without a supported CMP signal it does not request ads.

One catalog banner is implemented. No ad overlays, fake reward ads, click incentives, or artificial traffic are included. The website does not serve ads in the native app. Future games aimed at children need an appropriate separate audience and advertising review.

## Official references

- [Google Mobile Ads Android setup](https://developers.google.com/admob/android/quick-start)
- [Google UMP consent implementation](https://developers.google.com/admob/android/privacy)
- [AdMob test ads](https://developers.google.com/admob/android/test-ads)
- [AdMob interstitial placement](https://developers.google.com/admob/android/interstitial)
- [Android signing](https://developer.android.com/studio/publish/app-signing)
- [Google publisher policies](https://support.google.com/publisherpolicies/answer/10502938)

This repository includes the software integration. Account approval, audience declarations, tax/payment setup, and production signing remain publisher-owned steps.
