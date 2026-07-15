package androidx.media3.ui;

import android.content.Context;
import android.util.AttributeSet;
import android.view.Gravity;
import android.widget.LinearLayout;

import androidx.annotation.Nullable;
import androidx.media3.common.Player;

public class PlayerSeekView extends LinearLayout {

    private final DefaultTimeBar timeBar;

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
    }

    public void setPlayer(@Nullable Player player) {
    }

    public TimeBar getTimeBar() {
        return timeBar;
    }
}
