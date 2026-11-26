rows = [
"###################",
"#........#........#",
"#o###.##.#.##.###o#",
"#.................#",
"#.###.#.###.#.###.#",
"#.....#.....#.....#",
"#####.###.###.#####"[:19],
"#####.#.....#.#####",
"#####..##-##..#####",
" ......#HHH#...... ",
"#####..#####..#####",
"#####.#.....#.#####",
"#####.###.###.#####",
"#.................#",
"#.###.##.#.##.###.#",
"#o..#.........#..o#",
"###.#.#.###.#.#.###",
"#.....#.....#.....#",
"#.#######.#######.#",
"#.................#",
"###################",
]
bad=[(i,len(r)) for i,r in enumerate(rows) if len(r)!=19]
print('bad lengths',bad)
sym=all(r==r[::-1] for r in rows); print('symmetric',sym)
H=len(rows);W=19
wall=lambda c,r: rows[r][c%W] in '#H-'
from collections import deque
start=(9,15);seen={start};q=deque([start])
while q:
    c,r=q.popleft()
    for dc,dr in((1,0),(-1,0),(0,1),(0,-1)):
        nc,nr=(c+dc)%W,r+dr
        if 0<=nr<H and not wall(nc,nr) and (nc,nr) not in seen: seen.add((nc,nr));q.append((nc,nr))
free=[(c,r) for r in range(H) for c in range(W) if not wall(c,r)]
print('free',len(free),'reachable',len(seen),'unreachable',[p for p in free if p not in seen])
print('dots',sum(rows[r][c] in '.o' for c,r in free), 'rows',H)
import json;print(json.dumps(rows))
