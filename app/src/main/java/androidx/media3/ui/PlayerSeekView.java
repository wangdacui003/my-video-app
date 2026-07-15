package androidx.media3.ui;

import android.content.Context;
import android.graphics.Color;
import android.util.AttributeSet;
import android.view.Gravity;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.media3.common.C;
import androidx.media3.common.Player;

import java.util.Locale;

public class PlayerSeekView extends LinearLayout {

    private final DefaultTimeBar timeBar;
    private final TextView positionView;
    private final TextView durationView;
    private final Runnable progressRunnable;
    private Player player;
    private boolean scrubbing;

    public PlayerSeekView(Context context) {
        this(context, null);
    }

    public PlayerSeekView(Context context, @Nullable AttributeSet attrs) {
        this(context, attrs, 0);
    }

    public PlayerSeekView(Context context, @Nullable AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        setOrientation(VERTICAL);
        setGravity(Gravity.CENTER_VERTICAL);
        timeBar = new DefaultTimeBar(context);
        timeBar.setId(R.id.exo_progress);
        addView(timeBar, new LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));

        LinearLayout timeRow = new LinearLayout(context);
        timeRow.setOrientation(HORIZONTAL);
        timeRow.setGravity(Gravity.CENTER_VERTICAL);
        LayoutParams rowParams = new LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
        rowParams.topMargin = dp(context, 2);

        positionView = createTimeView(context);
        durationView = createTimeView(context);
        positionView.setText(formatTime(0));
        durationView.setText(formatTime(C.TIME_UNSET));
        timeRow.addView(positionView, new LayoutParams(0, LayoutParams.WRAP_CONTENT, 1));
        timeRow.addView(durationView, new LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT));
        addView(timeRow, rowParams);

        timeBar.addListener(new TimeBar.OnScrubListener() {
            @Override
            public void onScrubStart(TimeBar timeBar, long position) {
                scrubbing = true;
                positionView.setText(formatTime(position));
            }

            @Override
            public void onScrubMove(TimeBar timeBar, long position) {
                positionView.setText(formatTime(position));
            }

            @Override
            public void onScrubStop(TimeBar timeBar, long position, boolean canceled) {
                scrubbing = false;
                if (!canceled && player != null) player.seekTo(position);
                updateProgress();
            }
        });

        progressRunnable = new Runnable() {
            @Override
            public void run() {
                updateProgress();
                if (player != null) postDelayed(this, 1000);
            }
        };
    }

    public void setPlayer(@Nullable Player player) {
        removeCallbacks(progressRunnable);
        this.player = player;
        updateProgress();
        if (player != null) post(progressRunnable);
    }

    public TimeBar getTimeBar() {
        return timeBar;
    }

    private void updateProgress() {
        if (player == null) {
            timeBar.setDuration(C.TIME_UNSET);
            timeBar.setPosition(0);
            timeBar.setBufferedPosition(0);
            positionView.setText(formatTime(0));
            durationView.setText(formatTime(C.TIME_UNSET));
            return;
        }
        long duration = player.getDuration();
        long position = player.getCurrentPosition();
        long buffered = player.getBufferedPosition();
        timeBar.setDuration(duration);
        timeBar.setPosition(position);
        timeBar.setBufferedPosition(buffered);
        if (!scrubbing) positionView.setText(formatTime(position));
        durationView.setText(formatTime(duration));
    }

    private static TextView createTimeView(Context context) {
        TextView view = new TextView(context);
        view.setTextColor(Color.WHITE);
        view.setTextSize(12);
        view.setGravity(Gravity.CENTER_VERTICAL);
        view.setIncludeFontPadding(false);
        return view;
    }

    private static int dp(Context context, int value) {
        return Math.round(value * context.getResources().getDisplayMetrics().density);
    }

    private static String formatTime(long timeMs) {
        if (timeMs == C.TIME_UNSET || timeMs < 0) return "--:--";
        long totalSeconds = timeMs / 1000;
        long seconds = totalSeconds % 60;
        long minutes = (totalSeconds / 60) % 60;
        long hours = totalSeconds / 3600;
        if (hours > 0) return String.format(Locale.getDefault(), "%d:%02d:%02d", hours, minutes, seconds);
        return String.format(Locale.getDefault(), "%02d:%02d", minutes, seconds);
    }
}
