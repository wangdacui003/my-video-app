package com.fongmi.android.tv.player.mpv;

import androidx.media3.common.Player;

import com.fongmi.android.tv.player.exo.ExoPlayerEngine;

public class MpvPlayerEngine extends ExoPlayerEngine {

    public MpvPlayerEngine(int decode, Player.Listener listener) {
        super(decode, listener);
    }

    public static boolean isAvailable() {
        return false;
    }
}
