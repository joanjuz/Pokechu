export const games = [
  { id: 'bst', title: 'Mayor o menor', summary: 'Compara el BST o una estadística base. Cada acierto aumenta tu racha.', action: 'Comparar Pokémon', load: () => import('./bst/view') },
  { id: 'silueta', title: '¿Quién es este Pokémon?', summary: 'Empieza con una parte de la silueta. Cada fallo descubre un poco más.', action: 'Adivinar siluetas', load: () => import('./silhouette/view') },
  { id: 'piramide', title: 'Pirámide Pokémon', summary: 'Coloca diez Pokémon: los valores más altos arriba y los más bajos abajo.', action: 'Construir la pirámide', load: () => import('./pyramid/view') },
  { id: 'pasapalabra', title: 'Pasapalabra Pokémon', summary: 'Responde las preguntas de la A a la Z. Pasa y vuelve a las letras pendientes.', action: 'Completar el rosco', load: () => import('./pasapalabra/view') },
  { id: 'ojos', title: '¿De quién son estos ojos?', summary: 'Reconoce a los Pokémon iniciales viendo únicamente sus ojos.', action: 'Adivinar por los ojos', load: () => import('./eyes/view') },
  { id: 'gritos', title: '¿Quién da este grito?', summary: 'Escucha su grito y elige qué Pokémon lo hace.', action: 'Adivinar por el grito', load: () => import('./cries/view') },
  { id: 'infinito', title: 'Modo infinito', summary: 'Mezcla los juegos que elijas. Cada acierto cambia de reto; un fallo termina la racha.', action: 'Configurar racha', load: () => import('./infinite/view') },
  { id: 'tabla', title: 'Tabla de cruces Pokémon', summary: 'Combina tipos, habilidades y generaciones. Nueve casillas, nueve especies diferentes.', action: 'Completar la tabla', load: () => import('./grid/view') },
  { id: 'estadisticas', title: 'Construye tu BST', summary: 'Elige una estadística de cada uno de seis Pokémon y compara tu suma con la mejor combinación.', action: 'Elegir estadísticas', load: () => import('./stat-builder/view') },
  { id: 'pokedle', title: 'Pokédle', summary: 'Adivina el Pokémon con las pistas de tipos, generación, color, evolución, altura y peso.', action: 'Descifrar las pistas', load: () => import('./pokedle/view') },
  { id: 'debilidades', title: 'Debilidades y resistencias', summary: 'Reconoce al Pokémon por el daño que recibe. Cada cuatro fallos desbloquean una pista.', action: 'Comparar defensas', load: () => import('./defense/view') },
] as const;
