import pdfplumber
import re
from supabase import create_client, Client

# ================= 設定區 =================
# 請填入你的 Supabase URL 和 Service Role Key
SUPABASE_URL = "https://kbysmuukjvefsojxtsft.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtieXNtdXVranZlZnNvanh0c2Z0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM4Nzc3NSwiZXhwIjoyMDgzOTYzNzc1fQ.wG1oPi3INzV1eOiLfDQ7iDkNCqjYoWDTQIamRfa-Ygc" # 必須是 Service Role Secret Key (不是 anon)
PDF_PATH = "timetable.pdf"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def parse_and_import():
    print("🚀 開始智能解析 PDF (V3 - Hierarchy Support)...")
    
    lecturers_set = set()
    courses_map = {} 
    sections_list = []

    # 狀態記憶變數
    last_subject_code = None
    last_subject_title = None
    last_main_group = None # 記住最近的 Lecture Group (e.g., "201")

    with pdfplumber.open(PDF_PATH) as pdf:
        for page_num, page in enumerate(pdf.pages):
            print(f"處理第 {page_num + 1} 頁...")
            tables = page.extract_table()
            if not tables: continue

            for row in tables:
                # 假設 Column 結構 (根據你的截圖):
                # 0: Subject Code (BHMH1041)
                # 1: Title
                # 2: Class (A, B, C)  <-- 這很重要
                # 3: Group (201, B01) <-- 這也很重要
                # 4: Type (Lect, Tut)
                # 5: Day, 6: Time...
                
                # 跳過標題
                if row[0] and 'Subject' in str(row[0]): continue
                
                # 1. Subject Code 處理 (處理跨行合併)
                raw_code = row[0]
                if raw_code:
                    clean_code = raw_code.replace('\n', '').strip()
                    if len(clean_code) > 3: 
                        last_subject_code = clean_code
                        last_main_group = None # 換課了，重置 Group
                
                if row[1]:
                    courses_map[last_subject_code] = row[1].replace('\n', ' ').strip()

                if not last_subject_code: continue

                # 2. 提取關鍵欄位
                raw_class = row[2].replace('\n', '').strip() if row[2] else ""
                raw_group = row[3].replace('\n', '').strip() if row[3] else ""
                type_ = row[4].replace('\n', '').strip() if row[4] else ""
                
                day = row[5]
                time = row[6]
                campus = row[7]
                venue = row[8]
                lecturer = row[9]

                if not day or not time: continue # 沒有時間的行跳過

                # 3. 核心邏輯：組合 Group ID
                final_group_id = ""
                
                # 情況 A: 這一行有 Group (通常是 Lecture 或 獨立的 Tutorial B01)
                if raw_group:
                    last_main_group = raw_group # 更新記憶
                    final_group_id = raw_group
                
                # 情況 B: 這一行沒有 Group，只有 Class (通常是 Tutorial A, B)
                # 必須依賴上一個 Lecture 的 Group
                elif raw_class and last_main_group:
                    final_group_id = f"{last_main_group}-{raw_class}" # 變成 "201-A"
                
                # 情況 C: 只有 Class，沒有主 Group (防呆)
                elif raw_class:
                    final_group_id = raw_class
                
                # 情況 D: 什麼都沒有，可能是 Lecture 的第二個時間段
                elif last_main_group:
                    final_group_id = last_main_group
                else:
                    continue # 無法辨識，跳過

                # 4. 構建顯示字串 (Type)
                # 如果是 Tut A，Type 欄位最好顯示 "Tut A"
                final_type = type_
                if raw_class:
                    final_type = f"{type_} {raw_class}"

                lecturer = lecturer.replace('\n', ' ').strip() if lecturer else "TBA"
                lecturers_set.add(lecturer)

                sections_list.append({
                    "course_code": last_subject_code,
                    "group": final_group_id, # 這會存入 "201" 或 "201-A"
                    "type": final_type,      
                    "day": day,
                    "time": time,
                    "campus": campus,
                    "venue": venue,
                    "lecturer_name": lecturer
                })

    print(f"解析完成！發現 {len(courses_map)} 門課, {len(sections_list)} 個課堂")

    # ================= 寫入 DB =================
    print("清除舊數據 (Swap Requests & Course Sections)...")
    # 注意：這裡會刪除所有現有的 Swap Requests，因為它們依賴於舊的 Section ID
    try:
        supabase.table("swap_requests").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        supabase.table("course_sections").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    except Exception as e:
        print("清除數據時發生錯誤 (可能是第一次運行):", e)

    print("寫入講師...")
    lecturer_name_to_id = {}
    for name in lecturers_set:
        res = supabase.table("lecturers").upsert({"name": name}, on_conflict="name").execute()
        if res.data: lecturer_name_to_id[name] = res.data[0]['id']
    
    # 補救 upsert 沒回傳 data 的情況
    if len(lecturer_name_to_id) < len(lecturers_set):
        all_lecs = supabase.table("lecturers").select("id,name").execute()
        for l in all_lecs.data: lecturer_name_to_id[l['name']] = l['id']

    print("寫入課程...")
    for code, title in courses_map.items():
        supabase.table("courses").upsert({"code": code, "title": title}, on_conflict="code").execute()

    print("寫入課堂 (Sections)...")
    final_sections = []
    for sec in sections_list:
        final_sections.append({
            "course_code": sec['course_code'],
            "group": sec['group'],
            "type": sec['type'],
            "day": sec['day'],
            "time": sec['time'],
            "campus": sec['campus'],
            "venue": sec['venue'],
            "lecturer_id": lecturer_name_to_id.get(sec['lecturer_name'])
        })
    
    batch_size = 100
    for i in range(0, len(final_sections), batch_size):
        supabase.table("course_sections").insert(final_sections[i:i+batch_size]).execute()
        print(f"已寫入 {min(i+batch_size, len(final_sections))} / {len(final_sections)}")

    print("🎉 Done!")

if __name__ == "__main__":
    parse_and_import()
