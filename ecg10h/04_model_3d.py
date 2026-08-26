"""
04_model_3d.py — 分類器 + 負對照 + 可旋轉 3D 圖
執行：python 04_model_3d.py
產出：ecg_3d.html（用瀏覽器打開，可以用滑鼠轉）、feature_importance.png

這一步會回答三件事：
  1. 這些數字能不能分辨正常和心肌梗塞？
  2. 這個結果是真的，還是隨機也能做到？   <- 負對照，很多人漏掉
  3. 把高維特徵壓成 3 維之後，長什麼樣子？
"""
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.metrics import roc_auc_score
import warnings
warnings.filterwarnings("ignore")

rng = np.random.default_rng(42)

# ---------- 1. 載入 ----------------------------------------------
df = pd.read_csv("features.csv")
print(f"載入 {len(df)} 筆")

meta_cols = ["ecg_id", "label", "age"]
X = df.drop(columns=[c for c in meta_cols if c in df.columns])
X = X.select_dtypes(include=[np.number]).fillna(X.median(numeric_only=True)).fillna(0)
y = (df.label == "MI").astype(int).values

print(f"特徵 {X.shape[1]} 個：{list(X.columns)}")
print(f"標籤分佈：NORM {int((y==0).sum())}, MI {int((y==1).sum())}")

cv = StratifiedKFold(5, shuffle=True, random_state=0)
clf = lambda: RandomForestClassifier(n_estimators=300, random_state=0, n_jobs=-1)

# ---------- 2. 真實表現 ------------------------------------------
print("\n" + "=" * 55)
print("問題 1：這些數字能分辨兩類嗎？")
print("=" * 55)
acc = cross_val_score(clf(), X, y, cv=cv, scoring="accuracy")
auc = cross_val_score(clf(), X, y, cv=cv, scoring="roc_auc")
print(f"  accuracy = {acc.mean():.3f} ± {acc.std():.3f}")
print(f"  AUC      = {auc.mean():.3f} ± {auc.std():.3f}")

# ---------- 3. 負對照 --------------------------------------------
print("\n" + "=" * 55)
print("問題 2：把標籤打亂，還能做到嗎？（負對照）")
print("=" * 55)
print("  如果打亂後的分數也很高，代表上面的結果是假的。")

shuf_auc = []
for i in range(5):
    y_s = rng.permutation(y)
    shuf_auc.append(cross_val_score(clf(), X, y_s, cv=cv, scoring="roc_auc").mean())
shuf_auc = np.array(shuf_auc)
print(f"  打亂標籤 AUC = {shuf_auc.mean():.3f} ± {shuf_auc.std():.3f}   （應該接近 0.5）")

gap = auc.mean() - shuf_auc.mean()
print(f"\n  差距 = {gap:.3f}")
if gap > 0.10:
    print("  → 真實結果明顯優於隨機。這個訊號是真的。")
elif gap > 0.03:
    print("  → 有效果但不強。特徵可能不夠，或這兩類本來就不好分。")
else:
    print("  → 和隨機沒差別。這組特徵抓不到差異——這也是一個結論。")

# ---------- 4. 哪些特徵有用 ---------------------------------------
m = clf().fit(X, y)
imp = pd.Series(m.feature_importances_, index=X.columns).sort_values()
fig, ax = plt.subplots(figsize=(8, max(4, len(imp) * 0.32)))
ax.barh(imp.index, imp.values, color="#1f4e79")
ax.set_xlabel("importance")
ax.set_title("which features carry the signal")
fig.tight_layout()
fig.savefig("feature_importance.png", dpi=110)
plt.close(fig)
print(f"\n最有用的三個特徵：{list(imp.index[::-1][:3])}")
print("  已存 feature_importance.png")

# ---------- 5. 3D 圖 ---------------------------------------------
print("\n" + "=" * 55)
print("問題 3：壓成三維長什麼樣子")
print("=" * 55)
print("  UMAP 第一次跑會編譯，約 10–20 秒，之後很快。")

import umap
Z = (X - X.mean()) / (X.std() + 1e-9)
emb = umap.UMAP(n_components=3, n_neighbors=15, min_dist=0.1,
                random_state=0).fit_transform(Z)

# 量化分群品質
from sklearn.metrics import silhouette_score
sil = silhouette_score(emb, y)
sil_shuf = silhouette_score(emb, rng.permutation(y))
print(f"  silhouette（真標籤）  = {sil:.3f}")
print(f"  silhouette（打亂標籤）= {sil_shuf:.3f}")
print("  ↑ 圖看起來有分群不代表真的有分群，這兩個數字才是證據")

import plotly.graph_objects as go
fig = go.Figure()
for lab, name, color in [(0, "NORM", "#2e86c1"), (1, "MI", "#c0392b")]:
    m_ = y == lab
    fig.add_trace(go.Scatter3d(
        x=emb[m_, 0], y=emb[m_, 1], z=emb[m_, 2],
        mode="markers", name=name,
        marker=dict(size=4, color=color, opacity=0.75),
        text=[f"ecg_id {i}" for i in df.ecg_id[m_]],
        hovertemplate="%{text}<extra>" + name + "</extra>",
    ))
fig.update_layout(
    title=f"PTB-XL — UMAP 3D  (AUC={auc.mean():.3f}, silhouette={sil:.3f})",
    scene=dict(xaxis_title="UMAP-1", yaxis_title="UMAP-2", zaxis_title="UMAP-3"),
    template="plotly_dark", height=780,
)
fig.write_html("ecg_3d.html")
print("\n  已存 ecg_3d.html —— 用瀏覽器打開，滑鼠可以拖曳旋轉")

print("\n" + "=" * 55)
print("跑完了。")
print("=" * 55)
print("""
現在真正的測試開始。試著改一個東西，看你想不想改：

  · 03_features.py 裡把 N_PER_CLASS 從 150 改成 500，會更準嗎？
  · 04 裡把 lead II 換成別的導程（改 03 的 lead 那行），差多少？
  · 挑別的疾病類別（NORM vs STTC / CD / HYP，改 03 的 mi 那行）
  · 拿掉熵特徵只留 HRV，AUC 掉多少？反過來呢？
  · UMAP 的 n_neighbors 從 15 改成 5 或 50，圖的形狀怎麼變？

想改 → 那就是答案。
不想改 → 那也是答案。
""")
