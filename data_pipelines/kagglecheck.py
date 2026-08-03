import pandas as pd
import numpy as np
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Fallback logic to grab the files regardless of whether they are named players.csv or players_2.csv
PLAYERS_CSV = os.path.join(BASE_DIR, "players.csv") if os.path.exists(os.path.join(BASE_DIR, "players_2.csv")) else os.path.join(BASE_DIR, "players.csv")
FIELDING_CSV = os.path.join(BASE_DIR, "fielding_analysis.csv") if os.path.exists(os.path.join(BASE_DIR, "fielding_analysis.csv")) else os.path.join(BASE_DIR, "fielding_analysis_2.csv")

def smart_name_match(target_name, valid_names_list):
    """Fuzzy matches names by comparing initials and surnames."""
    target_lower = str(target_name).lower().strip()
    valid_lower_map = {str(n).lower().strip(): n for n in valid_names_list}
    
    # 1. Exact Match Check
    if target_lower in valid_lower_map:
        return valid_lower_map[target_lower]
        
    parts = target_lower.split()
    if len(parts) < 2: return target_name
    
    target_surname = parts[-1]
    target_initial = parts[0][0]
    
    # 2. Fuzzy Initial + Surname Check
    for valid_lower, original_name in valid_lower_map.items():
        v_parts = valid_lower.split()
        if len(v_parts) < 2: continue
        
        v_surname = v_parts[-1]
        v_initial = v_parts[0][0]
        
        if target_surname == v_surname and target_initial == v_initial:
            return original_name
            
    return target_name

def clean_for_kaggle(players_df, fielding_df):
    print("🧹 AUTO-CLEANING DATA FOR KAGGLE...")
    
    # Replace common null-ish strings with actual NaNs for pandas handling
    players_df.replace([r'^\s*$', 'nan', 'NaN', 'None', 'N/A', 'null', 'NULL', 'Unknown'], np.nan, regex=True, inplace=True)
    fielding_df.replace([r'^\s*$', 'nan', 'NaN', 'None', 'N/A', 'null', 'NULL', 'Unknown'], np.nan, regex=True, inplace=True)
    
    # Fill remaining NaNs with a readable string for Kaggle users
    players_df.fillna("Not Available", inplace=True)
    fielding_df.fillna("Not Available", inplace=True)
        
    # Align names
    print("🧬 Aligning mismatched player names...")
    master_names = players_df['Player_Name'].tolist()
    if 'Player_Name' in fielding_df.columns:
        fielding_df['Player_Name'] = fielding_df['Player_Name'].apply(lambda x: smart_name_match(x, master_names))
    
    # Export cleaned files
    clean_players_path = os.path.join(BASE_DIR, "kaggle_players.csv")
    clean_fielding_path = os.path.join(BASE_DIR, "kaggle_fielding.csv")
    
    players_df.to_csv(clean_players_path, index=False)
    fielding_df.to_csv(clean_fielding_path, index=False)
    print("✅ Cleaned files saved as 'kaggle_players.csv' and 'kaggle_fielding.csv'!\n")
    
    return clean_players_path, clean_fielding_path

def validate_datasets(players_path=PLAYERS_CSV, fielding_path=FIELDING_CSV, is_recheck=False):
    print("==================================================")
    print("      🚀 KAGGLE DATASET READINESS VALIDATOR       ")
    print("==================================================\n")

    if not os.path.exists(players_path) or not os.path.exists(fielding_path):
        print(f"🚨 Error: Could not find CSVs at {players_path} or {fielding_path}")
        return

    players_df = pd.read_csv(players_path)
    fielding_df = pd.read_csv(fielding_path)

    print(f"📊 1. FILE STRUCTURE & SHAPE")
    print(f"  -> {os.path.basename(players_path)}: {players_df.shape[0]} Rows, {players_df.shape[1]} Columns")
    print(f"  -> {os.path.basename(fielding_path)}: {fielding_df.shape[0]} Rows, {fielding_df.shape[1]} Columns\n")

    print(f"🧹 2. MISSING VALUES (NULL/NaN) CHECK")
    players_nulls = players_df.isnull().sum().sum()
    fielding_nulls = fielding_df.isnull().sum().sum()
    
    if players_nulls == 0:
        print(f"  -> ✅ {os.path.basename(players_path)} is clean (0 Nulls).")
    else:
        print(f"  -> ⚠️ {os.path.basename(players_path)} has {players_nulls} missing values.")

    if fielding_nulls == 0:
        print(f"  -> ✅ {os.path.basename(fielding_path)} is clean (0 Nulls).")
    else:
        print(f"  -> ⚠️ {os.path.basename(fielding_path)} has {fielding_nulls} missing values.")
    print()

    print(f"🔗 3. DATABASE MERGE COMPATIBILITY")
    p_names = set(players_df['Player_Name'].str.strip().str.lower())
    f_names = set(fielding_df['Player_Name'].str.strip().str.lower())
    
    overlap = p_names.intersection(f_names)
    overlap_percent = (len(overlap) / len(f_names)) * 100 if len(f_names) > 0 else 0
    
    print(f"  -> {len(overlap)}/{len(f_names)} fielding profiles match the master database.")
    
    if overlap_percent > 80:
        print(f"  -> ✅ High Compatibility ({overlap_percent:.1f}%).")
    else:
        print(f"  -> ⚠️ Low Compatibility ({overlap_percent:.1f}%).")
    
    print("\n==================================================")
    
    if players_nulls == 0 and fielding_nulls == 0 and overlap_percent > 90:
        print("🏆 VERDICT: DATASETS ARE 100% READY FOR KAGGLE UPLOAD!")
    else:
        print("🛠️ VERDICT: Needs a little cleanup before uploading.")
        if not is_recheck:
            print("\n⚡ INITIATING AUTO-CLEANER...")
            clean_p, clean_f = clean_for_kaggle(players_df, fielding_df)
            validate_datasets(clean_p, clean_f, is_recheck=True)

if __name__ == "__main__":
    validate_datasets()