package com.fongmi.android.tv.player.exo;

import androidx.media3.common.MediaItem;
import androidx.media3.common.PriorityTaskManager;
import androidx.media3.exoplayer.ExoPlayer;

public class PreCache {

    private final PriorityTaskManager priorityTaskManager;
    private MediaItem mediaItem;
    private ExoPlayer player;

    public PreCache() {
        this.priorityTaskManager = new PriorityTaskManager();
    }

    public void start(ExoPlayer player, MediaItem mediaItem) {
        this.mediaItem = mediaItem;
        this.player = player;
        restart();
    }

    public void stop() {
        stopManager();
        player = null;
        mediaItem = null;
    }

    public void release() {
        stop();
    }

    private void restart() {
        stopManager();
    }

    private void stopManager() {
        if (player != null) player.setPriorityTaskManager(null);
    }
}
