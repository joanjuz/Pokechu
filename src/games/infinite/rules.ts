export const INFINITE_GAMES=['bst','silueta','piramide','ojos','gritos','tabla','pokedle','debilidades'] as const;
export type InfiniteGame=typeof INFINITE_GAMES[number];
export function selectedGames(value:unknown):InfiniteGame[] { return Array.isArray(value)?INFINITE_GAMES.filter(id=>value.includes(id)):[]; }
export function shuffledCycle(selected:InfiniteGame[],random=Math.random):InfiniteGame[] {
  const result=[...selected];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;
}
