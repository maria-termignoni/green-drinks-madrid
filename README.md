# Web de Green Drinks Madrid

La web se publica sola en GitHub Pages y toma los encuentros de la base
**Eventos Green Drinks Madrid** de Notion.

## Qué hay en esta carpeta

- `site/` es la web tal cual se publica (página, fotos, estilos).
- `site/data/eventos.json` contiene los encuentros. Lo regenera el script cada vez que se publica; no hace falta tocarlo a mano.
- `scripts/actualizar-desde-notion.mjs` lee Notion y escribe `eventos.json`.
- `.github/workflows/publicar.yml` indica a GitHub cuándo publicar: cada mañana, cada vez que se sube un cambio y a mano.

## Cómo añadir un encuentro nuevo

En la fila del evento en Notion rellena:

| Campo | Para qué sirve |
|---|---|
| Fecha del Evento | Si le pones hora, se usa; si no, sale «desde las 20:00». |
| Tematica | La etiqueta y el filtro de la web. |
| Web: Título de la charla | Si está vacío, el próximo encuentro sale como «Título de la charla por confirmar». |
| Web: Nombre del ponente / Web: Cargo del ponente | Nombre y una línea de cargo. |
| Web: Resumen de la charla / Web: Bio del ponente | Lo que se ve al abrir la ficha del encuentro. |
| Web: Sitio web del ponente / LinkedIn del Ponente | Botones de la ficha. |
| Web: Foto del ponente | Foto cuadrada (mejor 600 × 600 px). |
| Web: Enlace de inscripción | El botón «Reservar sitio» del próximo encuentro. |
| **Publicar en web** | Hasta que no se marca, la fila no aparece en la web. |

El evento sale como «Próximo encuentro» hasta su día y al día siguiente pasa solo a «Encuentros pasados».

## Ver los cambios antes de la mañana siguiente

GitHub → pestaña **Actions** → **Publicar web** → **Run workflow**. Tarda un par de minutos.

## Si algo falla

GitHub manda un correo y la web publicada no cambia. En **Actions** se ve el error en rojo; los motivos más habituales son que el token de Notion ha caducado o que la integración ya no tiene acceso a la base de Eventos.
