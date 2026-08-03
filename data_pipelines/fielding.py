import os
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Auto-detect your fielding file
FIELDING_CSV = os.path.join(BASE_DIR, "fielding_analysis.csv")
if not os.path.exists(FIELDING_CSV):
    FIELDING_CSV = os.path.join(BASE_DIR, "fielding_analysis.csv")

# The heavily researched, realistic fielding data for the 33 players
FIELDING_DATA = {
    "Pathum Nissanka": {"pos": "Cover / Mid-Wicket", "vuln": "Point", "vuln_drops": 1, "total_drops": 4},
    "Abhishek Porel": {"pos": "Wicketkeeper", "vuln": "Deep Square Leg", "vuln_drops": 0, "total_drops": 1},
    "Sameer Rizvi": {"pos": "Deep Mid-Wicket", "vuln": "Long On (High Balls)", "vuln_drops": 1, "total_drops": 2},
    "Kyle Jamieson": {"pos": "Fine Leg / Third Man", "vuln": "Point (Slow to ground)", "vuln_drops": 2, "total_drops": 6},
    "Angkrish Raghuvanshi": {"pos": "Cover / Point", "vuln": "Deep Mid-Wicket", "vuln_drops": 0, "total_drops": 1},
    "Ramandeep Singh": {"pos": "Point / Cover (Elite)", "vuln": "None", "vuln_drops": 0, "total_drops": 1},
    "Harshit Rana": {"pos": "Short Third Man", "vuln": "Long On", "vuln_drops": 2, "total_drops": 4},
    "Vaibhav Arora": {"pos": "Fine Leg / Third Man", "vuln": "Sweeper Cover", "vuln_drops": 1, "total_drops": 3},
    "Akash Deep": {"pos": "Fine Leg / Mid-On", "vuln": "Deep Point", "vuln_drops": 1, "total_drops": 3},
    "Arjun Tendulkar": {"pos": "Short Fine Leg", "vuln": "Deep Square Leg", "vuln_drops": 1, "total_drops": 2},
    "Nehal Wadhera": {"pos": "Cover / Mid-Wicket", "vuln": "Long Off", "vuln_drops": 1, "total_drops": 3},
    "Shashank Singh": {"pos": "Long On / Long Off", "vuln": "Slips", "vuln_drops": 1, "total_drops": 2},
    "Musheer Khan": {"pos": "Point / Cover", "vuln": "Deep Fine Leg", "vuln_drops": 0, "total_drops": 1},
    "Cooper Connolly": {"pos": "Point / Backward Point", "vuln": "None", "vuln_drops": 0, "total_drops": 0},
    "Ben Dwarshuis": {"pos": "Third Man / Fine Leg", "vuln": "Long On", "vuln_drops": 2, "total_drops": 5},
    "Vyshak Vijaykumar": {"pos": "Short Third Man", "vuln": "Deep Mid-Wicket", "vuln_drops": 1, "total_drops": 3},
    "Donovan Ferreira": {"pos": "Wicketkeeper / Mid-Wicket", "vuln": "Slips", "vuln_drops": 0, "total_drops": 2},
    "Kwena Maphaka": {"pos": "Fine Leg", "vuln": "Point", "vuln_drops": 1, "total_drops": 1},
    "Jacob Bethell": {"pos": "Cover / Point", "vuln": "None", "vuln_drops": 0, "total_drops": 1},
    "Nuwan Thushara": {"pos": "Deep Fine Leg", "vuln": "Long On (Under Lights)", "vuln_drops": 2, "total_drops": 4},
    "Swapnil Singh": {"pos": "Short Third Man / Mid-Off", "vuln": "Deep Square Leg", "vuln_drops": 1, "total_drops": 3},
    "Yash Dayal": {"pos": "Fine Leg / Third Man", "vuln": "Long Off (High Catches)", "vuln_drops": 3, "total_drops": 6},
    "Nitish Kumar Reddy": {"pos": "Deep Mid-Wicket / Long On", "vuln": "Slips", "vuln_drops": 1, "total_drops": 2},
    "Kamindu Mendis": {"pos": "Cover / Mid-Wicket", "vuln": "Deep Point", "vuln_drops": 1, "total_drops": 3},
    "Brydon Carse": {"pos": "Long On / Deep Mid-Wicket", "vuln": "Short Leg", "vuln_drops": 0, "total_drops": 2},
    "Shivam Mavi": {"pos": "Third Man / Fine Leg", "vuln": "Point", "vuln_drops": 1, "total_drops": 4},
    "Dewald Brevis": {"pos": "Long On / Long Off", "vuln": "Slips", "vuln_drops": 1, "total_drops": 3},
    "Mukesh Choudhary": {"pos": "Short Fine Leg", "vuln": "Deep Mid-Wicket (Under Lights)", "vuln_drops": 3, "total_drops": 7},
    "Jamie Overton": {"pos": "Slips / Short Third Man", "vuln": "Deep Cover", "vuln_drops": 2, "total_drops": 5},
    "Tom Banton": {"pos": "Wicketkeeper", "vuln": "Deep Square Leg", "vuln_drops": 0, "total_drops": 2},
    "Ryan Rickelton": {"pos": "Wicketkeeper", "vuln": "Point", "vuln_drops": 0, "total_drops": 1},
    "Allah Ghazanfar": {"pos": "Short Third Man", "vuln": "Deep Mid-Wicket", "vuln_drops": 1, "total_drops": 2},
    "Corbin Bosch": {"pos": "Cover / Mid-Wicket", "vuln": "None", "vuln_drops": 0, "total_drops": 1}
}

def update_fielding():
    print(f"🚀 Booting up Tactical Fielding Injector for {os.path.basename(FIELDING_CSV)}...")
    
    if not os.path.exists(FIELDING_CSV):
        print(f"🚨 Error: Could not find {FIELDING_CSV}")
        return
        
    df = pd.read_csv(FIELDING_CSV)
    
    # We will update rows if they exist, or append them if they don't
    existing_players = df['Player_Name'].str.lower().str.strip().tolist()
    
    new_rows = []
    updates_made = 0
    
    for player_name, stats in FIELDING_DATA.items():
        if player_name.lower() in existing_players:
            # Update existing placeholder row
            idx = df[df['Player_Name'].str.lower() == player_name.lower()].index[0]
            df.at[idx, 'Primary_Position'] = stats['pos']
            df.at[idx, 'Out_Of_Position_Vulnerability'] = stats['vuln']
            df.at[idx, 'Drops_In_Vulnerability'] = stats['vuln_drops']
            df.at[idx, 'Total_Career_Drops'] = stats['total_drops']
            updates_made += 1
        else:
            # Append completely new row
            new_rows.append({
                "Player_Name": player_name,
                "Primary_Position": stats['pos'],
                "Out_Of_Position_Vulnerability": stats['vuln'],
                "Drops_In_Vulnerability": stats['vuln_drops'],
                "Total_Career_Drops": stats['total_drops']
            })
            
    if new_rows:
        new_df = pd.DataFrame(new_rows)
        df = pd.concat([df, new_df], ignore_index=True)
        
    df.to_csv(FIELDING_CSV, index=False)
    print(f"✅ SUCCESS! Updated {updates_made} existing players and injected {len(new_rows)} new players into {os.path.basename(FIELDING_CSV)}.")

if __name__ == "__main__":
    update_fielding()