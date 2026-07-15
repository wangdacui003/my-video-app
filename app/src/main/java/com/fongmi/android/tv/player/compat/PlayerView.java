package com.fongmi.android.tv.player.compat;

import android.content.Context;
import android.net.Uri;
import android.util.AttributeSet;

import androidx.annotation.Nullable;
import androidx.media3.ui.danmaku.DanmakuConfig;

import okhttp3.OkHttpClient;

public class PlayerView extends androidx.media3.ui.PlayerView {

    private boolean debugViewVisible;

    public PlayerView(Context context) {
        super(context);
    }

    public PlayerView(Context context, @Nullable AttributeSet attrs) {
        super(context, attrs);
    }

    public PlayerView(Context context, @Nullable AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
    }

    public boolean isDebugViewVisible() {
        return debugViewVisible;
    }

    public void toggleDebugView() {
        debugViewVisible = !debugViewVisible;
    }

    public void hideDebugView() {
        debugViewVisible = false;
    }

    public void setRender(int render) {
    }

    public void setDanmakuEnabled(boolean enabled) {
    }

    public void setDanmakuOkHttpClient(OkHttpClient client) {
    }

    public void setDanmakuConfig(DanmakuConfig config) {
    }

    public void setDanmakuSource(@Nullable Uri uri) {
    }

    public void sendDanmaku(String text) {
    }
}
