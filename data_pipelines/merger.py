import pandas as pd
import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Ensure these match your exact file names in the directory
CSV_PATH = os.path.join(BASE_DIR, "players.csv")
JSON_PATH = os.path.join(BASE_DIR, "player_data1.json")

def update_csv_with_json():
    print("🚀 Booting up the JSON-to-CSV Injector...")
    
    if not os.path.exists(CSV_PATH):
        print(f"🚨 Error: Could not find {CSV_PATH}")
        return
        
    if not os.path.exists(JSON_PATH):
        print(f"🚨 Error: Could not find {JSON_PATH}. Ensure 'player_data1.json' is in the data_pipeline folder.")
        return
        
    df = pd.read_csv(CSV_PATH)
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        player_data = json.load(f)
        
    # Find where 'Player_Name' is so we can put the new columns right next to it
    if 'Player_Name' in df.columns:
        insert_loc = df.columns.get_loc('Player_Name') + 1
    else:
        insert_loc = len(df.columns)
        
    # Explicitly create and insert the columns if they don't exist
    for col in ['Full_Name', 'Country', 'Team']:
        if col not in df.columns:
            df.insert(insert_loc, col, '')
            insert_loc += 1
            
    updates = 0
    
    for idx, row in df.iterrows():
        # Clean the name just in case there are hidden spaces
        p_name = str(row['Player_Name']).strip()
        
        # If the player exists in our JSON, overwrite their columns!
        if p_name in player_data:
            info = player_data[p_name]
            df.at[idx, 'Full_Name'] = info.get('full_name', p_name)
            df.at[idx, 'Country'] = info.get('country', 'Unknown')
            df.at[idx, 'Team'] = info.get('team', 'Unattached')
            updates += 1
            
    df.to_csv(CSV_PATH, index=False)
    print(f"✅ SUCCESS! Seamlessly injected data for {updates} players from {os.path.basename(JSON_PATH)} directly into {os.path.basename(CSV_PATH)}.")

if __name__ == "__main__":
    update_csv_with_json()