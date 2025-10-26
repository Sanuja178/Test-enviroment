# PHS1022 IDEAS — Double Slit + Mesh Analysis
# By Gurjot Barring - Edited 21/10/2025
import numpy as np
import matplotlib.pyplot as plt
import monashspa.PHS1011 as spa

# ---------- CONSTANTS & UNCERTAINTIES ----------
lam = 0.000532  # mm (532.0 nm)
u_lam = 0.0000005  # mm (±0.5 nm)
u_pos = 1.0  # mm (spot tracing + parallax)
u_L = 0.5  # mm (screen distance)

# ---------- DATA ----------
# Double-slit: [L_mm, y1, y2, y3, y4, y5]
ds_rows = np.array([
    [858, 5, 10, 14, 18, 28],
    [765, 4, 8, 12, 16, 25],
    [672, 3, 6, 10, 14, 22],
    [579, 2, 5, 8, 11, 16],
    [486, 2, 4, 7, 10, 13],
], dtype=float)

# Mesh (one principal axis): [L_mm, x1, x2, x3, x4, x5, x6]
# We use the observed index s = 1,2,3,... (no relabelling)
mesh_rows = np.array([
    [889, 4, 8, 15, 20, 27.5, 30.5],
    [723, 3, 6.5, 13, 16, 22, 25 ],
    [478, 2, 4, 8, 10.5, 14, 15.5],
    [338, 1.5, 3, 6, 7, 10.5, 11 ],
], dtype=float)

# ---------- HELPERS ----------
def linfit_xy(X, Y, uY):
    fit = spa.linear_fit(X, Y, u_y=uY)  # Y = s X + b
    p = spa.get_fit_parameters(fit)
    return fit, p["slope"], p["u_slope"], p["intercept"], p["u_intercept"]

def wmean(vals, uvals):
    w = 1.0/np.square(uvals)
    mu = np.sum(w*vals)/np.sum(w)
    u = np.sqrt(1.0/np.sum(w))
    return mu, u

def mean_adjacent_spacing(x_mm):
    x = np.sort(np.asarray(x_mm, float))
    diffs = np.diff(x)
    if len(diffs) == 0:
        return np.nan, np.nan
    dx = np.mean(diffs)
    # standard error of the mean (unweighted) as a simple u(Δx)
    u_dx = (np.std(diffs, ddof=1)/np.sqrt(len(diffs))) if len(diffs) > 1 else np.nan
    return dx, u_dx

# ================================================================
# 1) VERIFY SCALING: Mesh Δx vs L on a log–log plot → slope ≈ +1
# ================================================================
L_list, dx_list = [], []
print("\n--- Mesh Δx vs L (log–log scaling check) ---")
for row in mesh_rows:
    L, xs = row[0], row[1:]
    dx, udx = mean_adjacent_spacing(xs)
    L_list.append(L)
    dx_list.append(dx)
    print(f"L={L:.0f} mm → mean Δx ≈ {dx:.3f} mm")

L_arr = np.array(L_list, float)
dx_arr = np.array(dx_list, float)
logL = np.log(L_arr)
logD = np.log(dx_arr)
m_ll, c_ll = np.polyfit(logL, logD, 1)  # log(Δx) = c + m*log(L)

plt.figure(1)
plt.title("Mesh: log Δx vs log L")
h = plt.scatter(logL, logD, marker="o", label="data")
col = h.get_facecolor()[0]
xline = np.linspace(np.min(logL), np.max(logL), 200)
plt.plot(xline, c_ll + m_ll*xline, color=col, linewidth=1.6, label=f"fit: slope={m_ll:.3f}")
plt.xlabel("log L")
plt.ylabel("log Δx")
plt.legend()
plt.grid(alpha=0.3)
spa.savefig("mesh_loglog_dx_vs_L")
plt.show()

print(f"[Log–log] slope m = {m_ll:.3f} (expected +1.000 if Δx ∝ L)")

# ================================================================
# 2) RELATE SYSTEMS: Fit DS and Mesh (axis), compare s/L → d/p
# ================================================================

# ---- Double slit: y vs m → d and s/L ----
ds_d, ds_ud, ds_s_over_L = [], [], []

plt.figure(2)
plt.title("Double Slit: y vs order m")
plt.xlabel("Order m")
plt.ylabel("Fringe position y (mm)")

for row in ds_rows:
    L = row[0]
    y = row[1:]
    m = np.arange(1, len(y)+1, dtype=float)
    uY = np.full_like(y, u_pos, float)

    fit, s, u_s, b, u_b = linfit_xy(m, y, uY)
    y_fit = fit.best_fit

    h = plt.errorbar(m, y, yerr=uY, marker="o", linestyle="None", label=f"L={int(L)} mm")
    col = h[0].get_color()

    # draw a dense fit line in the same colour
    xline = np.linspace(np.min(m), np.max(m), 200)
    yline = (fit.best_values["slope"]*xline + fit.best_values["intercept"])
    plt.plot(xline, yline, color=col, linewidth=1.6)

    d_est = (lam * L) / s
    u_d_est = d_est * np.sqrt((u_s/s)**2 + (u_lam/lam)**2 + (u_L/L)**2)

    ds_d.append(d_est)
    ds_ud.append(u_d_est)
    ds_s_over_L.append(s/L)

    print(f"[DS] L={L:.0f} mm → s={s:.3f}±{u_s:.3f} mm/order, s/L={s/L:.6f}, "
          f"d={d_est*1e3:.1f}±{u_d_est*1e3:.1f} µm (b={b:.2f}±{u_b:.2f})")

plt.legend(bbox_to_anchor=(1,1))
spa.savefig("double_slit_y_vs_m")
plt.show()

ds_d, ds_ud, ds_s_over_L = np.array(ds_d), np.array(ds_ud), np.array(ds_s_over_L)
d_mu, d_u = wmean(ds_d, ds_ud)
print(f"\n[DS] Weighted mean d = {d_mu*1e3:.1f} ± {d_u*1e3:.1f} µm")

# ---- Mesh (axis): x vs observed index s → p and s/L ----
mesh_p, mesh_up, mesh_s_over_L = [], [], []

plt.figure(3)
plt.title("Mesh (axis): x vs observed index s")
plt.xlabel("Observed index s")
plt.ylabel("Spot position x (mm)")

for row in mesh_rows:
    L = row[0]
    x = row[1:]
    s_idx = np.arange(1, len(x)+1, dtype=float)
    uX = np.full_like(x, u_pos, float)

    fit, s, u_s, b, u_b = linfit_xy(s_idx, x, uX)
    x_fit = fit.best_fit

    h = plt.errorbar(s_idx, x, yerr=uX, marker="o", linestyle="None", label=f"L={int(L)} mm")
    col = h[0].get_color()

    xline = np.linspace(np.min(s_idx), np.max(s_idx), 200)
    yline = (fit.best_values["slope"]*xline + fit.best_values["intercept"])
    plt.plot(xline, yline, color=col, linewidth=1.6)

    p_est = (lam * L) / s
    u_p_est = p_est * np.sqrt((u_s/s)**2 + (u_lam/lam)**2 + (u_L/L)**2)

    mesh_p.append(p_est)
    mesh_up.append(u_p_est)
    mesh_s_over_L.append(s/L)

    print(f"[MESH] L={L:.0f} mm → s={s:.3f}±{u_s:.3f} mm/index, s/L={s/L:.6f}, "
          f"p={p_est*1e3:.2f}±{u_p_est*1e3:.2f} µm (b={b:.2f}±{u_b:.2f})")

plt.legend(bbox_to_anchor=(1,1))
spa.savefig("mesh_x_vs_s")
plt.show()

mesh_p, mesh_up, mesh_s_over_L = np.array(mesh_p), np.array(mesh_up), np.array(mesh_s_over_L)
p_mu, p_u = wmean(mesh_p, mesh_up)
print(f"\n[MESH] Weighted mean (effective) p = {p_mu*1e3:.2f} ± {p_u*1e3:.2f} µm")

# ---- Relationship: (s/L) ratio → d/p ----
ratio_d_over_p = np.mean(mesh_s_over_L) / np.mean(ds_s_over_L)  # = d/p
ratio_p_over_d = 1.0 / ratio_d_over_p
p_from_ratio = d_mu / ratio_d_over_p
d_from_ratio = p_mu * ratio_d_over_p

print("\n--- Data-only relationship ---")
print(f"mean (s/L)_DS = {np.mean(ds_s_over_L):.6f}")
print(f"mean (s/L)_mesh = {np.mean(mesh_s_over_L):.6f}")
print(f"d/p (from s/L ratio) = {ratio_d_over_p:.3f} → p/d = {ratio_p_over_d:.3f}")

print("\n--- Cross-checks ---")
print(f"p (from d × p/d) = {p_from_ratio*1e3:.2f} µm vs p_mu = {p_mu*1e3:.2f} µm")
print(f"d (from p × d/p) = {d_from_ratio*1e3:.2f} µm vs d_mu = {d_mu*1e3:.2f} µm")

# ---- s/L summary plot ----
plt.figure(4)
plt.title("s/L by dataset (consistency check)")
plt.plot(np.arange(len(ds_s_over_L))+1, ds_s_over_L, "o", label="Double slit")
plt.plot(np.arange(len(mesh_s_over_L))+1, mesh_s_over_L, "s", label="Mesh (axis)")
plt.xlabel("Dataset index")
plt.ylabel("s / L [mm per unit per mm]")
plt.legend()
plt.grid(alpha=0.3)
spa.savefig("s_over_L_comparison")
plt.show()

# ---------- SUMMARY ----------
print("\n================= SUMMARY =================")
print(f"Log–log slope (Δx vs L, mesh): m = {m_ll:.3f} (expect +1 if Δx ∝ L)")
print(f"d (double slit): {d_mu*1e3:.1f} ± {d_u*1e3:.1f} µm")
print(f"p (mesh, observed s): {p_mu*1e3:.2f} ± {p_u*1e3:.2f} µm")
print(f"d/p (from s/L ratio): {ratio_d_over_p:.3f}")
print("Notes:")
print(" • Mesh placed over a circular aperture; intensities are envelope-modulated,")
print("   but maxima positions (used here) follow the same geometry as the double slit.")
print(" • 'Missing orders' are discussed qualitatively; analysis uses observed maxima only.")
print("===========================================\n")
