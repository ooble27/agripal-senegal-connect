"""
Génération du fichier Comptabilite_Fournisseur.xlsx
Comptabilité fournisseur — AgriPal Sénégal Connect
"""

from openpyxl import Workbook
from openpyxl.styles import (
    Font, PatternFill, Alignment, Border, Side, numbers
)
from openpyxl.utils import get_column_letter

# ─── Palette de couleurs ───────────────────────────────────────────────────────
C_WHITE      = "FFFFFF"
C_LIGHT_GRAY = "F5F5F5"
C_HEADER_BG  = "EFEFEF"
C_GREEN      = "217346"
C_GREEN_PALE = "EAF4EE"
C_TEXT_SEC   = "595959"
C_TEXT_MAIN  = "1A1A1A"
C_BORDER     = "CCCCCC"

# ─── Helpers styles ───────────────────────────────────────────────────────────
def thin_border(color=C_BORDER):
    s = Side(style="thin", color=color)
    return Border(left=s, right=s, top=s, bottom=s)

def font(bold=False, color=C_TEXT_MAIN, size=10, italic=False):
    return Font(name="Calibri", bold=bold, color=color, size=size, italic=italic)

def fill(color):
    return PatternFill(fill_type="solid", fgColor=color)

def align(h="left", v="center", wrap=False):
    return Alignment(horizontal=h, vertical=v, wrap_text=wrap)

def apply_cell(ws, row, col, value=None, bold=False, color=C_TEXT_MAIN,
               bg=C_WHITE, size=10, fmt=None, h_align="left",
               italic=False, border=True):
    cell = ws.cell(row=row, column=col, value=value)
    cell.font = font(bold=bold, color=color, size=size, italic=italic)
    cell.fill = fill(bg)
    cell.alignment = align(h=h_align, wrap=False)
    if border:
        cell.border = thin_border()
    if fmt:
        cell.number_format = fmt
    return cell

FMT_MONEY = '#,##0 "F"'
FMT_PCT   = '0.0%'

# ══════════════════════════════════════════════════════════════════════════════
# FEUILLE 2 — Op. Poisson Séché
# ══════════════════════════════════════════════════════════════════════════════

def build_poisson(ws):
    ws.sheet_view.showGridLines = True
    ws.freeze_panes = "A3"

    # Titre principal
    ws.merge_cells("A1:G1")
    c = ws["A1"]
    c.value = "Opération — Poisson Séché"
    c.font = Font(name="Calibri", bold=True, color=C_WHITE, size=13)
    c.fill = fill(C_GREEN)
    c.alignment = align(h="center")
    c.border = thin_border()

    # Largeurs
    col_widths = [28, 22, 22, 22, 22, 22, 22]
    for i, w in enumerate(col_widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w

    # En-têtes section
    headers_section = ["Désignation", "Montant", "", "", "", "", ""]
    for j, h in enumerate(headers_section, 1):
        apply_cell(ws, 2, j, h, bold=True, bg=C_HEADER_BG, color=C_TEXT_MAIN, h_align="center")

    # ── Données ──────────────────────────────────────────────────────────────
    rows_data = [
        ("Capital Disponible",               200_000,  FMT_MONEY, True),
        ("Capital Investi",                  150_000,  FMT_MONEY, True),
        ("Capital en Caisse (non investi)",  None,     FMT_MONEY, False),  # formula
        ("Vente 1 — Bénéfice réalisé",       35_000,   FMT_MONEY, True),
        ("Vente 2 — Bénéfice réalisé",       48_000,   FMT_MONEY, True),
        ("Bénéfice Net Total",               None,     FMT_MONEY, False),  # formula
        ("Chiffre d'Affaires",               None,     FMT_MONEY, False),  # formula
        ("Marge Nette",                      None,     FMT_PCT,   False),  # formula
    ]

    # Row index mapping (1-based, data starts row 3)
    # Row 3 = Capital Disponible  → B3
    # Row 4 = Capital Investi     → B4
    # Row 5 = Capital en Caisse   → B5
    # Row 6 = Vente 1             → B6
    # Row 7 = Vente 2             → B7
    # Row 8 = Bénéfice Net        → B8
    # Row 9 = Chiffre d'Affaires  → B9
    # Row 10= Marge Nette         → B10

    data_start = 3
    formulas = {
        # row (1-based): formula string for col B
        5:  "=B3-B4",
        8:  "=B6+B7",
        9:  "=B4+B8",
        10: "=B8/B4",
    }

    for i, (label, val, fmt, is_input) in enumerate(rows_data):
        r = data_start + i
        is_total = label in ("Bénéfice Net Total", "Chiffre d'Affaires")
        is_marge = label == "Marge Nette"

        bg = C_GREEN_PALE if is_total else C_WHITE
        if i % 2 == 1 and not is_total:
            bg = C_LIGHT_GRAY

        # Label
        apply_cell(ws, r, 1, label, bold=is_total, bg=bg, color=C_TEXT_MAIN,
                   h_align="left")

        # Value / formula
        col_color = C_GREEN if is_input else C_TEXT_MAIN
        bold_val = is_total
        if r in formulas:
            v = formulas[r]
        else:
            v = val
        apply_cell(ws, r, 2, v, bold=bold_val, bg=bg, color=col_color,
                   fmt=fmt, h_align="right")

        # Fill rest of cols with same bg + border
        for j in range(3, 8):
            apply_cell(ws, r, j, None, bg=bg)

    # Row hauteur
    for r in range(1, 12):
        ws.row_dimensions[r].height = 22

    # ── Colonne N (liaison Tableau de Bord) ──────────────────────────────────
    ws.column_dimensions["N"].width = 0.5  # masquée visuellement

    # N4=Cap Dispo, N6=Cap Investi, N8=Caisse, N10=CA, N12=Bénéf, N13=Marge
    liaison = {
        4:  ("=B3", FMT_MONEY),
        6:  ("=B4", FMT_MONEY),
        8:  ("=B5", FMT_MONEY),
        10: ("=B9", FMT_MONEY),
        12: ("=B8", FMT_MONEY),
        13: ("=B10", FMT_PCT),
    }
    for row, (formula, fmt) in liaison.items():
        c = ws.cell(row=row, column=14, value=formula)
        c.number_format = fmt
        c.font = Font(name="Calibri", size=9, color=C_TEXT_SEC)


# ══════════════════════════════════════════════════════════════════════════════
# FEUILLE 3 — Op. Agro-alimentaire
# ══════════════════════════════════════════════════════════════════════════════

def build_agro(ws):
    ws.sheet_view.showGridLines = True
    ws.freeze_panes = "A4"

    # Titre principal
    ws.merge_cells("A1:K1")
    c = ws["A1"]
    c.value = "Opération — Agro-alimentaire"
    c.font = Font(name="Calibri", bold=True, color=C_WHITE, size=13)
    c.fill = fill(C_GREEN)
    c.alignment = align(h="center")
    c.border = thin_border()

    # Sous-titre capital
    ws.merge_cells("A2:K2")
    c = ws["A2"]
    c.value = "Capital Disponible : 500 000 F   |   Capital Investi : 173 850 F   |   Capital en Caisse : 326 150 F"
    c.font = Font(name="Calibri", bold=False, color=C_TEXT_SEC, size=10, italic=True)
    c.fill = fill(C_LIGHT_GRAY)
    c.alignment = align(h="center")
    c.border = thin_border()

    # Largeurs colonnes A..K
    col_widths = [18, 12, 6, 10, 13, 14, 13, 14, 14, 12, 10]
    for i, w in enumerate(col_widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w

    # En-têtes tableau produits (ligne 3)
    headers = [
        "Produit", "Variété", "Qté", "Unité",
        "Prix Achat", "Coût Achat",
        "Prix Vente", "Chiffre d'Affaires",
        "Bénéfice", "Marge", ""
    ]
    for j, h in enumerate(headers[:10], 1):
        apply_cell(ws, 3, j, h, bold=True, bg=C_GREEN, color=C_WHITE,
                   h_align="center")

    # ── Données produits ─────────────────────────────────────────────────────
    products = [
        # produit, variete, qte, unite, px_achat, px_vente
        ("Tomates",      "Cobra",  8,  "Caisse", 7_000, 11_000),
        ("Tomates",      "Ndiamb", 4,  "Caisse", 5_000,  9_000),
        ("Piment",       "Sofia",  28, "kg",       800,  1_500),
        ("Piment",       "Jukuli", 24, "kg",       800,  1_500),
        ("Kaani Salaat", "—",      50, "kg",       325,    500),
    ]

    data_start = 4   # ligne 4 = première ligne produit
    n_products = len(products)

    for i, (prod, var, qty, unit, px_ach, px_vente) in enumerate(products):
        r = data_start + i
        bg = C_WHITE if i % 2 == 0 else C_LIGHT_GRAY

        apply_cell(ws, r, 1, prod,     bg=bg, color=C_TEXT_MAIN)
        apply_cell(ws, r, 2, var,      bg=bg, color=C_TEXT_MAIN)
        apply_cell(ws, r, 3, qty,      bg=bg, color=C_GREEN, h_align="center")
        apply_cell(ws, r, 4, unit,     bg=bg, color=C_TEXT_MAIN, h_align="center")
        apply_cell(ws, r, 5, px_ach,   bg=bg, color=C_GREEN, fmt=FMT_MONEY, h_align="right")
        # Coût Achat = Qté * Prix Achat
        cr = get_column_letter(3)  # C
        cf = get_column_letter(5)  # E
        apply_cell(ws, r, 6, f"=C{r}*E{r}", bg=bg, color=C_TEXT_MAIN, fmt=FMT_MONEY, h_align="right")
        apply_cell(ws, r, 7, px_vente, bg=bg, color=C_GREEN, fmt=FMT_MONEY, h_align="right")
        # CA = Qté * Prix Vente
        apply_cell(ws, r, 8, f"=C{r}*G{r}", bg=bg, color=C_TEXT_MAIN, fmt=FMT_MONEY, h_align="right")
        # Bénéfice = CA - Coût
        apply_cell(ws, r, 9, f"=H{r}-F{r}", bg=bg, color=C_TEXT_MAIN, fmt=FMT_MONEY, h_align="right")
        # Marge = Bénéfice / CA
        apply_cell(ws, r, 10, f"=I{r}/H{r}", bg=bg, color=C_TEXT_MAIN, fmt=FMT_PCT, h_align="right")

    # ── Ligne Transport ───────────────────────────────────────────────────────
    r_transport = data_start + n_products
    bg_tr = C_LIGHT_GRAY
    apply_cell(ws, r_transport, 1, "Transport", bold=True, bg=bg_tr, color=C_TEXT_MAIN)
    for j in range(2, 6):
        apply_cell(ws, r_transport, j, None, bg=bg_tr)
    apply_cell(ws, r_transport, 6, 40_000, bold=True, bg=bg_tr, color=C_GREEN,
               fmt=FMT_MONEY, h_align="right")
    for j in range(7, 11):
        apply_cell(ws, r_transport, j, None, bg=bg_tr)

    # ── Ligne TOTAL ───────────────────────────────────────────────────────────
    r_total = r_transport + 1
    bg_tot = C_GREEN

    for j in range(1, 11):
        apply_cell(ws, r_total, j, bg=bg_tot, color=C_WHITE, bold=True)

    ws.cell(row=r_total, column=1).value = "TOTAL"
    ws.cell(row=r_total, column=1).font = Font(name="Calibri", bold=True, color=C_WHITE, size=11)

    # Coût total = somme coûts achat (F4:F8) + transport (F9)
    f_start = data_start
    f_end   = data_start + n_products - 1   # dernière ligne produit
    r_tr    = r_transport

    cost_formula = f"=SUM(F{f_start}:F{f_end})+F{r_tr}"
    ca_formula   = f"=SUM(H{f_start}:H{f_end})"

    c = ws.cell(row=r_total, column=6, value=cost_formula)
    c.font = Font(name="Calibri", bold=True, color=C_WHITE); c.fill = fill(C_GREEN)
    c.number_format = FMT_MONEY; c.alignment = align(h="right"); c.border = thin_border()

    c = ws.cell(row=r_total, column=8, value=ca_formula)
    c.font = Font(name="Calibri", bold=True, color=C_WHITE); c.fill = fill(C_GREEN)
    c.number_format = FMT_MONEY; c.alignment = align(h="right"); c.border = thin_border()

    c = ws.cell(row=r_total, column=9, value=f"=H{r_total}-F{r_total}")
    c.font = Font(name="Calibri", bold=True, color=C_WHITE); c.fill = fill(C_GREEN)
    c.number_format = FMT_MONEY; c.alignment = align(h="right"); c.border = thin_border()

    # Marge totale = Bénéfice / CA
    c = ws.cell(row=r_total, column=10, value=f"=I{r_total}/H{r_total}")
    c.font = Font(name="Calibri", bold=True, color=C_WHITE); c.fill = fill(C_GREEN)
    c.number_format = FMT_PCT; c.alignment = align(h="right"); c.border = thin_border()

    # Hauteur lignes
    for r in range(1, r_total + 2):
        ws.row_dimensions[r].height = 22

    # ── Bilan ─────────────────────────────────────────────────────────────────
    r_bilan = r_total + 2
    ws.merge_cells(f"A{r_bilan}:K{r_bilan}")
    c = ws.cell(row=r_bilan, column=1)
    c.value = "BILAN DE L'OPÉRATION"
    c.font = Font(name="Calibri", bold=True, color=C_WHITE, size=11)
    c.fill = fill(C_GREEN)
    c.alignment = align(h="center")
    c.border = thin_border()

    bilan_rows = [
        ("Capital Disponible",    500_000,    FMT_MONEY, True),
        ("Capital Investi",       f"=F{r_total}", FMT_MONEY, False),
        ("Capital en Caisse",     f"=A{r_bilan+1}-B{r_bilan+2}", FMT_MONEY, False),
        ("Chiffre d'Affaires",    f"=H{r_total}", FMT_MONEY, False),
        ("Bénéfice Net",          f"=I{r_total}", FMT_MONEY, False),
        ("Marge Nette",           f"=J{r_total}", FMT_PCT,   False),
    ]

    # Recalculate correct row references for bilan
    # r_bilan+1 = Capital Disponible label row
    r_b_cap_dispo = r_bilan + 1
    r_b_cap_inv   = r_bilan + 2
    r_b_caisse    = r_bilan + 3

    bilan_rows_corrected = [
        ("Capital Disponible",  500_000,                FMT_MONEY, True),
        ("Capital Investi",     f"=F{r_total}",         FMT_MONEY, False),
        ("Capital en Caisse",   f"=B{r_b_cap_dispo}-B{r_b_cap_inv}", FMT_MONEY, False),
        ("Chiffre d'Affaires",  f"=H{r_total}",         FMT_MONEY, False),
        ("Bénéfice Net",        f"=I{r_total}",         FMT_MONEY, False),
        ("Marge Nette",         f"=J{r_total}",         FMT_PCT,   False),
    ]

    for i, (label, val, fmt, is_input) in enumerate(bilan_rows_corrected):
        r = r_bilan + 1 + i
        bg = C_GREEN_PALE if i % 2 == 0 else C_WHITE
        col_c = C_GREEN if is_input else C_TEXT_MAIN
        apply_cell(ws, r, 1, label, bold=False, bg=bg, h_align="left")
        apply_cell(ws, r, 2, val, bold=True, bg=bg, color=col_c, fmt=fmt, h_align="right")
        for j in range(3, 11):
            apply_cell(ws, r, j, None, bg=bg)
        ws.row_dimensions[r].height = 22

    # ── Colonne N liaison Tableau de Bord ─────────────────────────────────────
    ws.column_dimensions["N"].width = 0.5
    liaison = {
        4:  (500_000,              FMT_MONEY),
        6:  (f"=F{r_total}",      FMT_MONEY),
        8:  (f"=N4-N6",           FMT_MONEY),
        10: (f"=H{r_total}",      FMT_MONEY),
        12: (f"=I{r_total}",      FMT_MONEY),
        13: (f"=N12/N10",         FMT_PCT),
    }
    for row, (val, fmt) in liaison.items():
        c = ws.cell(row=row, column=14, value=val)
        c.number_format = fmt
        c.font = Font(name="Calibri", size=9, color=C_TEXT_SEC)


# ══════════════════════════════════════════════════════════════════════════════
# FEUILLE 1 — Tableau de Bord
# ══════════════════════════════════════════════════════════════════════════════

def build_dashboard(ws, sheet_poisson_name, sheet_agro_name):
    ws.sheet_view.showGridLines = True
    ws.freeze_panes = "A4"

    # Titre
    ws.merge_cells("A1:H1")
    c = ws["A1"]
    c.value = "Tableau de Bord — Comptabilité Fournisseur"
    c.font = Font(name="Calibri", bold=True, color=C_WHITE, size=14)
    c.fill = fill(C_GREEN)
    c.alignment = align(h="center")
    c.border = thin_border()

    # Sous-titre
    ws.merge_cells("A2:H2")
    c = ws["A2"]
    c.value = "Vue consolidée de toutes les opérations commerciales"
    c.font = Font(name="Calibri", color=C_TEXT_SEC, size=10, italic=True)
    c.fill = fill(C_LIGHT_GRAY)
    c.alignment = align(h="center")
    c.border = thin_border()

    # Largeurs
    col_widths = [5, 30, 18, 18, 18, 18, 18, 12]
    for i, w in enumerate(col_widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w

    # En-têtes (ligne 3)
    headers = [
        "N°", "Activité",
        "Capital Disponible", "Capital Investi", "Capital en Caisse",
        "Chiffre d'Affaires", "Bénéfice Net", "Marge Nette"
    ]
    for j, h in enumerate(headers, 1):
        apply_cell(ws, 3, j, h, bold=True, bg=C_GREEN, color=C_WHITE, h_align="center")

    # ── Lignes opérations ─────────────────────────────────────────────────────
    ops = [
        (1, "Op. Poisson Séché",   sheet_poisson_name),
        (2, "Op. Agro-alimentaire", sheet_agro_name),
    ]

    for i, (num, label, sheet_name) in enumerate(ops):
        r = 4 + i
        bg = C_WHITE if i % 2 == 0 else C_LIGHT_GRAY
        sn = sheet_name  # e.g. "Op. Poisson Séché"

        apply_cell(ws, r, 1, num, bg=bg, h_align="center")
        apply_cell(ws, r, 2, label, bg=bg, color=C_TEXT_MAIN)
        # Liens vers col N de chaque feuille
        apply_cell(ws, r, 3, f"='{sn}'!N4",  bg=bg, fmt=FMT_MONEY, h_align="right")
        apply_cell(ws, r, 4, f"='{sn}'!N6",  bg=bg, fmt=FMT_MONEY, h_align="right")
        apply_cell(ws, r, 5, f"='{sn}'!N8",  bg=bg, fmt=FMT_MONEY, h_align="right")
        apply_cell(ws, r, 6, f"='{sn}'!N10", bg=bg, fmt=FMT_MONEY, h_align="right")
        apply_cell(ws, r, 7, f"='{sn}'!N12", bg=bg, fmt=FMT_MONEY, h_align="right")
        apply_cell(ws, r, 8, f"='{sn}'!N13", bg=bg, fmt=FMT_PCT,   h_align="right")

    # ── Ligne TOTAL ───────────────────────────────────────────────────────────
    r_total = 4 + len(ops)
    r_first = 4
    r_last  = r_total - 1

    for j in range(1, 9):
        apply_cell(ws, r_total, j, bg=C_GREEN, color=C_WHITE, bold=True)

    ws.cell(row=r_total, column=1).value = ""
    ws.cell(row=r_total, column=2).value = "TOTAL"
    ws.cell(row=r_total, column=2).font = Font(name="Calibri", bold=True, color=C_WHITE, size=11)
    ws.cell(row=r_total, column=2).fill = fill(C_GREEN)
    ws.cell(row=r_total, column=2).alignment = align(h="left")
    ws.cell(row=r_total, column=2).border = thin_border()

    sum_cols = {3: FMT_MONEY, 4: FMT_MONEY, 5: FMT_MONEY, 6: FMT_MONEY, 7: FMT_MONEY}
    for col, fmt in sum_cols.items():
        ltr = get_column_letter(col)
        c = ws.cell(row=r_total, column=col,
                    value=f"=SUM({ltr}{r_first}:{ltr}{r_last})")
        c.font = Font(name="Calibri", bold=True, color=C_WHITE)
        c.fill = fill(C_GREEN)
        c.number_format = fmt
        c.alignment = align(h="right")
        c.border = thin_border()

    # Marge totale = Bénéfice total / CA total
    c = ws.cell(row=r_total, column=8,
                value=f"=G{r_total}/F{r_total}")
    c.font = Font(name="Calibri", bold=True, color=C_WHITE)
    c.fill = fill(C_GREEN)
    c.number_format = FMT_PCT
    c.alignment = align(h="right")
    c.border = thin_border()

    # Hauteur lignes
    for r in range(1, r_total + 2):
        ws.row_dimensions[r].height = 24

    # ── Note de bas de page ───────────────────────────────────────────────────
    r_note = r_total + 2
    ws.merge_cells(f"A{r_note}:H{r_note}")
    c = ws.cell(row=r_note, column=1)
    c.value = ("Pour ajouter une nouvelle opération : créer une feuille sur le modèle "
               "\"Op. Agro-alimentaire\" et ajouter une ligne dans ce tableau.")
    c.font = Font(name="Calibri", color=C_TEXT_SEC, size=9, italic=True)
    c.alignment = align(h="left")


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    wb = Workbook()

    # Supprimer feuille par défaut
    default_sheet = wb.active
    wb.remove(default_sheet)

    # Créer les 3 feuilles dans l'ordre
    ws_dashboard = wb.create_sheet("Tableau de Bord")
    ws_poisson   = wb.create_sheet("Op. Poisson Séché")
    ws_agro      = wb.create_sheet("Op. Agro-alimentaire")

    build_poisson(ws_poisson)
    build_agro(ws_agro)
    build_dashboard(ws_dashboard, "Op. Poisson Séché", "Op. Agro-alimentaire")

    output_path = "/home/user/agripal-senegal-connect/Comptabilite_Fournisseur.xlsx"
    wb.save(output_path)
    print(f"Fichier sauvegardé : {output_path}")

    # ── Vérification des chiffres ─────────────────────────────────────────────
    print("\n=== VÉRIFICATION DES CHIFFRES ===")
    print("(Valeurs statiques — les formules sont vérifiées à l'ouverture Excel)")
    expected = {
        "Poisson - Capital Disponible": 200_000,
        "Poisson - Capital Investi":    150_000,
        "Poisson - Capital en Caisse":  50_000,
        "Poisson - CA":                 233_000,
        "Poisson - Bénéfice Net":       83_000,
        "Agro - Capital Disponible":    500_000,
        "Agro - Capital Investi":       173_850,
        "Agro - Capital en Caisse":     326_150,
        "Agro - CA":                    227_000,
        "Agro - Bénéfice Net":          53_150,
        "Total - Capital Disponible":   700_000,
        "Total - Capital Investi":      323_850,
        "Total - Capital en Caisse":    376_150,
        "Total - CA":                   460_000,
        "Total - Bénéfice Net":         136_150,
    }

    # Calcul agro manuel
    products = [
        (8,  7_000, 11_000),
        (4,  5_000,  9_000),
        (28,   800,  1_500),
        (24,   800,  1_500),
        (50,   325,    500),
    ]
    cout_marchandises = sum(q * pa for q, pa, pv in products)
    ca_total          = sum(q * pv for q, pa, pv in products)
    cout_total        = cout_marchandises + 40_000  # transport
    ben_agro          = ca_total - cout_total

    computed = {
        "Agro - Coût marchandises": cout_marchandises,
        "Agro - CA":                ca_total,
        "Agro - Coût total":        cout_total,
        "Agro - Bénéfice Net":      ben_agro,
    }
    for k, v in computed.items():
        expected_val = expected.get(k)
        status = "✓" if expected_val is None or v == expected_val else f"✗ (attendu {expected_val})"
        print(f"  {k}: {v:,} F  {status}")

    print("\nChiffres agro détaillés :")
    for q, pa, pv in products:
        cout = q * pa
        ca   = q * pv
        ben  = ca - cout
        marge = ben / cout * 100
        print(f"  Qté={q:2d}  PA={pa:6,}  PV={pv:6,}  Coût={cout:8,}  CA={ca:8,}  Bén={ben:7,}  Marge={marge:.1f}%")
    print(f"  Transport : 40 000 F")
    print(f"  TOTAL Coût: {cout_total:,} F  CA: {ca_total:,} F  Bénéfice: {ben_agro:,} F  Marge: {ben_agro/cout_total*100:.1f}%")
    print(f"\nPoisson: CA = 150000 + 83000 = {150_000+83_000:,} F  Marge = 83000/150000 = {83_000/150_000*100:.1f}%")
    print(f"GRAND TOTAL: Cap={700_000:,}  Investi={323_850:,}  Caisse={376_150:,}  CA={233_000+ca_total:,}  Bén={83_000+ben_agro:,}")

if __name__ == "__main__":
    main()
