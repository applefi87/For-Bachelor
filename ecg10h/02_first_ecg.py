"""
02_first_ecg.py — 讀一筆真實心電圖，畫出來
執行：python 02_first_ecg.py
產出：first_ecg.png（原始 12 導程）、first_ecg_peaks.png（濾波後 + R 波標記）

這是第一個成就感點。看到那張圖之後，你手上的是一個真實病人的心跳。
"""
import wfdb
import numpy as np
import matplotlib
matplotlib.use("Agg")            # 不開視窗，直接存檔
import matplotlib.pyplot as plt
import neurokit2 as nk

REC = "00001_lr"
PN_DIR = "ptb-xl/1.0.3/records100/00000"

print("讀取中...")
sig, meta = wfdb.rdsamp(REC, pn_dir=PN_DIR)
fs = meta["fs"]
names = meta["sig_name"]
print(f"  取樣率 {fs} Hz，{sig.shape[1]} 導程，{sig.shape[0]/fs:.0f} 秒")

# ---- 圖一：12 導程全貌 ----------------------------------------
t = np.arange(sig.shape[0]) / fs
fig, axes = plt.subplots(12, 1, figsize=(12, 16), sharex=True)
for i, ax in enumerate(axes):
    ax.plot(t, sig[:, i], lw=0.7, color="#1f4e79")
    ax.set_ylabel(names[i], rotation=0, ha="right", va="center", fontsize=9)
    ax.grid(alpha=0.3)
axes[-1].set_xlabel("時間 (秒)" if False else "time (s)")
fig.suptitle(f"PTB-XL record {REC} — 12-lead ECG", fontsize=13)
fig.tight_layout()
fig.savefig("first_ecg.png", dpi=110)
plt.close(fig)
print("  已存 first_ecg.png")

# ---- 圖二：Lead II 濾波 + R 波偵測 -----------------------------
# Lead II 是臨床上看心律最常用的導程
lead = names.index("II") if "II" in names else 1
raw = sig[:, lead]

clean = nk.ecg_clean(raw, sampling_rate=fs)
_, info = nk.ecg_peaks(clean, sampling_rate=fs)
peaks = info["ECG_R_Peaks"]

print(f"  在 Lead {names[lead]} 上偵測到 {len(peaks)} 個 R 波")
if len(peaks) > 1:
    rr = np.diff(peaks) / fs
    print(f"  平均心率 {60/rr.mean():.1f} bpm，RR 間期標準差 {rr.std()*1000:.1f} ms")

fig, axes = plt.subplots(2, 1, figsize=(13, 6), sharex=True)
axes[0].plot(t, raw, lw=0.8, color="#999")
axes[0].set_title(f"raw — lead {names[lead]}")
axes[0].grid(alpha=0.3)

axes[1].plot(t, clean, lw=0.8, color="#1f4e79")
axes[1].plot(peaks / fs, clean[peaks], "v", color="#c0392b", ms=8, label="R peak")
axes[1].set_title("cleaned + R-peak detection")
axes[1].set_xlabel("time (s)")
axes[1].legend()
axes[1].grid(alpha=0.3)

fig.tight_layout()
fig.savefig("first_ecg_peaks.png", dpi=110)
plt.close(fig)
print("  已存 first_ecg_peaks.png")

print("\n打開這兩張 PNG 看看。")
print("如果 R 波的紅色三角形都落在尖峰上，代表偵測是對的。")
print("\n下一步：python 03_features.py")
