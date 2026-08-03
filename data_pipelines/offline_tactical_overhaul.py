import os
import pandas as pd
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "players.csv")
JSON_PATH = os.path.join(BASE_DIR, "refined.json")

def is_generic(text):
    """Detects if the tactical advice is a generic placeholder we need to erase."""
    if not isinstance(text, str): return True
    text = text.lower()
    generics = ["standard lines", "restrict boundaries", "wait for bad balls", "build pressure", "wide yorker", "awaiting scout data"]
    return any(g in text for g in generics)

def procedural_tactic_generator(role, phase, sr, econ):
    """
    Intelligently generates highly technical, realistic cricket advice 
    for players who aren't in the elite JSON database.
    NO APIs REQUIRED.
    """
    pace, spin, bat, tape = "", "", "", ""
    
    # PROCEDURAL BATTER TACTICS
    if "Aggressor" in phase or "Top Order" in phase:
        if sr > 140:
            pace = "Target the front pad with sharp inswing early in the spell. Highly vulnerable in the first 10 balls."
            spin = "Use flight and variations in pace. Drag them wide of the crease to induce a sliced drive."
            tape = "Explosive top-order threat. Deny them width early and attack the pads to disrupt their timing."
        else:
            pace = "Use back-of-a-length deliveries angling across the body. Invite the false drive."
            spin = "Deploy left-arm orthodox sliding across to restrict strike rotation and build dot pressure."
            tape = "Classical opener. Squeeze their scoring zones on the off-side and force aerial risks."
            
    elif "Finisher" in phase or "Death" in phase:
        if sr > 150:
            pace = "Commit fully to wide pace-off cutters dug into the pitch. Do not bowl at the stumps."
            spin = "Bowl flat darts aimed at the base of the stumps. Do not offer flight."
            tape = "Lethal lower-order hitter. Deny them the arc. Force them to reach for dipping slower balls."
        else:
            pace = "Bowl rapid back-of-a-length deliveries targeting the ribcage to cramp them for room."
            spin = "Keep the ball turning away from their hitting arc."
            tape = "Lower-order batter. Exploit their lack of footwork with aggressive body-line bowling."
            
    else: # Middle Order Anchors
        pace = "Deploy slow off-cutters gripping into the pitch outside the off-stump."
        spin = "Use high-quality wrist spin tossed up wide to invite the mistimed slog sweep."
        tape = "Middle-order anchor. Build dot-ball pressure with tight lines to force a frustrated lofted shot."

    # PROCEDURAL BOWLER TACTICS
    if role in ["Bowler", "All-Rounder"]:
        if econ < 7.5:
            bat = "Elite threat. Treat with immense respect. Focus on rotating the strike and attacking others."
            if role == "Bowler": tape = "Frontline strike bowler. See off their best spells and attack the weaker backups."
        elif econ > 9.0:
            bat = "Target this bowler aggressively. High economy rate suggests frequent loose boundary deliveries."
            if role == "Bowler": tape = "Vulnerable to aggressive intent. Look to disrupt their length early in the over."
        else:
            bat = "Play out their good deliveries on merit. Look to capitalize on the missed yorker at the death."
            if role == "Bowler": tape = "Solid squad bowler. Exploit their lack of raw pace with calculated aggression."
    else:
        bat = "Not a regular bowler. Focus purely on strike rotation if they are brought on."

    return pace, spin, bat, tape

def fix_all_tactics_offline():
    print(f"🚀 Booting up Offline Tactical Engine for {os.path.basename(CSV_PATH)}...")
    
    if not os.path.exists(CSV_PATH):
        print(f"🚨 Error: Could not find {CSV_PATH}")
        return
        
    if not os.path.exists(JSON_PATH):
        print(f"🚨 Error: Could not find {JSON_PATH}")
        return
        
    with open(JSON_PATH, 'r') as f:
        elite_db = json.load(f)
        
    df = pd.read_csv(CSV_PATH)
    elite_updates = 0
    procedural_updates = 0
    
    for idx, row in df.iterrows():
        p_name = str(row['Player_Name']).strip()
        full_name = str(row.get('Full_Name', '')).strip()
        
        # 1. Check the Elite JSON Database first
        match_found = False
        for elite_name, tactics in elite_db.items():
            if elite_name.lower() in p_name.lower() or elite_name.lower() in full_name.lower():
                df.at[idx, 'Clash_Pace_Tactic'] = tactics['pace']
                df.at[idx, 'Clash_Spin_Tactic'] = tactics['spin']
                df.at[idx, 'Batting_Against_Him_Tactic'] = tactics['bat_against']
                df.at[idx, 'Coach_Tape_Suggestion'] = tactics['tape']
                elite_updates += 1
                match_found = True
                break
                
        # 2. If they are an obscure player, run the Procedural Generator
        if not match_found:
            pace_curr = str(row.get('Clash_Pace_Tactic', ''))
            
            # Only overwrite if their current tactic is garbage/generic
            if is_generic(pace_curr):
                role = str(row.get('Role', 'Player'))
                phase = str(row.get('Primary_Batting_Phase', 'Middle Order'))
                sr = float(row.get('Overall_Bat_SR', 0))
                econ = float(row.get('Overall_Bowl_Econ', 9.0))
                
                dyn_pace, dyn_spin, dyn_bat, dyn_tape = procedural_tactic_generator(role, phase, sr, econ)
                
                df.at[idx, 'Clash_Pace_Tactic'] = dyn_pace
                df.at[idx, 'Clash_Spin_Tactic'] = dyn_spin
                df.at[idx, 'Batting_Against_Him_Tactic'] = dyn_bat
                df.at[idx, 'Coach_Tape_Suggestion'] = dyn_tape
                procedural_updates += 1

    df.to_csv(CSV_PATH, index=False)
    print(f"✅ SUCCESS! Offline Tactical overhaul complete.")
    print(f"🌟 Applied {elite_updates} perfect scout reports to Elite Superstars.")
    print(f"⚙️ Procedurally generated {procedural_updates} hyper-technical profiles for domestic/rookie players.")

if __name__ == "__main__":
    fix_all_tactics_offline()