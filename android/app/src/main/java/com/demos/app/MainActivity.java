package com.demos.app;

import android.Manifest;
import androidx.activity.ComponentActivity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.webkit.WebResourceError;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.webkit.GeolocationPermissions;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * DEMOS для Android (тестовая сборка, 24.10).
 * Внутри — веб-версия DEMOS; обновляется вместе с сайтом, переустанавливать APK не нужно.
 */
public class MainActivity extends ComponentActivity {

    private static final String HOST = "marsaon0-lang.github.io";
    private static final String HOME = "https://" + HOST + "/demos-app/web/";
    private static final int REQ_FILE = 1;
    private static final int REQ_GEO = 2;

    private static final int BG = 0xFF11151F;       // --bg-app
    private static final int ACCENT = 0xFF0166FF;   // --bg-accent, кнопка «Повторить»
    private static final int TEXT = 0xFFFFFFFF;
    private static final int TEXT_SEC = 0xFF9AA3B8;   // --t-secondary

    private WebView web;
    private View splash, offline;
    private boolean firstLoadDone = false, mainFrameError = false;
    private long startedAt;
    private ValueCallback<Uri[]> fileCallback;
    private String geoOrigin;
    private GeolocationPermissions.Callback geoCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        startedAt = System.currentTimeMillis();
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(BG);
        web = new WebView(this);
        web.setBackgroundColor(BG);
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        offline = buildOffline();
        offline.setVisibility(View.GONE);
        root.addView(offline, new FrameLayout.LayoutParams(-1, -1));
        splash = buildSplash();
        root.addView(splash, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setGeolocationEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setUserAgentString(s.getUserAgentString() + " DEMOSAndroid/0.44");
        web.addJavascriptInterface(new MwaBridge(this, web), "DEMOSNative"); // кошелёк Solana (Mobile Wallet Adapter)

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (HOST.equals(u.getHost())) return false;
                openOutside(u);
                return true;
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                mainFrameError = false;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) { mainFrameError = true; showOffline(); }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                if (mainFrameError) return;
                offline.setVisibility(View.GONE);
                firstLoadDone = true;
                hideSplash();
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (hasGeo()) { callback.invoke(origin, true, false); return; }
                geoOrigin = origin;
                geoCallback = callback;
                requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, REQ_GEO);
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    Intent i = params.createIntent();
                    if (params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                    startActivityForResult(i, REQ_FILE);
                } catch (ActivityNotFoundException e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });

        if (isOnline()) web.loadUrl(startUrl(getIntent()));
        else showOffline();
    }

    // ---------- заставка и «нет интернета» ----------

    private int dp(float v) { return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics()); }

    private TextView text(String s, float sp, int color, boolean bold) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        t.setTextColor(color);
        t.setGravity(Gravity.CENTER);
        if (bold) t.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        return t;
    }

    private ImageView logo(int size) {
        ImageView i = new ImageView(this);
        i.setImageResource(R.mipmap.ic_launcher);
        i.setLayoutParams(new LinearLayout.LayoutParams(dp(size), dp(size)));
        return i;
    }

    private LinearLayout column() {
        LinearLayout l = new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL);
        l.setGravity(Gravity.CENTER);
        l.setBackgroundColor(BG);
        l.setPadding(dp(32), dp(32), dp(32), dp(32));
        l.setClickable(true); // не пропускать нажатия на страницу под ней
        return l;
    }

    /** Заставка при запуске: логотип и «DEMOS», пока загружается первая страница. */
    private View buildSplash() {
        LinearLayout l = column();
        l.addView(logo(96));
        TextView name = text("DEMOS", 26, TEXT, true);
        name.setLetterSpacing(0.08f);
        name.setPadding(0, dp(18), 0, 0);
        l.addView(name);
        return l;
    }

    private void hideSplash() {
        if (splash.getVisibility() != View.VISIBLE) return;
        long wait = Math.max(0, 700 - (System.currentTimeMillis() - startedAt)); // заставка видна хотя бы 0,7 с
        splash.postDelayed(() -> splash.animate().alpha(0f).setDuration(250).withEndAction(() -> splash.setVisibility(View.GONE)).start(), wait);
    }

    /** Экран «Нет подключения к интернету» с кнопкой «Повторить». */
    private View buildOffline() {
        LinearLayout l = column();
        ImageView i = logo(64);
        i.setAlpha(0.5f);
        l.addView(i);
        TextView title = text("Нет подключения к интернету", 20, TEXT, true);
        title.setPadding(0, dp(20), 0, dp(8));
        l.addView(title);
        l.addView(text("Проверьте Wi-Fi или мобильный интернет и попробуйте ещё раз.", 15, TEXT_SEC, false));
        Button b = new Button(this);
        b.setText("Повторить");
        b.setAllCaps(false);
        b.setTextColor(Color.WHITE);
        b.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        b.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(ACCENT);
        bg.setCornerRadius(dp(14));
        b.setBackground(bg);
        b.setStateListAnimator(null);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, dp(52));
        lp.topMargin = dp(28);
        b.setLayoutParams(lp);
        b.setOnClickListener(v -> retry());
        l.addView(b);
        return l;
    }

    private void showOffline() {
        offline.setVisibility(View.VISIBLE);
        splash.animate().cancel();
        splash.setVisibility(View.GONE);
    }

    private void retry() {
        if (!isOnline()) return;
        offline.setVisibility(View.GONE);
        if (firstLoadDone && web.getUrl() != null) web.reload();
        else web.loadUrl(startUrl(getIntent()));
    }

    private boolean isOnline() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
            if (cm == null) return true;
            if (Build.VERSION.SDK_INT >= 23) {
                NetworkCapabilities nc = cm.getNetworkCapabilities(cm.getActiveNetwork());
                return nc != null && nc.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
            }
            android.net.NetworkInfo ni = cm.getActiveNetworkInfo();
            return ni != null && ni.isConnected();
        } catch (Exception e) { return true; }
    }

    /** Ссылка-приглашение …/web/?ref=ник открывается сразу в приложении. */
    private String startUrl(Intent intent) {
        Uri data = intent != null ? intent.getData() : null;
        if (data != null && HOST.equals(data.getHost())) return data.toString();
        return HOME;
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        Uri data = intent.getData();
        if (data != null && HOST.equals(data.getHost())) web.loadUrl(data.toString());
    }

    private boolean hasGeo() {
        return Build.VERSION.SDK_INT < 23
                || checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        if (requestCode == REQ_GEO && geoCallback != null) {
            geoCallback.invoke(geoOrigin, hasGeo(), false);
            geoCallback = null;
            geoOrigin = null;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQ_FILE && fileCallback != null) {
            Uri[] result = null;
            if (resultCode == RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    int n = data.getClipData().getItemCount();
                    result = new Uri[n];
                    for (int k = 0; k < n; k++) result[k] = data.getClipData().getItemAt(k).getUri();
                } else if (data.getData() != null) {
                    result = new Uri[]{data.getData()};
                }
            }
            fileCallback.onReceiveValue(result);
            fileCallback = null;
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    private void openOutside(Uri u) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, u));
        } catch (ActivityNotFoundException ignored) { }
    }

    /** Системная «Назад»: сначала закрывает окна и экраны внутри DEMOS, на главном — сворачивает приложение. */
    @Override
    public void onBackPressed() {
        web.evaluateJavascript("(window.DEMOS_BACK && window.DEMOS_BACK()) ? 'y' : 'n'", value -> {
            if (value == null || !value.contains("y")) moveTaskToBack(true);
        });
    }

    @Override
    protected void onPause() { super.onPause(); web.onPause(); }

    @Override
    protected void onResume() { super.onResume(); web.onResume(); }
}
