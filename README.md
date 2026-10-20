# Pokechu

Versión 1.1.0 · [Abrir Pokechu](https://joanjuz.github.io/Pokechu/) · [Repositorio](https://github.com/joanjuz/Pokechu).

Actualización: la biblioteca incluye Pokédle y mantiene Modo infinito siempre al final. La estadística predeterminada es Aleatoria; las elecciones guardadas por el jugador se conservan. Mayor/Menor/Igual compara el valor conocido de la izquierda frente al oculto de la derecha: 510 frente a 410 se responde Mayor.

Tabla de cruces tiene tres vidas, también dentro de infinito. Cada propuesta inválida o repetida resta una; al agotarlas se revela una posible solución completa con nueve especies distintas. Esa solución puede diferir de las elecciones previas y no otorga puntos ni registros. Una tabla nueva restaura las tres vidas.

Gritos es una racha sin límite de rondas que termina con el primer fallo. Los tres candidatos y el volumen se conservan; los aciertos avanzan a otro grito, y un error muestra la respuesta y permite reiniciar. El récord de este modo se guarda por separado de las antiguas partidas de diez rondas. Al recorrer todo el catálogo vuelve a seleccionarse evitando repetir el último grito.

Pokédle (`#/pokedle`) ofrece propuestas sin límite con autocompletado. Cada propuesta compara tipos (coincidencia exacta o en otra posición), generación, color, posición en la cadena evolutiva, altura y peso. Las flechas apuntan hacia el valor del objetivo. Los intentos repetidos no penalizan; al acertar se revela la respuesta. Se usan formas habituales, con los filtros de generación; el juego permite partidas nuevas sin límite diario. Solo acertar suma un punto y registra la especie. En infinito se completa un Pokédle entero por reto, con sus propuestas sin límite.

`npm run data:pokedle` reproduce sus rasgos desde los CSV locales verificados de la revisión del catálogo. El archivo de colores está fijado mediante su identificador Git en `data/pokedle-sources.lock.json`; `data/generated/pokedle.json` conserva los hashes de los tres CSV de origen. Las traducciones de colores corresponden a esos identificadores. Si se actualiza la revisión base hay que revisar y actualizar también este archivo fijado. Mecánica consultada en [Pokédle](https://pokedle.today/); implementación y diseño propios dentro de Pokechu.

Minijuegos Pokémon en español para GitHub Pages. TypeScript estricto, Vite y componentes HTML/CSS con interfaz oscura. No hay cuentas ni servicios de partidas.

Once juegos: Mayor o menor, Siluetas, Pirámide Pokémon, Pasapalabra Pokémon, Ojos, Gritos, Modo infinito, Tabla de cruces Pokémon, Construye tu BST, Pokédle y Debilidades y resistencias. Todos admiten cualquier combinación de generaciones. Minijuegos, Pokédex y Logros están juntos en la navegación superior, también en móvil.

Los filtros están en un menú lateral fijo en escritorio y un panel con el botón Ajustes en móvil. Cambiar generaciones reinicia automáticamente la partida actual con el nuevo catálogo, manteniendo sus récords. Cambiar estadísticas o formas reinicia los juegos a los que afecta (comparación y pirámide), sin interrumpir los juegos de reconocimiento ni pasapalabra.

Mayor o menor permite comparar BST o cualquiera de las seis estadísticas base, con modo aleatorio por ronda. La pirámide muestra los diez Pokémon disponibles desde el inicio. Permite arrastrar, intercambiar y devolver las piezas hasta confirmar; hay siete vidas sobre el mismo tablero. Los valores se revelan bajo cada Pokémon al ganar o perder. El modo aleatorio mantiene una estadística durante los siete intentos. Siluetas descubre sectores angulares de 120°, 210° y 300°, con orientación inicial variable. Pasapalabra utiliza un rosco A–Z con un cronómetro global de 190 segundos, con respuestas escritas y vueltas a letras pendientes.

## Desarrollo

Pokechu usa verde musgo sobre fondos oscuros y lleva el subtítulo «Progressive minigames». El desarrollo local conserva la carpeta y base `/PokeJuegos/`; GitHub Pages utiliza `/Pokechu/` mediante la configuración del workflow.

El progreso es local: cada perfil tiene puntos globales, especies registradas, logros y mejor racha infinita. Progreso y logros permite crear o cambiar de jugador. Pokédex es una sección independiente con siluetas para especies pendientes e imágenes a color para las registradas, sin tarjetas. Cada acierto suma un punto global; una pirámide completa suma diez. En infinito cada reto vale un punto, incluida la pirámide. Las especies se registran una sola vez por perfil. Los datos no se sincronizan entre dispositivos y borrar los datos del sitio elimina los perfiles locales.

Modo infinito permite combinar Mayor o menor, Siluetas, Pirámide, Ojos, Gritos, Tabla de cruces y Pokédle. Pasapalabra y Construye tu BST quedan fuera. Cada ciclo incluye una vez cada juego elegido, en orden aleatorio. Un acierto cambia de reto; el primer fallo termina la racha. En la tabla el reto consiste en completar las nueve casillas; agotar las tres vidas termina la racha. Cambiar filtros o juegos inicia otra racha. Pasapalabra conserva un único plazo de 190 segundos durante todo el rosco, incluso al pasar letras o cambiar de pestaña.

Tabla de cruces combina tipos, habilidades (incluidas las ocultas) y generaciones de introducción en un tablero 3×3. Cada tablero se verifica mediante una asignación de nueve especies distintas. Elegir una sugerencia comprueba el cruce y coloca la imagen. Se puede borrar o reemplazar antes de completar; cada casilla da un único punto global por tabla. Los reemplazos válidos pueden registrar nuevas especies sin sumar otro punto.

Construye tu BST presenta seis especies diferentes, una a una. Se toma una estadística distinta de cada Pokémon, sin poder cambiarla después. Los valores de todas las estadísticas, incluidas las elegidas, permanecen ocultos hasta terminar los seis turnos. Al terminar compara la suma con la asignación óptima de esos mismos seis Pokémon y seis estadísticas, calculada mediante programación dinámica. No tiene victoria, derrota, puntos globales ni registros de Pokédex.

Requiere Node.js 22.12 o posterior (se usa Node.js 24 en CI).

```powershell
npm ci
npm run dev
```

Abrir la dirección indicada por Vite, bajo `/PokeJuegos/`. Las rutas son `#/bst`, `#/silueta`, `#/piramide`, `#/pasapalabra`, `#/ojos`, `#/gritos`, `#/infinito`, `#/tabla`, `#/estadisticas`, `#/pokedle`, `#/progreso` y `#/pokedex`.

```powershell
npm run data:validate
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

Las pruebas de navegador utilizan Chromium de Playwright. La configuración incluye escritorio y móvil emulado. No sustituye una comprobación en un móvil real.

## Datos e imágenes

La aplicación incluye su catálogo e imágenes locales: no consulta PokéAPI durante una partida. `data/sources.lock.json` fija las revisiones de PokeAPI/pokeapi y PokeAPI/sprites, hashes de CSV e imágenes y la transformación de las ilustraciones a WebP. La validación detecta alteraciones.

`npm run data:import` requiere red y reproduce la revisión fijada. `npm run data:import -- --update` actualiza deliberadamente las revisiones: revisar las diferencias y exclusiones antes de publicar. Los builds normales nunca actualizan los datos.

Los nombres españoles proceden de PokéAPI. Las generaciones filtran la introducción de la especie; las estadísticas siempre corresponden a la instantánea moderna. Las formas regionales y mega/primigenias admitidas están clasificadas expresamente en el importador. `data/generated/excluded.json` explica las variantes omitidas. No se afirma cobertura completa de todas las formas.

`npm run data:grid` importa nombres españoles de habilidades y su relación con cada variante desde la misma revisión fijada de PokeAPI/pokeapi. `data/grid-sources.lock.json` conserva los identificadores Git de los archivos originales; `data/generated/grid.json` incluye hashes SHA-256 y exclusiones explícitas. `npm run data:grid -- --cached` reproduce la generación sin red, verificando los archivos locales. Las 1.025 especies habituales tienen cobertura; la tabla utiliza solo estas formas para que cada respuesta corresponda a una especie. Siete formas de combate sin habilidad o nombre español verificable se excluyen del conjunto de habilidades. El constructor sí respeta los filtros de formas.

`npm run data:quiz` genera 1.025 preguntas locales a partir del catálogo y el CSV fijado de especies. Combina pistas variadas de tipos, evoluciones, generación, estadísticas y categorías de Pokémon. No usa números de Pokédex. El generador comprueba que cada combinación de pistas identifique una única especie en el catálogo completo. `data:validate` comprueba también la revisión y la correspondencia de preguntas y especies. Cada rosco selecciona respuestas diferentes de las generaciones activas, indicando «Empieza por» o «Contiene». Las letras imposibles con los filtros elegidos se desactivan y no penalizan.

Siluetas solo incluye la apariencia habitual por especie. La selección de una forma específica queda pendiente de una revisión de contornos; no hay un selector que prometa esa función.

## Añadir un minijuego

Crear su carpeta en `src/games`, separar reglas de presentación y añadirlo a `registry.ts`. Cada vista recibe catálogo, ajustes, aleatoriedad y almacenamiento mediante `GameContext`; devuelve una función de limpieza. No se mezclan los estados entre juegos.

## GitHub Pages

La publicación está preparada pero solo se ejecuta manualmente con el workflow **Publicar en GitHub Pages**. Seleccionar GitHub Actions como origen de Pages cuando se decida publicar. El workflow configura `BASE_PATH` con el nombre del repositorio; para un repositorio `usuario.github.io` usar `/`.

La versión estable se publica en GitHub Pages.

## Créditos

`npm run data:recognition` prepara los 27 recortes de ojos revisados (los iniciales de las nueve generaciones) y los 1025 gritos de las formas habituales. Se incluyen archivos locales y un manifiesto `data/generated/recognition.json` con revisiones y SHA-256. Las regiones de cada ojo están en `data/eye-regions.json`; no se utiliza una franja de la cara. Para ampliar la colección hay que revisar nuevos recortes. Gritos usa audio de [PokeAPI/cries](https://github.com/PokeAPI/cries), con formatos Ogg y MP3 detectados por cabecera. Ojos tiene hasta diez rondas; Gritos no tiene límite de rondas. Ambos respetan los filtros de generación. Ojos mantiene tres intentos con sugerencias de nombres. Gritos muestra tres opciones con imagen y nombre: un solo clic confirma, da el resultado y pasa al siguiente audio. El sonido requiere pulsar Escuchar, se puede repetir y se detiene al salir o resolver. Un fallo de carga no consume intentos.

La pirámide utiliza piezas transparentes sin marcos de carta; conserva las guías de los huecos, la selección por halo y las alternativas de toque y teclado.

- Datos: https://pokeapi.co/ y https://github.com/PokeAPI/pokeapi
- Ilustraciones: https://github.com/PokeAPI/sprites (ilustraciones oficiales Pokémon).
- Tipografías locales: Barlow Semi Condensed y Atkinson Hyperlegible, distribuidas mediante Fontsource con sus licencias en los paquetes.
- Pokémon y sus personajes pertenecen a sus titulares. Proyecto de fans sin afiliación oficial. Las imágenes mantienen sus derechos originales.

Los récords y ajustes se almacenan en el navegador, separados por juego, filtros y versión de catálogo. No hay analítica ni clasificación global.

## Sugerencias de nombres

Siluetas, Pasapalabra y Ojos comparten un autocompletado que admite prefijos, tildes y alias. Usa flechas y Enter para elegir, o pulsa una sugerencia. En Pasapalabra elegir completa el nombre; Responder confirma la respuesta. Las sugerencias respetan las generaciones activas.

Debilidades y resistencias (`#/debilidades`): tabla local de los 18 tipos, combinando ambos tipos con una habilidad posible, incluidas las ocultas. Se usan ataques sin contacto y condiciones neutrales, sin clima/objetos/PS/teracristalización ni habilidades del atacante. Los modificadores de tipos permanentes incluyen Levitación, absorciones, Sebo, Superguarda, Filtro y similares; los multiplicadores no estándar (por ejemplo 1,5) se muestran en su propio grupo. Cada cuatro propuestas incorrectas de especies diferentes se desbloquea una pista: generación a los 4, habilidad activa a los 8 y silueta a los 12. No hay vidas ni límite de propuestas. Repetir una especie no cuenta de nuevo. Solo acertar suma un punto y registra la especie; en infinito se resuelve el Pokémon completo por reto. Las formas se limitan a las habituales de las generaciones elegidas. Varias especies pueden compartir tabla, pero las pistas se refieren a una respuesta concreta.

`npm run data:defense` reproduce la tabla y los efectos desde los CSV fijados de PokeAPI. `data/defense-sources.lock.json` fija los blobs de tipos y descripciones de habilidades; el generador y la validación comprueban SHA-256 y SHA de Git. No hay peticiones al proveedor durante la partida.

### Créditos de los iconos de tipos

Los 18 símbolos vectoriales utilizados en *Debilidades y resistencias* proceden del paquete [Pokémon Type Icons – Vector, de Lugia-sea](https://www.deviantart.com/lugia-sea/art/Pokemon-Type-Icons---Vector-869706864). Se almacenan localmente en `public/type-icons/pokemon-types.svg` para conservar los trazados y colores originales. © Lugia-sea.
