Estoy construyendo un proyecto llamado Huginn con Next.js 15, TypeScript, Tailwind y Bun.

Huginn es una herramienta de inteligencia mediática. El usuario pega una URL de una noticia y el sistema le devuelve:

1. CAPA 1 - El medio: quién es dueño del medio que publicó la noticia
2. CAPA 2 - El autor: historial de artículos del autor y patrones de cobertura
3. CAPA 3 - El contraste: análisis generado por IA cruzando las dos capas anteriores

STACK:

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- Bun como package manager

APIs que usaré:

- Postlight Parser (npm: @postlight/parser) → extrae autor, medio, título y contenido de una URL
- SerpApi Google News (<https://serpapi.com/search?engine=google_news>) → dos búsquedas:
  (A) el título/tema de la noticia para contexto global (20 resultados)
  (B) el nombre del autor para su historial de cobertura (10 resultados)
  Ambas en paralelo con Promise.all
- Wikidata SPARQL (endpoint público <https://query.wikidata.org/sparql>, sin key) → cadena de propiedad del medio: medio → empresa → dueño final
- OpenRouter API (<https://openrouter.ai/api/v1>) → LLM agnóstico para el reporte final, modelo: meta-llama/llama-3.3-70b-instruct

VARIABLES DE ENTORNO:

- SERPAPI_KEY
- OPENROUTER_API_KEY

PIPELINE - endpoint POST /api/analyze que recibe { url: string }:

Paso 1 - Extracción con Postlight Parser:

- title, author, domain, content (primeros 500 caracteres)

Paso 2 - Búsqueda dual con SerpApi Google News:

- Query A: título de la noticia → contexto global
- Query B: "nombre autor + medio" → historial del autor
- Formato de respuesta de SerpApi: news_results[].title, .source.name, .source.authors, .snippet, .link
- Promise.all para hacerlas en paralelo

Paso 3 - Propiedad del medio con Wikidata SPARQL:

- Buscar el dominio del medio (ej: "cnn.com" → "CNN")
- Query SPARQL para obtener: medio → propietario → propietario del propietario (máximo 3 niveles)
- Si no hay datos, devolver { owner: "No encontrado" } sin romper el flujo

Paso 4 - Reporte con OpenRouter:

- Recibe: título, autor, medio, cadena de propiedad, snippets del contexto global, snippets del historial del autor
- System prompt: "Eres un analista de medios. Analizá objetivamente la relación entre el propietario del medio, el historial del autor y la cobertura actual."
- Output JSON: { ownershipSummary: string, authorPattern: string, contrastAnalysis: string }

El endpoint devuelve:
{
article: { title, author, domain, content },
ownership: { chain: string[], summary: string },
authorHistory: { articles: [], pattern: string },
contrast: { analysis: string },
raw: { globalContext: [], authorContext: [] }
}

ESTRUCTURA DE ARCHIVOS:
src/
├── app/
│ ├── api/
│ │ └── analyze/
│ │ └── route.ts
│ └── page.tsx ← input URL + botón + JSON crudo por ahora
├── lib/
│ ├── parser.ts ← wrapper Postlight
│ ├── serpapi.ts ← wrapper SerpApi Google News
│ ├── wikidata.ts ← query SPARQL
│ └── openrouter.ts ← wrapper LLM
└── types/
└── analysis.ts ← tipos TypeScript

REGLAS IMPORTANTES:

- Si una API falla, el pipeline continúa con lo que tiene (graceful degradation)
- Cada paso hace console.log de su resultado para debugging
- La UI por ahora solo muestra el JSON crudo, el diseño viene después
- Dependencias mínimas, no agregar librerías innecesarias
- Todo en TypeScript estricto

Empezá instalando las dependencias y generá todos los archivos en orden. ahora tambien usar uckDuckGo Instant Answer API
The DuckDuckGo Instant Answer API offers developers free access to structured, instant answers for queries, suitable for various integrations without compromising user privacy.

Developed by DuckDuckGo

Save
Live API
99.90%
Uptime
150ms
Latency
0
Stars
No Auth
Auth
No
Credit Card
REST
Style
v1
Version
