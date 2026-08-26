"""
01_check.py — 環境與網路檢查
執行：python 01_check.py
預期：五分鐘內看到「全部通過」或明確的失敗原因
"""
import sys

print("=" * 60)
print("步驟 1／4：檢查環境")
print("=" * 60)

print(f"\nPython 版本：{sys.version.split()[0]}")
if sys.version_info < (3, 9):
    print("  ✗ 版本太舊，請裝 Python 3.11")
    sys.exit(1)
print("  ✓ 版本可用")

print("\n檢查套件：")
missing = []
for name, mod in [
    ("wfdb", "wfdb"),
    ("neurokit2", "neurokit2"),
    ("antropy", "antropy"),
    ("umap-learn", "umap"),
    ("plotly", "plotly"),
    ("scikit-learn", "sklearn"),
    ("pandas", "pandas"),
    ("matplotlib", "matplotlib"),
]:
    try:
        __import__(mod)
        print(f"  ✓ {name}")
    except ImportError:
        print(f"  ✗ {name}  <- 缺少")
        missing.append(name)

if missing:
    print(f"\n請執行：pip install {' '.join(missing)}")
    sys.exit(1)

# ---------------------------------------------------------------
print("\n" + "=" * 60)
print("檢查能否連上 PhysioNet")
print("=" * 60)

import wfdb

print("\n嘗試直接串流一筆心電圖（不用先下載整包資料）...")
print("  資料集：PTB-XL 1.0.3，第一筆紀錄，100Hz 版本")

try:
    sig, meta = wfdb.rdsamp("00001_lr", pn_dir="ptb-xl/1.0.3/records100/00000")
    print(f"\n  ✓ 成功讀到訊號")
    print(f"    形狀：{sig.shape}  （取樣點數 × 導程數）")
    print(f"    取樣率：{meta['fs']} Hz")
    print(f"    導程：{meta['sig_name']}")
    print(f"    長度：{sig.shape[0] / meta['fs']:.0f} 秒")
except Exception as e:
    print(f"\n  ✗ 連線失敗：{type(e).__name__}: {e}")
    print("\n  可能原因：")
    print("    1. 網路不通 / 公司防火牆擋住 physionet.org")
    print("       → 換家裡或手機熱點再試一次")
    print("    2. PhysioNet 暫時性問題 → 過幾分鐘再試")
    print("\n  如果串流一直不行，可以改成先下載整包資料，")
    print("  跟我說一聲，我給你離線版本的腳本。")
    sys.exit(1)

print("\n" + "=" * 60)
print("全部通過。可以跑 02_first_ecg.py 了。")
print("=" * 60)
