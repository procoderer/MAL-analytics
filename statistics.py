import pandas as pd
import os

def dataset_summary(source, show_categorical=False, top_n=5):
    """
    Prints size and summary statistics for a given dataset.
    
    Parameters:
    -----------
    source : str or pd.DataFrame
        Either a file path to a CSV or a pandas DataFrame.
    show_categorical : bool
        If True, show the top `top_n` most frequent values for categorical columns.
    top_n : int
        Number of top frequent values to show for categorical columns.
    """

    # --- Load dataset if path provided ---
    if isinstance(source, str):
        # Try to detect if it's tab-separated by checking the first line
        with open(source, 'r', encoding='utf-8') as f:
            first_line = f.readline()
            if '\t' in first_line and ',' not in first_line:
                df = pd.read_csv(source, sep='\t')
            else:
                df = pd.read_csv(source)
        file_size_mb = os.path.getsize(source) / (1024 * 1024)
        print(f"File: {source}")
        print(f"File size: {file_size_mb:.2f} MB")
    else:
        df = source
        print("Using provided DataFrame (no file size available)")

    # --- Basic shape info ---
    n_rows, n_cols = df.shape
    print(f"Rows: {n_rows:,}")
    print(f"Columns: {n_cols}\n")

    # --- Summary statistics for numeric columns ---
    numeric_cols = df.select_dtypes(include=[float, int]).columns
    if len(numeric_cols) > 0:
        print("Numeric Summary Statistics:")
        desc = df.describe(include=[float, int]).T
        desc["missing_values"] = df[numeric_cols].isnull().sum()
        
        # Display with better formatting to avoid truncation
        pd.set_option('display.max_columns', None)
        pd.set_option('display.width', None)
        pd.set_option('display.max_colwidth', None)
        print(desc[["count", "mean", "std", "min", "50%", "max", "missing_values"]])
        
        # Reset pandas display options
        pd.reset_option('display.max_columns')
        pd.reset_option('display.width')
        pd.reset_option('display.max_colwidth')
    else:
        print("No numeric columns found in the dataset.")
    print()

    # --- Optional categorical stats ---
    if show_categorical:
        print("Categorical Column Samples:")
        cat_cols = df.select_dtypes(include=["object", "category"]).columns
        for col in cat_cols:
            print(f"\n{col}:")
            print(df[col].value_counts().head(top_n))
        print()

    # --- Return summary as dict (optional for reuse) ---
    summary = {
        "rows": n_rows,
        "columns": n_cols,
        "numeric_summary": desc,
        "categorical_columns": list(df.select_dtypes(include=["object", "category"]).columns)
    }
    return summary
if __name__ == "__main__":
    dataset_summary("anime_anime.csv")
    dataset_summary("anime.csv")
    