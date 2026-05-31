"""
Génération du fichier Comptabilite_Fournisseur.xlsx
Comptabilité fournisseur — AgriPal Sénégal Connect
"""

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# ─── Palette ──────────────────────────────────────────────────────────────────
C_WHITE      = "FFFFFF"
C_LIGHT_GRAY = "F5F5F5"
C_HEADER_BG  = "EFEFEF"
C_GREEN      = "217346"
C_GREEN_PALE = "EAF4EE"
C_TEXT_SEC   = "595959"
C_TEXT_MAIN  = "1A1A1A"
C_BORDER     = "CCCCCC"

FMT_MONEY = '#,##0 "F"'
FMT_PCT   = '0.0%'

# ─── Style helpers ────────────────────────────────────────────────────────────
def thin_border():
    s = Side(style="thin", color=C_BORDER)
    return Border(left=s, right=s, top=s, bottom=s)

def mk_font(bold=False, color=C_TEXT_MAIN, size=10, italic=False):
    return Font(name="Calibri", bold=bold, color=color, size=size, italic=italic)

def mk_fill(color):
    return PatternFill(fill_type="solid", fgColor=color)

def mk_align(h="left", wrap=False):
    return Alignment(horizontal=h, vertical="center", wrap_text=wrap)

def cell(ws, row, col, value=None, bold=False, fg=C_TEXT_MAIN, bg=C_WHITE,
         size=10, fmt=None, h="left", italic=False):
    c = ws.cell(row=row, column=col, value=value)
    c.font  = mk_font(bold=bold, color=fg, size=size, italic=italic)
    c.fill  = mk_fill(bg)
    c.alignment = mk_align(h=h)
    c.border = thin_border()
    if fmt:
        c.number_format = fmt
    return c


# ══════════════════════════════════════════════════════════════════════════════
# FEUILLE 2 — Op. Poisson Séché
# Exposé pour le Tableau de Bord :
#   B3 = Capital Disponible   (input)
#   B4 = Capital Investi      (input)
#   B5 = Capital en Caisse    (=B3-B4)
#   B6 = Vente 1 bénéfice     (input)
#   B7 = Vente 2 bénéfice     (input)
#   B8 = Bénéfice Net Total   (=B6+B7)
#   B9 = Chiffre d'Affaires   (=B4+B8)
#   B10= Marge Nette          (=B8/B4)
# ══════════════════════════════════════════════════════════════════════════════
def build_poisson(ws):
    ws.sheet_view.showGridLines = True
    ws.freeze_panes = "A3"

    # ── Titre ─────────────────────────────────────────────────────────────────
    ws.merge_cells("A1:G1")
    c = ws["A1"]
    c.value = "Opération — Poisson Séché"
    c.font  = mk_font(bold=True, color=C_WHITE, size=13)
    c.fill  = mk_fill(C_GREEN)
    c.alignment = mk_align(h="center")
    c.border = thin_border()

    for i, w in enumerate([32, 22, 20, 20, 20, 20, 20], 1):
        ws.column_dimensions[get_column_letter(i)].width = w

    # ── En-têtes colonne ──────────────────────────────────────────────────────
    for j, h in enumerate(["Désignation", "Montant", "", "", "", "", ""], 1):
        cell(ws, 2, j, h, bold=True, bg=C_HEADER_BG, h="center")

    # ── Données ───────────────────────────────────────────────────────────────
    #   (label, valeur_ou_formule, format, est_input)
    rows = [
        ("Capital Disponible",               200_000,    FMT_MONEY, True),
        ("Capital Investi",                  150_000,    FMT_MONEY, True),
        ("Capital en Caisse (non investi)",  "=B3-B4",   FMT_MONEY, False),
        ("Vente 1 — Bénéfice réalisé",       35_000,     FMT_MONEY, True),
        ("Vente 2 — Bénéfice réalisé",       48_000,     FMT_MONEY, True),
        ("Bénéfice Net Total",               "=B6+B7",   FMT_MONEY, False),
        ("Chiffre d'Affaires",               "=B4+B8",   FMT_MONEY, False),
        ("Marge Nette",                      "=B8/B4",   FMT_PCT,   False),
    ]

    for i, (label, val, fmt, is_input) in enumerate(rows):
        r   = 3 + i
        is_total = label in ("Bénéfice Net Total", "Chiffre d'Affaires")
        bg  = C_GREEN_PALE if is_total else (C_LIGHT_GRAY if i % 2 == 1 else C_WHITE)
        fg_val = C_GREEN if is_input else C_TEXT_MAIN

        cell(ws, r, 1, label, bold=is_total, bg=bg)
        cell(ws, r, 2, val,   bold=is_total, fg=fg_val, bg=bg, fmt=fmt, h="right")
        for j in range(3, 8):
            cell(ws, r, j, bg=bg)

    for r in range(1, 12):
        ws.row_dimensions[r].height = 22


# ══════════════════════════════════════════════════════════════════════════════
# FEUILLE 3 — Op. Agro-alimentaire
# Exposé pour le Tableau de Bord :
#   B13 = Capital Disponible  (input, bilan row 1)
#   B14 = Capital Investi     (=F10 coût total)
#   B15 = Capital en Caisse   (=B13-B14)
#   H10 = Chiffre d'Affaires  (total row col H)
#   I10 = Bénéfice Net        (total row col I)
#   J10 = Marge Nette         (total row col J)
# ══════════════════════════════════════════════════════════════════════════════
def build_agro(ws):
    ws.sheet_view.showGridLines = True
    ws.freeze_panes = "A4"

    # ── Titre ─────────────────────────────────────────────────────────────────
    ws.merge_cells("A1:K1")
    c = ws["A1"]
    c.value = "Opération — Agro-alimentaire"
    c.font  = mk_font(bold=True, color=C_WHITE, size=13)
    c.fill  = mk_fill(C_GREEN)
    c.alignment = mk_align(h="center")
    c.border = thin_border()

    # ── Sous-titre capital ─────────────────────────────────────────────────────
    ws.merge_cells("A2:K2")
    c = ws["A2"]
    c.value = "Capital Disponible : 500 000 F   |   Capital Investi : 173 850 F   |   Capital en Caisse : 326 150 F"
    c.font  = mk_font(color=C_TEXT_SEC, size=10, italic=True)
    c.fill  = mk_fill(C_LIGHT_GRAY)
    c.alignment = mk_align(h="center")
    c.border = thin_border()

    for i, w in enumerate([18, 12, 6, 10, 13, 14, 13, 18, 14, 10, 4], 1):
        ws.column_dimensions[get_column_letter(i)].width = w

    # ── En-têtes tableau produits ─────────────────────────────────────────────
    headers = ["Produit", "Variété", "Qté", "Unité",
               "Prix Achat", "Coût Achat", "Prix Vente",
               "Chiffre d'Affaires", "Bénéfice", "Marge"]
    for j, h in enumerate(headers, 1):
        cell(ws, 3, j, h, bold=True, fg=C_WHITE, bg=C_GREEN, h="center")

    # ── Données produits ──────────────────────────────────────────────────────
    products = [
        ("Tomates",      "Cobra",  8,  "Caisse", 7_000, 11_000),
        ("Tomates",      "Ndiamb", 4,  "Caisse", 5_000,  9_000),
        ("Piment",       "Sofia",  28, "kg",       800,  1_500),
        ("Piment",       "Jukuli", 24, "kg",       800,  1_500),
        ("Kaani Salaat", "—",      50, "kg",       325,    500),
    ]

    DATA_START = 4
    N_PROD     = len(products)

    for i, (prod, var, qty, unit, pa, pv) in enumerate(products):
        r  = DATA_START + i
        bg = C_WHITE if i % 2 == 0 else C_LIGHT_GRAY

        cell(ws, r, 1, prod, bg=bg)
        cell(ws, r, 2, var,  bg=bg)
        cell(ws, r, 3, qty,  fg=C_GREEN, bg=bg, h="center")
        cell(ws, r, 4, unit, bg=bg, h="center")
        cell(ws, r, 5, pa,   fg=C_GREEN, bg=bg, fmt=FMT_MONEY, h="right")
        cell(ws, r, 6, f"=C{r}*E{r}", bg=bg, fmt=FMT_MONEY, h="right")
        cell(ws, r, 7, pv,   fg=C_GREEN, bg=bg, fmt=FMT_MONEY, h="right")
        cell(ws, r, 8, f"=C{r}*G{r}", bg=bg, fmt=FMT_MONEY, h="right")
        cell(ws, r, 9, f"=H{r}-F{r}", bg=bg, fmt=FMT_MONEY, h="right")
        cell(ws, r,10, f"=I{r}/H{r}", bg=bg, fmt=FMT_PCT,   h="right")  # marge = bén/CA

    # ── Ligne Transport ────────────────────────────────────────────────────────
    R_TRANS = DATA_START + N_PROD   # row 9
    bg_tr   = C_LIGHT_GRAY
    cell(ws, R_TRANS, 1, "Transport", bold=True, bg=bg_tr)
    for j in range(2, 6):
        cell(ws, R_TRANS, j, bg=bg_tr)
    cell(ws, R_TRANS, 6, 40_000, bold=True, fg=C_GREEN, bg=bg_tr, fmt=FMT_MONEY, h="right")
    for j in range(7, 11):
        cell(ws, R_TRANS, j, bg=bg_tr)

    # ── Ligne TOTAL ────────────────────────────────────────────────────────────
    R_TOTAL = R_TRANS + 1   # row 10
    F_FIRST = DATA_START
    F_LAST  = DATA_START + N_PROD - 1

    for j in range(1, 11):
        c = ws.cell(row=R_TOTAL, column=j)
        c.font   = mk_font(bold=True, color=C_WHITE, size=11)
        c.fill   = mk_fill(C_GREEN)
        c.alignment = mk_align(h="center")
        c.border = thin_border()

    ws.cell(row=R_TOTAL, column=1).value = "TOTAL"
    ws.cell(row=R_TOTAL, column=1).alignment = mk_align(h="left")

    def total_cell(col, formula, fmt):
        c = ws.cell(row=R_TOTAL, column=col, value=formula)
        c.font  = mk_font(bold=True, color=C_WHITE, size=11)
        c.fill  = mk_fill(C_GREEN)
        c.alignment = mk_align(h="right")
        c.border = thin_border()
        c.number_format = fmt

    total_cell(6,  f"=SUM(F{F_FIRST}:F{F_LAST})+F{R_TRANS}", FMT_MONEY)  # coût total
    total_cell(8,  f"=SUM(H{F_FIRST}:H{F_LAST})",            FMT_MONEY)  # CA total
    total_cell(9,  f"=H{R_TOTAL}-F{R_TOTAL}",                 FMT_MONEY)  # bénéfice
    total_cell(10, f"=I{R_TOTAL}/H{R_TOTAL}",                 FMT_PCT)    # marge bén/CA

    for r in range(1, R_TOTAL + 2):
        ws.row_dimensions[r].height = 22

    # ── Bilan de l'opération ───────────────────────────────────────────────────
    R_BILAN = R_TOTAL + 2   # row 12

    ws.merge_cells(f"A{R_BILAN}:K{R_BILAN}")
    c = ws[f"A{R_BILAN}"]
    c.value = "BILAN DE L'OPÉRATION"
    c.font  = mk_font(bold=True, color=C_WHITE, size=11)
    c.fill  = mk_fill(C_GREEN)
    c.alignment = mk_align(h="center")
    c.border = thin_border()

    # r=13 = Cap Dispo, r=14 = Cap Investi, r=15 = Cap Caisse
    R_CAP_DISPO = R_BILAN + 1   # 13
    R_CAP_INV   = R_BILAN + 2   # 14
    R_CAP_CAISS = R_BILAN + 3   # 15

    bilan_data = [
        ("Capital Disponible",  500_000,                     FMT_MONEY, True),
        ("Capital Investi",     f"=F{R_TOTAL}",              FMT_MONEY, False),
        ("Capital en Caisse",   f"=B{R_CAP_DISPO}-B{R_CAP_INV}", FMT_MONEY, False),
        ("Chiffre d'Affaires",  f"=H{R_TOTAL}",              FMT_MONEY, False),
        ("Bénéfice Net",        f"=I{R_TOTAL}",              FMT_MONEY, False),
        ("Marge Nette",         f"=J{R_TOTAL}",              FMT_PCT,   False),
    ]

    for i, (label, val, fmt, is_input) in enumerate(bilan_data):
        r  = R_BILAN + 1 + i
        bg = C_GREEN_PALE if i % 2 == 0 else C_WHITE
        fg = C_GREEN if is_input else C_TEXT_MAIN
        cell(ws, r, 1, label, bg=bg)
        cell(ws, r, 2, val, bold=True, fg=fg, bg=bg, fmt=fmt, h="right")
        for j in range(3, 11):
            cell(ws, r, j, bg=bg)
        ws.row_dimensions[r].height = 22

    # Retourner les positions exposées pour le Tableau de Bord
    return {
        "cap_dispo": f"B{R_CAP_DISPO}",   # 500 000 (input)
        "cap_inv":   f"B{R_CAP_INV}",     # =F10
        "cap_caisse":f"B{R_CAP_CAISS}",   # =B13-B14
        "ca":        f"H{R_TOTAL}",        # total CA
        "ben_net":   f"I{R_TOTAL}",        # total bénéfice
        "marge":     f"J{R_TOTAL}",        # total marge
    }


# ══════════════════════════════════════════════════════════════════════════════
# FEUILLE 1 — Tableau de Bord
# Référence directe aux cellules sources dans chaque feuille opération.
# ══════════════════════════════════════════════════════════════════════════════
def build_dashboard(ws, ops):
    """
    ops = list of (num, label, sheet_name, cell_map) where cell_map is the
    dict returned by the build_* functions.
    """
    ws.sheet_view.showGridLines = True
    ws.freeze_panes = "A4"

    # ── Titre ─────────────────────────────────────────────────────────────────
    ws.merge_cells("A1:H1")
    c = ws["A1"]
    c.value = "Tableau de Bord — Comptabilité Fournisseur"
    c.font  = mk_font(bold=True, color=C_WHITE, size=14)
    c.fill  = mk_fill(C_GREEN)
    c.alignment = mk_align(h="center")
    c.border = thin_border()

    ws.merge_cells("A2:H2")
    c = ws["A2"]
    c.value = "Vue consolidée de toutes les opérations commerciales"
    c.font  = mk_font(color=C_TEXT_SEC, size=10, italic=True)
    c.fill  = mk_fill(C_LIGHT_GRAY)
    c.alignment = mk_align(h="center")
    c.border = thin_border()

    for i, w in enumerate([5, 30, 18, 18, 18, 18, 18, 12], 1):
        ws.column_dimensions[get_column_letter(i)].width = w

    # ── En-têtes (ligne 3) ────────────────────────────────────────────────────
    headers = ["N°", "Activité", "Capital Disponible", "Capital Investi",
               "Capital en Caisse", "Chiffre d'Affaires", "Bénéfice Net", "Marge Nette"]
    for j, h in enumerate(headers, 1):
        cell(ws, 3, j, h, bold=True, fg=C_WHITE, bg=C_GREEN, h="center")

    # ── Lignes opérations ─────────────────────────────────────────────────────
    R_DATA_START = 4
    for i, (num, label, sn, cm) in enumerate(ops):
        r  = R_DATA_START + i
        bg = C_WHITE if i % 2 == 0 else C_LIGHT_GRAY

        cell(ws, r, 1, num,   bg=bg, h="center")
        cell(ws, r, 2, label, bg=bg)
        cell(ws, r, 3, f"='{sn}'!{cm['cap_dispo']}",  bg=bg, fmt=FMT_MONEY, h="right")
        cell(ws, r, 4, f"='{sn}'!{cm['cap_inv']}",    bg=bg, fmt=FMT_MONEY, h="right")
        cell(ws, r, 5, f"='{sn}'!{cm['cap_caisse']}", bg=bg, fmt=FMT_MONEY, h="right")
        cell(ws, r, 6, f"='{sn}'!{cm['ca']}",         bg=bg, fmt=FMT_MONEY, h="right")
        cell(ws, r, 7, f"='{sn}'!{cm['ben_net']}",    bg=bg, fmt=FMT_MONEY, h="right")
        cell(ws, r, 8, f"='{sn}'!{cm['marge']}",      bg=bg, fmt=FMT_PCT,   h="right")

    # ── Ligne TOTAL ────────────────────────────────────────────────────────────
    R_TOTAL = R_DATA_START + len(ops)
    R_LAST  = R_TOTAL - 1

    for j in range(1, 9):
        c = ws.cell(row=R_TOTAL, column=j)
        c.font  = mk_font(bold=True, color=C_WHITE, size=11)
        c.fill  = mk_fill(C_GREEN)
        c.alignment = mk_align(h="right")
        c.border = thin_border()

    ws.cell(row=R_TOTAL, column=2).value = "TOTAL"
    ws.cell(row=R_TOTAL, column=2).alignment = mk_align(h="left")

    for col, fmt in {3: FMT_MONEY, 4: FMT_MONEY, 5: FMT_MONEY,
                     6: FMT_MONEY, 7: FMT_MONEY}.items():
        ltr = get_column_letter(col)
        ws.cell(row=R_TOTAL, column=col,
                value=f"=SUM({ltr}{R_DATA_START}:{ltr}{R_LAST})").number_format = fmt

    # Marge totale = Bénéfice / CA (colonnes G et F)
    c = ws.cell(row=R_TOTAL, column=8, value=f"=G{R_TOTAL}/F{R_TOTAL}")
    c.number_format = FMT_PCT

    for r in range(1, R_TOTAL + 2):
        ws.row_dimensions[r].height = 24

    # ── Note bas de page ──────────────────────────────────────────────────────
    R_NOTE = R_TOTAL + 2
    ws.merge_cells(f"A{R_NOTE}:H{R_NOTE}")
    c = ws.cell(row=R_NOTE, column=1,
                value='Pour ajouter une opération : créer une nouvelle feuille '
                      'et ajouter une ligne dans ce tableau.')
    c.font = mk_font(color=C_TEXT_SEC, size=9, italic=True)
    c.alignment = mk_align(h="left")


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════
def main():
    wb = Workbook()
    wb.remove(wb.active)

    # Force recalcul à l'ouverture (Excel + Google Sheets)
    wb.calculation.calcMode     = 'auto'
    wb.calculation.fullCalcOnLoad = True

    ws_dashboard = wb.create_sheet("Tableau de Bord")
    ws_poisson   = wb.create_sheet("Op. Poisson Séché")
    ws_agro      = wb.create_sheet("Op. Agro-alimentaire")

    build_poisson(ws_poisson)
    agro_cells = build_agro(ws_agro)

    # Carte des cellules exposées pour la feuille Poisson
    poisson_cells = {
        "cap_dispo":  "B3",   # 200 000 (input)
        "cap_inv":    "B4",   # 150 000 (input)
        "cap_caisse": "B5",   # =B3-B4
        "ca":         "B9",   # =B4+B8
        "ben_net":    "B8",   # =B6+B7
        "marge":      "B10",  # =B8/B4
    }

    ops = [
        (1, "Op. Poisson Séché",    "Op. Poisson Séché",    poisson_cells),
        (2, "Op. Agro-alimentaire", "Op. Agro-alimentaire", agro_cells),
    ]
    build_dashboard(ws_dashboard, ops)

    out = "/home/user/agripal-senegal-connect/Comptabilite_Fournisseur.xlsx"
    wb.save(out)
    print(f"Fichier sauvegardé : {out}")

    # ── Vérification manuelle des calculs ─────────────────────────────────────
    products = [
        (8,  7_000, 11_000),
        (4,  5_000,  9_000),
        (28,   800,  1_500),
        (24,   800,  1_500),
        (50,   325,    500),
    ]
    cout_merch = sum(q * pa for q, pa, pv in products)
    ca_agro    = sum(q * pv for q, pa, pv in products)
    cout_total = cout_merch + 40_000
    ben_agro   = ca_agro - cout_total
    marge_agro = ben_agro / ca_agro

    print("\n=== VÉRIFICATION ===")
    checks = [
        ("Agro - Coût marchandises", cout_merch,     133_850),
        ("Agro - CA",                ca_agro,        227_000),
        ("Agro - Coût total",        cout_total,     173_850),
        ("Agro - Bénéfice Net",      ben_agro,        53_150),
        ("Agro - Marge (bén/CA)",    round(marge_agro*100,1), 23.4),
        ("Poisson - CA",             150_000+83_000, 233_000),
        ("Poisson - Marge (bén/inv)",round(83_000/150_000*100,1), 55.3),
        ("TOTAL - CA",               233_000+ca_agro, 460_000),
        ("TOTAL - Bénéfice",         83_000+ben_agro, 136_150),
    ]
    all_ok = True
    for label, got, expected in checks:
        ok = got == expected
        all_ok = all_ok and ok
        print(f"  {'✓' if ok else '✗'} {label}: {got:,}  (attendu {expected:,})")

    print(f"\n{'Tous les chiffres sont corrects ✓' if all_ok else 'ERREURS DÉTECTÉES ✗'}")

    print("\nDétail Agro produit par produit :")
    print(f"  {'Produit':<5} {'Qté':>4}  {'PA':>6}  {'PV':>6}  {'Coût':>8}  {'CA':>8}  {'Bén':>8}  Marge")
    noms = ["Tomates Cobra", "Tomates Ndiamb", "Piment Sofia", "Piment Jukuli", "Kaani Salaat"]
    for nom, (q, pa, pv) in zip(noms, products):
        cout = q * pa; ca = q * pv; ben = ca - cout
        print(f"  {nom:<16} {q:>3}  {pa:>6,}  {pv:>6,}  {cout:>8,}  {ca:>8,}  {ben:>8,}  {ben/ca*100:.1f}%")
    print(f"  Transport                              {40_000:>8,}")
    print(f"  TOTAL                                  {cout_total:>8,}  {ca_agro:>8,}  {ben_agro:>8,}  {ben_agro/ca_agro*100:.1f}%")

if __name__ == "__main__":
    main()
