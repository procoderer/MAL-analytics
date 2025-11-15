import pandas as pd
from pathlib import Path

def read_csv_safely(path: str) -> pd.DataFrame:
    """Robust CSV read with a couple of common fallbacks."""
    try:
        return pd.read_csv(path, encoding="utf-8-sig")
    except UnicodeDecodeError:
        return pd.read_csv(path, encoding="cp1252", errors="replace")
    except Exception as e:
        raise RuntimeError(f"Failed to read {path}: {e}")

def unique_clean(series: pd.Series):
    """Normalize whitespace, unify types, drop blanks/NaN, return sorted unique values."""
    s = series.astype("string")
    s = s.replace({"": pd.NA})
    return sorted(s.dropna().unique(), key=str.casefold)

def report_uniques(df: pd.DataFrame, cols: list[str], label: str):
    # Safety check
    missing = [c for c in cols if c not in df.columns]
    if missing:
        raise KeyError(f"[{label}] Missing expected column(s): {missing}. Found: {list(df.columns)}")

    uniques = {c: unique_clean(df[c]) for c in cols}

    print(f"\n=== {label} ===")
    for c in cols:
        print(f"\n{c} ({len(uniques[c])} unique):")
        for v in uniques[c]:
            print(f"  - {v}")

# -------- Run both files --------
tasks = [
    ("anime cleaned.csv", ["type", "source_type", "status"], "anime cleaned.csv"),
    ("anime_anime cleaned.csv", ["relation_type"], "anime_anime cleaned.csv"),
]

for path, cols, label in tasks:
    if not Path(path).exists():
        print(f"\n[WARN] File not found: {path} — skipping.")
        continue
    df = read_csv_safely(path)
    report_uniques(df, cols, label)

'''
type (5 unique):
  - Movie
  - ONA
  - OVA
  - Special
  - TV

source_type (14 unique):
  - 4-koma manga
  - Book
  - Card game
  - Game
  - Light novel
  - Manga
  - Mixed media
  - Music
  - Novel
  - Original
  - Other
  - Visual novel
  - Web manga
  - Web novel

status (3 unique):
  - Currently Airing
  - Finished Airing
  - Not yet aired

=== anime_anime cleaned.csv ===

relation_type (12 unique):
  - Alternative setting
  - Alternative version
  - Character
  - Full story
  - Identity
  - Other
  - Parent story
  - Prequel
  - Sequel
  - Side story
  - Spin-off
  - Summary
'''
