# Fantasy asset images

Drop image files here, then (as an admin) POST `/api/admin/fantasy-images` with
`{ "source": "local", "force": true }` to wire them onto the fantasy cards. Files are
matched by name; anything missing keeps its current image (Wikimedia photo / team logo).

Accepted extensions: `.webp` (preferred), `.png`, `.jpg`. Portraits look best as a
roughly 3:4 vertical crop framed on the face; car images as a clean side profile.

## Drivers → `public/fantasy/drivers/<CODE>.<ext>`

Name each file by the driver's 3-letter code (uppercase):

```
VER  Max Verstappen        HAD  Isack Hadjar
NOR  Lando Norris          PIA  Oscar Piastri
LEC  Charles Leclerc       HAM  Lewis Hamilton
RUS  George Russell        ANT  Andrea Kimi Antonelli
GAS  Pierre Gasly          COL  Franco Colapinto
ALB  Alex Albon            SAI  Carlos Sainz
BEA  Oliver Bearman        OCO  Esteban Ocon
LAW  Liam Lawson           LIN  Arvid Lindblad
BOR  Gabriel Bortoleto     HUL  Nico Hulkenberg
STR  Lance Stroll          ALO  Fernando Alonso
BOT  Valtteri Bottas       PER  Sergio Perez
```

Example: `public/fantasy/drivers/HAM.webp`

## Constructors (cars) → `public/fantasy/constructors/<slug>.<ext>`

Name each file by the team slug:

```
red-bull        mclaren        ferrari       mercedes
alpine          williams       haas          racing-bulls
audi            aston-martin   cadillac
```

Example: `public/fantasy/constructors/ferrari.webp`
