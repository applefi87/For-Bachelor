"""
05_fix_data_leakage.py

為什麼需要這支：
  04 用的是隨機交叉驗證（cross_val_score 預設隨機分折）。
  但 PTB-XL 裡「同一個病人可能有多筆紀錄」。
  隨機分折時，同一個病人的 A 紀錄可能進訓練集、B 紀錄進測試集
  → 模型其實是「認得這個人」，不是「認得這個病」
  → AUC 會虛高，而且你不會發現。

  這叫「資料洩漏」(data leakage)，是生醫機器學習最常見的錯誤，
  也是審稿人和口試委員第一個會問的問題。

修正方式：
  PTB-XL 官方在 metadata 裡提供了 strat_fold 欄位（值 1–10），
  已經保證「同一病人的所有紀錄都在同一折」。用它來分折就安全了。

執行前提：03_features.py 已經跑完，且 features.csv 裡有 patient_id 與 strat_fold。
  → 如果沒有，先跑下面的 patch_metadata()，它會把這兩欄補回去。
"""
import os, ast
import numpy as np
import pandas as pd
import warnings
warnings.filterwarnings("ignore")

BASE = "https://physionet.org/files/ptb-xl/1.0.3/"
rng = np.random.default_rng(42)


def patch_metadata(path="features.csv"):
    """把 patient_id 與 strat_fold 補進 features.csv"""
    df = pd.read_csv(path)
    if {"patient_id", "strat_fold"}.issubset(df.columns):
        print("  已有 patient_id 與 strat_fold，跳過")
        return df
    print("  下載 metadata 以補上 patient_id / strat_fold ...")
    db = pd.read_csv(BASE + "ptbxl_database.csv", index_col="ecg_id")
    df = df.merge(db[["patient_id", "strat_fold"]],
                  left_on="ecg_id", right_index=True, how="left")
    df.to_csv(path, index=False)
    print("  已補上並存回 features.csv")
    return df


df = patch_metadata()
print(f"載入 {len(df)} 筆")

# ---------- 檢查洩漏的嚴重程度 ---------------------------------
n_rec = len(df)
n_pat = df.patient_id.nunique()
dup = n_rec - n_pat
print(f"\n紀錄數 {n_rec}，病人數 {n_pat}")
if dup > 0:
    print(f"  ⚠ 有 {dup} 筆是重複病人 → 隨機分折會洩漏，必須用 strat_fold")
else:
    print(f"  這批資料剛好一人一筆，本次洩漏風險低（但習慣要養成）")

# ---------- 準備資料 -------------------------------------------
meta_cols = ["ecg_id", "label", "age", "patient_id", "strat_fold"]
X = df.drop(columns=[c for c in meta_cols if c in df.columns])
X = X.select_dtypes(include=[np.number])
y = (df.label == "MI").astype(int).values
fold = df.strat_fold.values

print(f"特徵 {X.shape[1]} 個")

# ---------- 用 strat_fold 做分組交叉驗證 -------------------------
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import PredefinedSplit
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.metrics import roc_auc_score


def grouped_cv_auc(X, y, fold, n_rounds=1, shuffle_labels=False):
    """
    對每一個 strat_fold 輪流當測試集，其餘當訓練集。
    補值(imputer)放進 Pipeline，確保只用訓練集的統計量 → 不洩漏。
    """
    aucs = []
    for _ in range(n_rounds):
        yy = rng.permutation(y) if shuffle_labels else y
        for f in np.unique(fold):
            tr, te = fold != f, fold == f
            if len(np.unique(yy[te])) < 2 or te.sum() < 5:
                continue                       # 該折只有單一類別，跳過
            pipe = Pipeline([
                ("imp", SimpleImputer(strategy="median")),
                ("clf", RandomForestClassifier(n_estimators=300,
                                               random_state=0, n_jobs=-1)),
            ])
            pipe.fit(X[tr], yy[tr])
            p = pipe.predict_proba(X[te])[:, 1]
            aucs.append(roc_auc_score(yy[te], p))
    return np.array(aucs)


print("\n" + "=" * 58)
print("以 strat_fold 分折（同一病人不跨折）")
print("=" * 58)
auc = grouped_cv_auc(X.values, y, fold)
print(f"  AUC = {auc.mean():.3f} ± {auc.std():.3f}   （{len(auc)} 折）")

print("\n負對照（打亂標籤，重複 3 輪）")
auc0 = grouped_cv_auc(X.values, y, fold, n_rounds=3, shuffle_labels=True)
print(f"  AUC = {auc0.mean():.3f} ± {auc0.std():.3f}   （應接近 0.500）")

gap = auc.mean() - auc0.mean()
print(f"\n差距 = {gap:.3f}")
if gap > 0.10:
    print("  → 效果明顯，且不是洩漏造成的。這個結果站得住。")
elif gap > 0.03:
    print("  → 有效果但不強。單導程 + HRV/熵 抓不到 MI 的形態特徵，符合預期。")
else:
    print("  → 與隨機無異。這組特徵對 MI 無效——這是一個誠實且可寫的結論。")

print("""
可以拿去面試講的一句話：
「我一開始用隨機交叉驗證，後來發現 PTB-XL 同一病人可能有多筆紀錄，
  隨機分折會造成資料洩漏，所以改用資料集本身提供的 strat_fold 分組。
  修正後 AUC 從 X 降到 Y——這個差距就是洩漏的量。」

這段話比任何漂亮的數字更能證明你懂研究。
""")
