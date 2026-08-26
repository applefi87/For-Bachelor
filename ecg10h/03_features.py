"""
03_features.py — 抽特徵
執行：python 03_features.py
產出：features.csv

做什麼：從 PTB-XL 挑出「正常」與「心肌梗塞」各 N 筆，
        對每一筆算出一組數字（心率變異度 + 熵指標），存成表格。

這一步最花時間（多半在等網路）。可以放著去做別的事。
中途斷掉沒關係，再跑一次會從上次的進度接續。
"""
import os, ast, time
import numpy as np
import pandas as pd
import wfdb
import neurokit2 as nk
import antropy as ant
import warnings
warnings.filterwarnings("ignore")

BASE = "https://physionet.org/files/ptb-xl/1.0.3/"
N_PER_CLASS = 150          # 想快一點就改小，例如 50
OUT = "features.csv"

# ---------- 1. 讀 metadata --------------------------------------
print("下載 metadata（約 20 MB，只需一次）...")
db = pd.read_csv(BASE + "ptbxl_database.csv", index_col="ecg_id")
scp = pd.read_csv(BASE + "scp_statements.csv", index_col=0)
scp = scp[scp.diagnostic == 1]
print(f"  共 {len(db)} 筆紀錄")

db.scp_codes = db.scp_codes.apply(ast.literal_eval)

def superclass(codes):
    out = set()
    for k in codes:
        if k in scp.index:
            out.add(scp.loc[k].diagnostic_class)
    return out

db["dx"] = db.scp_codes.apply(superclass)

# 只留「單純正常」和「單純心肌梗塞」，避免多重診斷混淆
norm = db[db.dx == {"NORM"}].head(N_PER_CLASS)
mi   = db[db.dx == {"MI"}].head(N_PER_CLASS)
sel  = pd.concat([norm, mi])
sel["label"] = ["NORM"] * len(norm) + ["MI"] * len(mi)
print(f"  選出 NORM {len(norm)} 筆、MI {len(mi)} 筆")

# ---------- 2. 續跑機制 -----------------------------------------
done = set()
if os.path.exists(OUT):
    prev = pd.read_csv(OUT)
    done = set(prev.ecg_id)
    print(f"  發現既有進度：已完成 {len(done)} 筆，接續進行")

# ---------- 3. 特徵函式 -----------------------------------------
def extract(sig1d, fs):
    """把一段訊號變成一組數字"""
    f = {}
    clean = nk.ecg_clean(sig1d, sampling_rate=fs)
    _, info = nk.ecg_peaks(clean, sampling_rate=fs)
    peaks = info["ECG_R_Peaks"]
    f["n_beats"] = len(peaks)

    if len(peaks) > 3:
        hrv = nk.hrv_time(peaks, sampling_rate=fs, show=False)
        for c in ["HRV_MeanNN", "HRV_SDNN", "HRV_RMSSD", "HRV_pNN50", "HRV_CVNN"]:
            if c in hrv.columns:
                v = hrv[c].iloc[0]
                f[c] = float(v) if np.isfinite(v) else np.nan
        rr = np.diff(peaks) / fs
        f["hr_mean"] = 60.0 / rr.mean() if rr.mean() > 0 else np.nan

    # 波形本身的統計與複雜度
    f["amp_std"]  = float(np.std(sig1d))
    f["amp_ptp"]  = float(np.ptp(sig1d))
    f["samp_ent"] = float(ant.sample_entropy(sig1d))
    f["perm_ent"] = float(ant.perm_entropy(sig1d, normalize=True))
    f["spec_ent"] = float(ant.spectral_entropy(sig1d, sf=fs, method="welch", normalize=True))
    f["hjorth_mob"], f["hjorth_comp"] = ant.hjorth_params(sig1d)
    return f

# ---------- 4. 主迴圈 -------------------------------------------
rows, t0, fails = [], time.time(), 0

for n, (ecg_id, r) in enumerate(sel.iterrows(), 1):
    if ecg_id in done:
        continue
    path = r.filename_lr                      # e.g. records100/00000/00001_lr
    pn_dir = "ptb-xl/1.0.3/" + os.path.dirname(path)
    rec = os.path.basename(path)

    try:
        sig, meta = wfdb.rdsamp(rec, pn_dir=pn_dir)
        fs = meta["fs"]
        lead = meta["sig_name"].index("II") if "II" in meta["sig_name"] else 1
        f = extract(sig[:, lead], fs)
        f["ecg_id"] = ecg_id
        f["label"] = r.label
        f["age"] = r.age
        rows.append(f)
    except Exception as e:
        fails += 1
        print(f"  [{n}/{len(sel)}] {ecg_id} 失敗：{type(e).__name__}")
        continue

    if n % 10 == 0:
        el = time.time() - t0
        print(f"  [{n}/{len(sel)}] 已完成，耗時 {el:.0f}s，"
              f"預估剩餘 {el/max(n,1)*(len(sel)-n):.0f}s", flush=True)
        # 每 10 筆存一次，斷了不會全部白做
        df = pd.DataFrame(rows)
        if os.path.exists(OUT):
            df = pd.concat([pd.read_csv(OUT), df], ignore_index=True)
        df.to_csv(OUT, index=False)
        rows = []

# 收尾
if rows:
    df = pd.DataFrame(rows)
    if os.path.exists(OUT):
        df = pd.concat([pd.read_csv(OUT), df], ignore_index=True)
    df.to_csv(OUT, index=False)

final = pd.read_csv(OUT)
print(f"\n完成。{OUT} 共 {len(final)} 筆，{final.shape[1]} 欄，失敗 {fails} 筆")
print(f"標籤分佈：\n{final.label.value_counts().to_string()}")
print("\n用 Excel 打開 features.csv 看看。每一列是一個病人，每一欄是一個數字。")
print("\n下一步：python 04_model_3d.py")
