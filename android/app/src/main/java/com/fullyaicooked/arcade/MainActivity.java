package com.fullyaicooked.arcade;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.Toast;
import androidx.webkit.WebViewAssetLoader;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.RequestConfiguration;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final String HOME = ORIGIN + "/assets/site/index.html";
    private WebView web;
    private LinearLayout root;
    private FrameLayout bannerContainer;
    private AdView banner;
    private InterstitialAd interstitial;
    private ConsentInformation consent;
    private boolean adsInitialized, playing, adShowing, hasChildContent;
    private long gameStarted, lastAd = 0, sessionStarted;
    private int completedRounds;
    private View fullScreenView;
    private WebChromeClient.CustomViewCallback fullScreenCallback;
    private String activeGame = "";

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        sessionStarted = SystemClock.elapsedRealtime();
        root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL); root.setBackgroundColor(Color.rgb(16,17,19));
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets safe = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                v.setPadding(safe.left, safe.top, safe.right, safe.bottom);
            } else { v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom()); }
            return insets;
        });
        web = new WebView(this); web.setBackgroundColor(Color.rgb(16,17,19));
        root.addView(web, new LinearLayout.LayoutParams(-1,0,1));
        bannerContainer = new FrameLayout(this); bannerContainer.setVisibility(View.GONE); root.addView(bannerContainer,new LinearLayout.LayoutParams(-1,-2));
        setContentView(root);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true); settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false); settings.setAllowContentAccess(false); settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false); settings.setSupportMultipleWindows(false);
        settings.setUserAgentString(settings.getUserAgentString()+" FullyAICooked/1");
        WebViewAssetLoader loader = new WebViewAssetLoader.Builder().addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri url=request.getUrl();
                if ("appassets.androidplatform.net".equals(url.getHost())) {
                    WebResourceResponse local=loader.shouldInterceptRequest(url);
                    if(local!=null)return local;
                    return new WebResourceResponse("text/plain","UTF-8",404,"Not found",java.util.Collections.emptyMap(),new ByteArrayInputStream("Not found".getBytes(StandardCharsets.UTF_8)));
                }
                return super.shouldInterceptRequest(view,request);
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request) {
                Uri url=request.getUrl();
                if("arcade".equals(url.getScheme())) { if(request.isForMainFrame()) handleEvent(url); return true; }
                if("https".equals(url.getScheme()) && "appassets.androidplatform.net".equals(url.getHost())) return false;
                if(request.isForMainFrame() && ("https".equals(url.getScheme()) || "http".equals(url.getScheme()))) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW,url)); } catch(Exception ignored) { Toast.makeText(MainActivity.this,"No browser is available.",Toast.LENGTH_SHORT).show(); }
                }
                return true;
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view,String address) {
                Uri url=Uri.parse(address);
                if("arcade".equals(url.getScheme())){handleEvent(url);return true;}
                if("https".equals(url.getScheme())&&"appassets.androidplatform.net".equals(url.getHost()))return false;
                if("http".equals(url.getScheme())||"https".equals(url.getScheme()))try{startActivity(new Intent(Intent.ACTION_VIEW,url));}catch(Exception ignored){}
                return true;
            }
            @Override public void onPageFinished(WebView view,String url) { publishPrivacyState(); }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onShowCustomView(View view,CustomViewCallback callback) {
                if(fullScreenView!=null) {callback.onCustomViewHidden();return;}
                fullScreenView=view; fullScreenCallback=callback; root.setVisibility(View.GONE);
                addContentView(view,new ViewGroup.LayoutParams(-1,-1));
            }
            @Override public void onHideCustomView() { hideCustomView(); }
        });
        try (java.io.InputStream in=getAssets().open("site/catalog.json")) {
            java.io.ByteArrayOutputStream data=new java.io.ByteArrayOutputStream();byte[] buffer=new byte[4096];int n;while((n=in.read(buffer))!=-1)data.write(buffer,0,n);
            JSONArray games=new JSONObject(data.toString("UTF-8")).getJSONArray("games");
            for(int i=0;i<games.length();i++) if(!"general".equals(games.getJSONObject(i).optString("audience")))hasChildContent=true;
        } catch(Exception ignored) {hasChildContent=true;}
        web.loadUrl(HOME);
        consent=UserMessagingPlatform.getConsentInformation(this);
        if(!hasChildContent) requestConsent();
    }
    private void requestConsent() {
        ConsentRequestParameters params=new ConsentRequestParameters.Builder().build();
        consent.requestConsentInfoUpdate(this,params,()->UserMessagingPlatform.loadAndShowConsentFormIfRequired(this,error->{publishPrivacyState();initializeAdsIfAllowed();}),error->{publishPrivacyState();initializeAdsIfAllowed();});
        initializeAdsIfAllowed();
    }
    private void initializeAdsIfAllowed() {
        if(hasChildContent || adsInitialized || isFinishing() || (!BuildConfig.TEST_ADS && !consent.canRequestAds()))return;
        adsInitialized=true;
        MobileAds.setRequestConfiguration(new RequestConfiguration.Builder().setMaxAdContentRating(RequestConfiguration.MAX_AD_CONTENT_RATING_G).build());
        new Thread(()->MobileAds.initialize(this,status->runOnUiThread(()->{if(!isFinishing()){loadBanner();loadInterstitial();}}))).start();
    }
    private void loadBanner() {
        if(banner!=null || isFinishing() || !adsAllowed())return;
        banner=new AdView(this);banner.setAdUnitId(BuildConfig.BANNER_ID);
        int width=(int)(getResources().getDisplayMetrics().widthPixels/getResources().getDisplayMetrics().density);
        banner.setAdSize(AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(this,width));
        bannerContainer.addView(banner,new FrameLayout.LayoutParams(-1,-2));
        banner.setAdListener(new AdListener(){@Override public void onAdLoaded(){if(!playing&&!adShowing)bannerContainer.setVisibility(View.VISIBLE);}@Override public void onAdFailedToLoad(LoadAdError error){bannerContainer.setVisibility(View.GONE);}});
        banner.loadAd(new AdRequest.Builder().build());
    }
    private boolean adsAllowed(){return !hasChildContent&&(BuildConfig.TEST_ADS||(consent!=null&&consent.canRequestAds()));}
    private void loadInterstitial(){
        if(!adsAllowed()||isFinishing())return;
        InterstitialAd.load(this,BuildConfig.INTERSTITIAL_ID,new AdRequest.Builder().build(),new InterstitialAdLoadCallback(){
            @Override public void onAdLoaded(InterstitialAd ad){interstitial=ad;}
            @Override public void onAdFailedToLoad(LoadAdError error){interstitial=null;}
        });
    }
    private void handleEvent(Uri url) {
        String action=url.getHost(),value=url.getQueryParameter("value");
        if("play".equals(action)) {playing=true;gameStarted=SystemClock.elapsedRealtime();activeGame=value==null?"":value.split("\\|")[0];bannerContainer.setVisibility(View.GONE);if(banner!=null)banner.pause();}
        else if("round".equals(action)&&playing&&activeGame.equals(value)){completedRounds++;}
        else if("leave".equals(action)&&playing&&activeGame.equals(value)) {
            playing=false;activeGame="";long now=SystemClock.elapsedRealtime();
            if(interstitial!=null && adsAllowed() && completedRounds>=3 && now-gameStarted>45000 && now-sessionStarted>180000 && now-lastAd>180000) {
                adShowing=true;lastAd=now;completedRounds=0;InterstitialAd ad=interstitial;interstitial=null;
                ad.setFullScreenContentCallback(new FullScreenContentCallback(){
                    @Override public void onAdDismissedFullScreenContent(){adShowing=false;restoreBanner();loadInterstitial();}
                    @Override public void onAdFailedToShowFullScreenContent(AdError error){adShowing=false;restoreBanner();loadInterstitial();}
                });ad.show(this);
            } else restoreBanner();
        }
        else if("privacy".equals(action)&&consent!=null){UserMessagingPlatform.showPrivacyOptionsForm(this,error->{
            publishPrivacyState();
            // Discard ads requested under the old consent, then re-evaluate.
            interstitial=null;if(banner!=null){banner.destroy();bannerContainer.removeAllViews();banner=null;}bannerContainer.setVisibility(View.GONE);
            if(adsAllowed()){if(adsInitialized){loadBanner();loadInterstitial();}else initializeAdsIfAllowed();}
        });}
        else if("ready".equals(action))publishPrivacyState();
    }
    private void restoreBanner(){if(banner!=null&&!playing&&adsAllowed()){banner.resume();if(banner.getResponseInfo()!=null)bannerContainer.setVisibility(View.VISIBLE);}}
    private void publishPrivacyState(){if(web!=null&&consent!=null){boolean available=consent.getPrivacyOptionsRequirementStatus()==ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED;web.evaluateJavascript("window.setAdPrivacyAvailable && window.setAdPrivacyAvailable("+available+")",null);}}
    private void hideCustomView(){if(fullScreenView!=null){((ViewGroup)fullScreenView.getParent()).removeView(fullScreenView);fullScreenView=null;root.setVisibility(View.VISIBLE);fullScreenCallback.onCustomViewHidden();fullScreenCallback=null;}}
    @Override public void onConfigurationChanged(android.content.res.Configuration config){super.onConfigurationChanged(config);if(banner!=null){banner.destroy();bannerContainer.removeAllViews();banner=null;bannerContainer.setVisibility(View.GONE);if(adsInitialized)loadBanner();}}
    @Override public void onBackPressed(){
        if(fullScreenView!=null){hideCustomView();return;}
        web.evaluateJavascript("window.arcadeBack ? window.arcadeBack() : false",result->{if(!"true".equals(result)){if(web.canGoBack())web.goBack();else finish();}});
    }
    @Override protected void onPause(){super.onPause();if(web!=null){web.evaluateJavascript("window.arcadePause && window.arcadePause()",null);web.onPause();}if(banner!=null)banner.pause();}
    @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();restoreBanner();}
    @Override protected void onDestroy(){if(banner!=null)banner.destroy();if(web!=null){web.stopLoading();web.destroy();}super.onDestroy();}
}
