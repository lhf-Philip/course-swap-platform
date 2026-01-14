import pdfplumber
import re
from supabase import create_client, Client

# ================= 設定區 =================
# 請填入你的 Supabase URL 和 Service Role Key
SUPABASE_URL = "https://kbysmuukjvefsojxtsft.supabase.co"
SUPABASE_KEY = "sb_secret_M8YtiDIxvMAusBSt0e0RNw_8URyQE0z" # 必須是 Service Role

PDF_PATH = "timetable.pdf" # 請將你的 PDF 改名並放在同目錄

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def parse_and_import():
    print("🚀 開始解析 PDF...")
    
    lecturers_set = set()
    courses_map = {} # code -> title
    sections_list = []

    last_subject_code = None
    last_subject_title = None
    
    # 用來暫存同一個 Group 的多行時間 (例如 Lecture + Tutorial)
    # 這裡我們簡化邏輯：每一行 PDF 都當作一個 section 存入，
    # 這樣用戶選擇 "B01" 時，可能會看到多個選項 (Lecture B01, Tut B01)
    # 或者我們可以只存 Group ID。為了 Swap 準確性，建議存詳細。

    with pdfplumber.open(PDF_PATH) as pdf:
        for page_num, page in enumerate(pdf.pages):
            print(f"正在處理第 {page_num + 1} 頁...")
            
            # 提取表格
            tables = page.extract_table()
            
            if not tables:
                continue

            for row in tables:
                # row 是一個 list，對應 PDF 的 columns
                # 0: Subject Code, 1: Title, 2: Class, 3: Group, 4: Type
                # 5: Day, 6: Time, 7: Campus, 8: Venue, 9: Lecturer
                
                # 跳過標題行 (檢查是否有 'Subject Code')
                if row[0] and 'Subject' in str(row[0]):
                    continue
                
                # 1. 處理 Subject Code 合併儲存格問題
                subject_code = row[0]
                subject_title = row[1]
                
                if subject_code:
                    # 移除換行符
                    subject_code = subject_code.replace('\n', '').strip()
                    last_subject_code = subject_code
                
                if subject_title:
                    subject_title = subject_title.replace('\n', ' ').strip()
                    last_subject_title = subject_title
                
                # 如果這行沒有 Code 且沒有 Group，可能是無效行
                if not last_subject_code:
                    continue

                # 2. 提取 Group, Type, Time 等
                group = row[3]
                type_ = row[4]
                day = row[5]
                time = row[6]
                campus = row[7]
                venue = row[8]
                lecturer = row[9]

                # 過濾空行
                if not group or not day or not time:
                    continue

                # 清理數據
                group = group.replace('\n', '').strip()
                lecturer = lecturer.replace('\n', ' ').strip() if lecturer else "TBA"
                
                # 3. 收集數據
                lecturers_set.add(lecturer)
                courses_map[last_subject_code] = last_subject_title
                
                sections_list.append({
                    "course_code": last_subject_code,
                    "group": group,
                    "type": type_,
                    "day": day,
                    "time": time,
                    "campus": campus,
                    "venue": venue,
                    "lecturer_name": lecturer
                })

    print(f"解析完成！發現 {len(courses_map)} 門課, {len(sections_list)} 個課堂, {len(lecturers_set)} 位講師")
    
    # ================= 寫入資料庫 =================
    print("開始寫入 Lecturers...")
    # 批量插入講師
    lecturer_name_to_id = {}
    for name in lecturers_set:
        res = supabase.table("lecturers").upsert({"name": name}, on_conflict="name").execute()
        if res.data:
            lecturer_name_to_id[name] = res.data[0]['id']
            
    # 如果 upsert 沒有返回 data (有時發生)，重新查詢一次全部 ID
    if not lecturer_name_to_id:
        all_lecs = supabase.table("lecturers").select("id, name").execute()
        for l in all_lecs.data:
            lecturer_name_to_id[l['name']] = l['id']

    print("開始寫入 Courses...")
    for code, title in courses_map.items():
        supabase.table("courses").upsert(
            {"code": code, "title": title}, on_conflict="code"
        ).execute()

    print("開始寫入 Course Sections...")
    # 準備 section 數據，替換 lecturer_name 為 ID
    final_sections = []
    for sec in sections_list:
        lec_id = lecturer_name_to_id.get(sec['lecturer_name'])
        final_sections.append({
            "course_code": sec['course_code'],
            "group": sec['group'],
            "type": sec['type'],
            "day": sec['day'],
            "time": sec['time'],
            "campus": sec['campus'],
            "venue": sec['venue'],
            "lecturer_id": lec_id
        })
    
    # 分批寫入避免 timeout (每次 100 筆)
    batch_size = 100
    for i in range(0, len(final_sections), batch_size):
        batch = final_sections[i:i+batch_size]
        supabase.table("course_sections").insert(batch).execute()
        print(f"已寫入 {i + len(batch)} / {len(final_sections)}")

    print("🎉 真實數據導入成功！")

if __name__ == "__main__":
    parse_and_import()