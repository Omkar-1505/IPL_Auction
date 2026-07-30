import os
import pandas as pd
import json
import time
from google import genai
from google.genai import types
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "players.csv")

def run_accurate_ai_enrichment():
    print("🚀 Booting up the High-Accuracy AI Enricher (New GenAI SDK Version)...")
    
    # 1. Load API Key
    load_dotenv()
    API_KEY = os.environ.get("GEMINI_API_KEY")
    if not API_KEY:
        print("🚨 Error: GEMINI_API_KEY not found in your .env file.")
        return

    # 2. Configure the BRAND NEW Google GenAI Client
    client = genai.Client(api_key=API_KEY)
    
    # Google has upgraded all free-tier endpoints to 3.5-flash
    active_model_name = 'gemini-3.5-flash'
    print(f"✅ Targeting Active Model: {active_model_name}")

    # 3. Load the CSV File
    if not os.path.exists(CSV_PATH):
        print(f"🚨 Error: Could not find '{os.path.basename(CSV_PATH)}' in {BASE_DIR}")
        return
        
    df = pd.read_csv(CSV_PATH)
    
    # Ensure our target columns exist
    for col in ['Full_Name', 'Country', 'Team']:
        if col not in df.columns:
            df.insert(len(df.columns), col, '')
            
    # --- SMART FILTER: Only target players missing data! ---
    # FIX: Added 'Not in Current Squad' and 'Unknown' Country to catch ALL missing players
    mask = (
        (df['Team'] == 'Unattached') | 
        (df['Team'] == 'Not in Current Squad') |
        (df['Country'] == 'Unknown') |
        (df['Full_Name'] == '') | 
        (df['Full_Name'].isna()) | 
        (df['Full_Name'] == df['Player_Name'])
    )
    missing_df = df[mask]
    
    total_missing = len(missing_df)
    print(f"📂 Loaded {len(df)} total players. Only {total_missing} need AI enrichment!")
    
    if total_missing == 0:
        print("🎉 ALL PLAYERS ARE ENRICHED! No need to run the AI.")
        return

    # 4. Process in SMALLER Batches of 5
    batch_size = 5
    updates_made = 0
    
    for i in range(0, total_missing, batch_size):
        # Get the current batch of rows from the missing data
        batch = missing_df.iloc[i:i+batch_size]
        names_to_search = batch['Player_Name'].astype(str).tolist()
        
        print(f"\n⏳ Processing Batch {i//batch_size + 1}/{(total_missing//batch_size) + 1}...")
        
        # --- THE ANTI-HALLUCINATION PROMPT ---
        prompt = f"""
        You are an elite, highly accurate Cricket Data Validator. 
        I will provide a list of T20/IPL cricket player short names.
        For each, provide:
        1. Their full real name.
        2. Their national cricket team / Country.
        3. The LAST IPL Franchise that bought them or that they played for. If they never played IPL, output "Unattached".

        ANTI-HALLUCINATION RULES (CRITICAL):
        - The Full Name MUST logically match the short name's initials. 
        - Example 1: 'L Wood' MUST be 'Luke Wood'. It CANNOT be 'Mark Wood'. 
        - Example 2: 'SM Curran' MUST be 'Sam Curran'. 'TK Curran' MUST be 'Tom Curran'.
        - If you are not 100% sure of the player based on the initial, return the exact short name back as the full name. Do not guess the wrong player.

        Return ONLY a valid JSON object mapping the exact input string to the data. Do NOT wrap in markdown like ```json.
        
        Example format:
        {{
            "L Wood": {{"full_name": "Luke Wood", "country": "England", "team": "Mumbai Indians"}},
            "V Kohli": {{"full_name": "Virat Kohli", "country": "India", "team": "Royal Challengers Bengaluru"}}
        }}
        
        Input Names:
        {json.dumps(names_to_search)}
        """
        
        # API Call with Smart Exponential Backoff Timer
        attempt = 0
        wait_time = 10 # Start with a 10-second wait
        
        while True:
            attempt += 1
            try:
                # Using the new SDK syntax to enforce strict JSON and 0.0 temperature
                response = client.models.generate_content(
                    model=active_model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.0,
                        response_mime_type="application/json"
                    )
                )
                
                # Parse the AI's JSON
                clean_text = response.text.replace("```json", "").replace("```", "").strip()
                parsed_data = json.loads(clean_text)
                
                # Map the answers back to the original DataFrame using the index
                for idx, row in batch.iterrows():
                    p_name = str(row['Player_Name'])
                    if p_name in parsed_data:
                        ai_data = parsed_data[p_name]
                        df.at[idx, 'Full_Name'] = ai_data.get('full_name', p_name)
                        df.at[idx, 'Country'] = ai_data.get('country', 'Unknown')
                        df.at[idx, 'Team'] = ai_data.get('team', 'Unattached')
                        updates_made += 1
                        
                # Save progress after every successful batch
                df.to_csv(CSV_PATH, index=False)
                print(f"  ✅ Batch saved! (Total updated this session: {updates_made})")
                
                # FREE TIER COOLDOWN: 5 seconds between successful requests
                time.sleep(5)
                break 
                
            except Exception as e:
                error_message = str(e).lower()
                if '503' in error_message or 'unavailable' in error_message or 'overloaded' in error_message:
                    print(f"  ⚠️ Server Overloaded (503). Backing off for {wait_time} seconds...")
                    time.sleep(wait_time)
                    wait_time = min(wait_time * 2, 60) # Exponential backoff: 10s -> 20s -> 40s -> capped at 60s
                elif '429' in error_message or 'quota' in error_message or 'exhausted' in error_message:
                    print(f"  ⚠️ Rate Limit hit (429). Gemini is cooling down for 60 seconds...")
                    time.sleep(60)
                else:
                    print(f"  🚨 Error on attempt {attempt}: {e}")
                    time.sleep(5)
                    if attempt >= 5:
                        print("  ❌ Skipping this batch after 5 unknown critical failures.")
                        break

    # Final Save
    df.to_csv(CSV_PATH, index=False)
    print("\n🎉 ENRICHMENT COMPLETE!")
    print(f"💾 Successfully processed and saved data for {updates_made} players inside {os.path.basename(CSV_PATH)}.")

if __name__ == "__main__":
    run_accurate_ai_enrichment()