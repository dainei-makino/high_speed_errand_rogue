import os

WIDTH = 32
HEIGHT = 32
RADIUS = 5
INNER_OFFSET = 6

# (rTL, rTR, rBR, rBL)
TILES = {
    'station_wall_end.svg': (RADIUS, RADIUS, 0, 0),
    'station_wall_straight.svg': (RADIUS, RADIUS, RADIUS, RADIUS),
    'station_wall_corner.svg': (RADIUS, 0, 0, RADIUS),
    'station_wall_t.svg': (0, 0, RADIUS, RADIUS),
    'station_wall_cross.svg': (0, 0, 0, 0),
}

highlight_color = '#2a4776'
shadow_color = '#385a7c'
base_color = '#18294B'
rivet_color = '#2d4870'

os.makedirs('assets/images', exist_ok=True)

for name, (rTL, rTR, rBR, rBL) in TILES.items():
    def arc(r, x, y):
        return f"A{r} {r} 0 0 1 {x} {y} " if r else ''

    d_base = (
        f"M{rTL} 0 "
        f"H{WIDTH - rTR} "
        + arc(rTR, WIDTH, rTR)
        + f"V{HEIGHT - rBR} "
        + arc(rBR, WIDTH - rBR, HEIGHT)
        + f"H{rBL} "
        + arc(rBL, 0, HEIGHT - rBL)
        + f"V{rTL} "
        + arc(rTL, rTL, 0)
        + "Z"
    )

    d_highlight = (
        f"M0 {HEIGHT - rBL} "
        f"V{rTL} "
        + arc(rTL, rTL, 0)
        + f"H{WIDTH - rTR}"
    )

    d_shadow = (
        f"M{WIDTH} {rTR} "
        f"V{HEIGHT - rBR} "
        + arc(rBR, WIDTH - rBR, HEIGHT)
        + f"H{rBL}"
    )

    d_inner = (
        f"M{INNER_OFFSET} {INNER_OFFSET} "
        f"H{WIDTH - INNER_OFFSET} "
        f"V{HEIGHT - INNER_OFFSET} "
        f"H{INNER_OFFSET} Z"
    )

    rivets = []
    for y in range(4):
        for x in range(4):
            rx = 4 + x * 8
            ry = 4 + y * 8
            rivets.append(f'<rect x="{rx}" y="{ry}" width="1" height="1" fill="{rivet_color}"/>')

    cross = (
        f'<path d="M{WIDTH/2} {INNER_OFFSET} V{HEIGHT - INNER_OFFSET}" stroke="{highlight_color}" stroke-width="0.5"/>'
        f'<path d="M{INNER_OFFSET} {HEIGHT/2} H{WIDTH - INNER_OFFSET}" stroke="{highlight_color}" stroke-width="0.5"/>'
        f'<path d="M{INNER_OFFSET} {INNER_OFFSET} L{WIDTH - INNER_OFFSET} {HEIGHT - INNER_OFFSET}" stroke="{shadow_color}" stroke-width="0.5"/>'
        f'<path d="M{WIDTH - INNER_OFFSET} {INNER_OFFSET} L{INNER_OFFSET} {HEIGHT - INNER_OFFSET}" stroke="{shadow_color}" stroke-width="0.5"/>'
    )

    svg = f"""<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{WIDTH}\" height=\"{HEIGHT}\">\n  <path d=\"{d_base}\" fill=\"{base_color}\"/>\n  <path d=\"{d_highlight}\" fill=\"none\" stroke=\"{highlight_color}\" stroke-width=\"1\"/>\n  <path d=\"{d_shadow}\" fill=\"none\" stroke=\"{shadow_color}\" stroke-width=\"1\"/>\n  <path d=\"{d_inner}\" fill=\"none\" stroke=\"{shadow_color}\" stroke-width=\"0.5\"/>\n  {cross}\n  {' '.join(rivets)}\n</svg>\n"""

    with open(os.path.join('assets/images', name), 'w') as f:
        f.write(svg)
