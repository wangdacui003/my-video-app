package androidx.media3.common;

public final class MediaEdition {

    public final String label;
    public final long durationUs;
    public final boolean selected;

    public MediaEdition(String label, long durationUs, boolean selected) {
        this.label = label;
        this.durationUs = durationUs;
        this.selected = selected;
    }
}
