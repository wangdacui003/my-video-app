package com.fongmi.android.tv.utils;

import com.fongmi.android.tv.BuildConfig;

public class Github {

    public static final String URL = "https://raw.githubusercontent.com/FongMi/Release/fongmi";

    private static String getUrl(String name) {
        return URL + "/apk/" + name;
    }

    public static String getJson(String name) {
        if (BuildConfig.AIMOYU_UPDATE_URL.length() > 0) return BuildConfig.AIMOYU_UPDATE_URL;
        return getUrl(name + ".json");
    }

    public static String getApk(String name) {
        if (BuildConfig.AIMOYU_APK_DOWNLOAD_BASE_URL.length() > 0) return BuildConfig.AIMOYU_APK_DOWNLOAD_BASE_URL + name + ".apk";
        return getUrl(name + ".apk");
    }
}
