import json
import csv
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_PATH = os.path.join(BASE_DIR, "players2026.json")
CSV_PATH = os.path.join(BASE_DIR, "teams.csv")

def convert_squads():
    print("🚀 Converting 2026 Squad JSON to teams.csv...")
    
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    with open(CSV_PATH, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Team', 'Player_Name', 'Role', 'Country'])
        
        count = 0
        for team, players in data.items():
            for p in players:
                writer.writerow([team, p['name'], p['role'], p['nationality']])
                count += 1
                
    print(f"✅ SUCCESS! Wrote {count} active players to {CSV_PATH}.")
    print("Please move teams.csv into your React public/ folder!")

if __name__ == "__main__":
    convert_squads()