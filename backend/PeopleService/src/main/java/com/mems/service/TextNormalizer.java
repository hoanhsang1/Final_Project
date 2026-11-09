package com.mems.service;

import java.text.Normalizer;
import java.util.Locale;

/** QC-07: diacritic-insensitive, case-insensitive search keys. */
public final class TextNormalizer {
    private TextNormalizer() {}

    public static String unaccent(String value) {
        if (value == null) return null;
        String normalized = Normalizer.normalize(value.trim(), Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .replace('đ', 'd')
            .replace('Đ', 'D');
        return normalized.toLowerCase(Locale.ROOT);
    }

    /** Returns a LIKE pattern with %/_/! escaped; pair with ESCAPE '!'. */
    public static String likeContains(String value) {
        String normalized = unaccent(value);
        if (normalized == null || normalized.isEmpty()) return null;
        String escaped = normalized
            .replace("!", "!!")
            .replace("%", "!%")
            .replace("_", "!_");
        return "%" + escaped + "%";
    }
}
