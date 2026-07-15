package androidx.media3.common;

public final class MediaChapter {

    public final String label;
    public final long timeUs;
    public final boolean selected;

    public MediaChapter(String label, long timeUs, boolean selected) {
        this.label = label;
        this.timeUs = timeUs;
        this.selected = selected;
    }
}
