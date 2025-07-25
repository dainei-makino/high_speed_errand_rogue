import os

WIDTH = 32
HEIGHT = 32
RADIUS = 5

# (rTL, rTR, rBR, rBL)
TILES = {
    'station_wall_end.svg': (RADIUS, RADIUS, 0, 0),
    'station_wall_straight.svg': (RADIUS, RADIUS, RADIUS, RADIUS),
    'station_wall_corner.svg': (RADIUS, 0, 0, RADIUS),
    'station_wall_t.svg': (0, 0, RADIUS, RADIUS),
    'station_wall_cross.svg': (0, 0, 0, 0),
}

highlight_color = '#1A2F55'
shadow_color = '#23345C'
base_color = '#0E1B35'
rivet_color = '#1C2E52'

os.makedirs('assets/images', exist_ok=True)

for name, (rTL, rTR, rBR, rBL) in TILES.items():
    def arc(cmd, r, x, y):
        return f"A{r} {r} 0 0 1 {x} {y} " if r else ''

    d_base = (
        f"M{rTL} 0 "
        f"H{WIDTH - rTR} "
        + arc('A', rTR, WIDTH, rTR)
        + f"V{HEIGHT - rBR} "
        + arc('A', rBR, WIDTH - rBR, HEIGHT)
        + f"H{rBL} "
        + arc('A', rBL, 0, HEIGHT - rBL)
        + f"V{rTL} "
        + arc('A', rTL, rTL, 0)
        + "Z"
    )

    d_highlight = (
        f"M0 {HEIGHT - rBL} "
        f"V{rTL} "
        + arc('A', rTL, rTL, 0)
        + f"H{WIDTH - rTR}"
    )

    d_shadow = (
        f"M{WIDTH} {rTR} "
        f"V{HEIGHT - rBR} "
        + arc('A', rBR, WIDTH - rBR, HEIGHT)
        + f"H{rBL}"
    )

    rivets = []
    for y in range(4):
        for x in range(4):
            rx = 4 + x * 8
            ry = 4 + y * 8
            rivets.append(f'<rect x="{rx}" y="{ry}" width="1" height="1" fill="{rivet_color}"/>')

    svg = f"""<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{WIDTH}\" height=\"{HEIGHT}\">\n  <path d=\"{d_base}\" fill=\"{base_color}\"/>\n  <path d=\"{d_highlight}\" fill=\"none\" stroke=\"{highlight_color}\" stroke-width=\"1\"/>\n  <path d=\"{d_shadow}\" fill=\"none\" stroke=\"{shadow_color}\" stroke-width=\"1\"/>\n  {' '.join(rivets)}\n</svg>\n"""

    with open(os.path.join('assets/images', name), 'w') as f:
        f.write(svg)
