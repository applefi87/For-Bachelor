"""
06_look_at_data.py — 用眼睛看，不算數學

執行：uv run .\06_look_at_data.py
產出：compare_ecg.png      正常 vs 心肌梗塞的心電圖並排
      feature_dist.png     模型最看重的三個特徵，兩群人的分布

這一支不做任何新分析。它只是把 04 算出來的東西，變成你看得懂的圖。

要回答的問題：
  「模型說它靠 amp_ptp 分辨兩群人——那我自己看得出來嗎？」
"""
import os
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import wfdb
import warnings
warnings.filterwarnings("ignore")

BASE = "https://physionet.org/files/ptb-xl/1.0.3/"
N_SHOW = 3          # 每一類畫幾個人

df = pd.read_csv("features.csv")
print(f"載入 {len(df)} 筆")

# ---------------------------------------------------------------
# 圖一：特徵分布 —— 為什麼模型分得出來
# ---------------------------------------------------------------
# 04 說最有用的是 amp_ptp / amp_std / spec_ent。
# 這裡把這三個特徵畫成直方圖，兩群人疊在一起。
# 如果兩個分布重疊很多 -> 這個特徵只有一點點用
# 如果兩個分布分得開   -> 這個特徵很有用
TOP3 = ["amp_ptp", "amp_std", "spec_ent"]
TOP3 = [c for c in TOP3 if c in df.columns]

fig, axes = plt.subplots(1, len(TOP3), figsize=(5 * len(TOP3), 4))
if len(TOP3) == 1:
    axes = [axes]

for ax, col in zip(axes, TOP3):
    a = df.loc[df.label == "NORM", col].dropna()
    b = df.loc[df.label == "MI", col].dropna()
    bins = np.linspace(min(a.min(), b.min()), max(a.max(), b.max()), 30)
    ax.hist(a, bins=bins, alpha=0.6, label="NORM", color="#2e86c1")
    ax.hist(b, bins=bins, alpha=0.6, label="MI", color="#c0392b")
    ax.axvline(a.median(), color="#2e86c1", ls="--", lw=2)
    ax.axvline(b.median(), color="#c0392b", ls="--", lw=2)
    ax.set_title(f"{col}\nNORM中位數={a.median():.3f}  MI中位數={b.median():.3f}"
                 if False else
                 f"{col}\nNORM median={a.median():.3f}   MI median={b.median():.3f}")
    ax.set_xlabel(col)
    ax.legend()
    ax.grid(alpha=0.3)

fig.suptitle("Top features: do the two groups actually separate?", fontsize=13)
fig.tight_layout()
fig.savefig("feature_dist.png", dpi=110)
plt.close(fig)
print("已存 feature_dist.png")

for col in TOP3:
    a = df.loc[df.label == "NORM", col].dropna()
    b = df.loc[df.label == "MI", col].dropna()
    # Cohen's d：兩群平均差了幾個標準差。|d|<0.2 幾乎沒差，>0.8 差很多
    pooled = np.sqrt((a.var() + b.var()) / 2)
    d = (b.mean() - a.mean()) / pooled if pooled > 0 else 0
    print(f"  {col:10s}  Cohen's d = {d:+.2f}"
          f"   {'(幾乎沒差)' if abs(d)<0.2 else '(小)' if abs(d)<0.5 else '(中)' if abs(d)<0.8 else '(大)'}")

# ---------------------------------------------------------------
# 圖二：實際波形並排
# ---------------------------------------------------------------
print("\n下載幾筆原始波形來畫圖...")

need = {"patient_id", "strat_fold"}
meta_db = None
if "filename_lr" not in df.columns:
    meta_db = pd.read_csv(BASE + "ptbxl_database.csv", index_col="ecg_id")

def path_of(ecg_id):
    if meta_db is not None:
        return meta_db.loc[ecg_id, "filename_lr"]
    return df.loc[df.ecg_id == ecg_id, "filename_lr"].iloc[0]

picks = {}
for lab in ["NORM", "MI"]:
    sub = df[df.label == lab].head(N_SHOW)
    picks[lab] = list(sub.ecg_id)

fig, axes = plt.subplots(N_SHOW, 2, figsize=(14, 3 * N_SHOW), sharex=True, sharey=True)
for col_i, lab in enumerate(["NORM", "MI"]):
    color = "#2e86c1" if lab == "NORM" else "#c0392b"
    for row_i, eid in enumerate(picks[lab]):
        ax = axes[row_i, col_i]
        try:
            p = path_of(eid)
            sig, meta = wfdb.rdsamp(os.path.basename(p),
                                    pn_dir="ptb-xl/1.0.3/" + os.path.dirname(p))
            fs = meta["fs"]
            lead = meta["sig_name"].index("II") if "II" in meta["sig_name"] else 1
            s = sig[:, lead]
            t = np.arange(len(s)) / fs
            ax.plot(t, s, lw=0.8, color=color)
            ptp = float(np.ptp(s[~np.isnan(s)]))
            ax.set_title(f"{lab}  ecg_id={eid}   amp_ptp={ptp:.2f}", fontsize=10)
        except Exception as e:
            ax.text(0.5, 0.5, f"讀取失敗\n{type(e).__name__}", ha="center", va="center")
        ax.grid(alpha=0.3)

axes[-1, 0].set_xlabel("time (s)")
axes[-1, 1].set_xlabel("time (s)")
fig.suptitle("Lead II — NORM (left) vs MI (right), same y-scale", fontsize=13)
fig.tight_layout()
fig.savefig("compare_ecg.png", dpi=110)
plt.close(fig)
print("已存 compare_ecg.png")

print("""
=========================================================
現在打開這兩張圖，回答三個問題（寫在紙上，五分鐘）
=========================================================

看 feature_dist.png：
  1. 兩群人的分布，是「分得很開」還是「大量重疊」？
     （這會解釋為什麼 AUC 是 0.79 而不是 0.95）

看 compare_ecg.png：
  2. 你自己看得出左邊和右邊的差別嗎？
     （看不出來也是答案——那代表模型抓到的是你肉眼不易察覺的東西）

  3. 右邊那三個 MI 的波形，彼此像嗎？
     （如果差很多，代表「MI」其實不是一種長相，是很多種——
       這就是為什麼單一組特徵抓不乾淨）
""")