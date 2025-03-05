import random
from datetime import datetime, timedelta

# ICI 약물 목록
ici_drugs = [
    {"drug_concept_id": 42920398, "drug_name": "Atezolizumab", "drug_name_dose": "20 ML atezolizumab 60 MG/ML Injectable Solution [TCENTRIQ]"},
    # {"drug_concept_id": 42922127, "drug_name": "Nivolumab", "drug_name_dose": "2 ML nivolumab 10 MG/ML Injectable Solution [Opdivo]"},
    # {"drug_concept_id": 42920744, "drug_name": "Nivolumab", "drug_name_dose": "10 ML nivolumab 10 MG/ML Injectable Solution [Opdivo]"}
]

# 간독성 약물 일부
liver_tox_drugs = [
    {"drug_concept_id": 1545998, "drug_name": "atorvastatin", "drug_name_dose": "atorvastatin 10 MG Oral Tablet [Lipitor]"},
    {"drug_concept_id": 42946810, "drug_name": "sunitinib", "drug_name_dose": "sunitinib 25 MG Oral Capsule [SUTENE]"},
    {"drug_concept_id": 42971929, "drug_name": "vancomycin", "drug_name_dose": "Vancomycin 1000 MG Injection [VANCOMYCIN HCI CJ]"},
    {"drug_concept_id": 42965904, "drug_name": "allopurinol", "drug_name_dose": "Allopurinol 100 MG Oral Tablet [YUYU ALLOPURINOL]"},
    {"drug_concept_id": 42925190, "drug_name": "tamoxifen", "drug_name_dose": "Tamoxifen 20 MG Oral Tablet [TAMOXIFEN KWANGDONG]"},
    {"drug_concept_id": 42921531, "drug_name": "vitamin a", "drug_name_dose": "5 ML Ascorbic Acid 100 MG/ML / dexpanthenol 5 MG/ML"},
    {"drug_concept_id": 42931443, "drug_name": "amitriptyline", "drug_name_dose": "VAmitriptyline 10 MG Oral Tablet [ENAFON]"}
]

# 비간독성 약물 일부
non_tox_drugs = [
    {"drug_concept_id": 42918176, "drug_name": "sodium chlorid", "drug_name_dose": "1000 ML Glucose 50 MG/ML / Potassium Chloride 2.24 MG/ML / Sodium Chloride 4.5 MG/ML Injectable Solution [DEXTROSE AND SOD CHLORIDE NA.K]"},
    {"drug_concept_id": 42920662, "drug_name": "ketamine", "drug_name_dose": "10 ML Ketamine 50 MG/ML Injectable Solution [HUONS KETAMINE HCL]"},
    {"drug_concept_id": 42941267, "drug_name": "hydroxyzine", "drug_name_dose": "Hydroxyzine 10 MG Oral Tablet [ADIPAM]"},
    {"drug_concept_id": 42920732, "drug_name": "L-Ornithine-L-", "drug_name_dose": "10 ML L-Ornithine-L-Aspartate 500 MG/ML Injectable Solution [HELPOVIN]"},
    {"drug_concept_id": 42929253, "drug_name": "pantoprazole", "drug_name_dose": "pantoprazole 40 MG Injection [PANTOLINE]"},
    {"drug_concept_id": 42918352, "drug_name": "glucose", "drug_name_dose": "1000 ML Calcium Chloride 0.2 MG/ML / Glucose 50 MG/ML / Lactate 6.1 MG/ML / Potassium Chloride 0.3 MG/ML / Sodium Chloride 6 MG/ML Injectable Solution [HARTMANN D CJ]"},
    {"drug_concept_id": 19123173, "drug_name": "pregabalin", "drug_name_dose": "pregabalin 75 MG Oral Capsule [Lyrica]"},
    {"drug_concept_id": 1332442, "drug_name": "amlodipine", "drug_name_dose": "amlodipine 10 MG Oral Tablet [Norvasc]"},
    {"drug_concept_id": 42922419, "drug_name": "morphine", "drug_name_dose": "1 ML Morphine 1 MG/ML Injectable Solution [BC MORPHINSULFATE]"}
    # {"drug_concept_id": , "drug_name": "", "drug_name_dose": ""},
    # {"drug_concept_id": , "drug_name": "", "drug_name_dose": ""}
]

all_drugs = ici_drugs + liver_tox_drugs + non_tox_drugs

# 데이터 생성
data = []
start_date = datetime(2019, 10, 1)
end_date = datetime(2020, 3, 28)
date = start_date
for i in range(200):
    patient_no = 1
    sub = 1
    # index_date = start_date + timedelta(days=random.randint(0, (end_date - start_date).days))
    # follow_end = index_date + timedelta(days=random.randint(365, 730))
    # index_lastdate = follow_end + timedelta(days=random.randint(5, 10))
    # visit_last_day = index_lastdate + timedelta(days=random.randint(5, 10))
    index_date = start_date
    follow_end = end_date - timedelta(days=8)
    index_lastdate = end_date
    visit_last_Day = end_date +timedelta(days=3)
    new_drug_exposure_date = date + timedelta(days=random.randint(0, 4))
    date = new_drug_exposure_date


    # new_drug_exposure_date = index_date + timedelta(days=random.randint(0, 5))
    day_num = (new_drug_exposure_date - start_date).days
    day = f"D{day_num}"
    
    drug = random.choice(all_drugs)
    ici_lasting = new_drug_exposure_date + timedelta(days=20) if drug["drug_name"] in ["Atezolizumab", "Nivolumab", "Pembrolizumab", "ipilimumab"] else 0
    sum_quantity = random.randint(1, 30)
    real_sum_days_supply = sum_quantity + random.randint(0, 5)
    liver_tox = 1 if drug["drug_name"] in [d["drug_name"] for d in ici_drugs + liver_tox_drugs] else 0
    non_tox = 1 - liver_tox if random.random() > 0.3 else 0
    daily = f"{sum_quantity}/{real_sum_days_supply}"
    cu_daily = daily
    measurement_date = new_drug_exposure_date 
    # grade = random.randint(1, 4) if liver_tox else random.randint(0, 1)
    grade = " "

    data.append([
        patient_no, sub, index_date.strftime("%Y-%m-%d"), follow_end.strftime("%Y-%m-%d"), 
        index_lastdate.strftime("%Y-%m-%d"), visit_last_Day.strftime("%Y-%m-%d"), 
        new_drug_exposure_date.strftime("%Y-%m-%d"), day, day_num, drug["drug_concept_id"], 
        drug["drug_name"], drug["drug_name_dose"], ici_lasting, sum_quantity, real_sum_days_supply, 
        liver_tox, non_tox, daily, cu_daily, measurement_date.strftime("%Y-%m-%d"), grade
    ])

# 열 이름
columns = ["patient_no", "sub", "index_date", "follow_end", "index_lastdate", "visit_last_Day", 
           "new_drug_exposure_date", "day", "day_num", "drug_concept_id", "drug_name", 
           "drug_name_dose", "ICI_lasting", "sum_quantity", "real_sum_days_supply", "liver_tox", 
           "non_tox", "daily", "cu_daily", "measurement_date", "grade"]

# TSV 형식으로 .txt 파일에 저장
with open("sample_drug_data.txt", "w", encoding="utf-8") as f:
    # 헤더 작성
    f.write("\t".join(columns) + "\n")
    # 데이터 행 작성
    for row in data:
        f.write("\t".join(str(x) for x in row) + "\n")

print("sample_drug_data.txt 파일이 생성되었습니다.")