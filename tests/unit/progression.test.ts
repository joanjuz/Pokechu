import { describe,it,expect } from 'vitest';
import { applyProgress,emptyProgress,progressEvent,isProgress,achievements } from '../../src/progress/rules';
import {createPlayerStore,isPlayers} from '../../src/progress/store';
import {cryChoices} from '../../src/games/cries/rules';
import {remainingSeconds} from '../../src/games/pasapalabra/timer';
import {createRosco,expireRosco,answerLetter,passLetter} from '../../src/games/pasapalabra/rules';
import {revealAngle} from '../../src/games/silhouette/reveal';
import {selectedGames,shuffledCycle} from '../../src/games/infinite/rules';
import catalog from '../../data/generated/catalog.json';
import {seededRandom} from '../../src/shared/random';
import type {Pokemon} from '../../src/domain/pokemon/types';

describe('Pokechu progression and rules',()=>{
  it('creates three unique cry options with the answer exactly once and shuffled positions',()=>{
    const entries=catalog.pokemon.filter(p=>p.kind==='default') as Pokemon[];const positions=new Set<number>();
    for(let seed=1;seed<=20;seed++){const choices=cryChoices(entries[0],entries,seededRandom(seed));expect(choices).toHaveLength(3);expect(new Set(choices.map(p=>p.speciesId)).size).toBe(3);expect(choices.filter(p=>p.id===entries[0].id)).toHaveLength(1);positions.add(choices.findIndex(p=>p.id===entries[0].id));}
    expect(positions.size).toBe(3);
  });
  it('uses one 190 second deadline including exact expiry and overdue clocks',()=>{
    const deadline=190000;expect(remainingSeconds(deadline,0)).toBe(190);expect(remainingSeconds(deadline,1000)).toBe(189);expect(remainingSeconds(deadline,189999)).toBe(1);expect(remainingSeconds(deadline,190000)).toBe(0);expect(remainingSeconds(deadline,200000)).toBe(0);
  });
  it('locks timed out rosco while preserving points and pending letters',()=>{
    const state=createRosco(catalog.species,[{speciesId:1,clue:'Bulbasaur'}],()=>0);const timed=expireRosco(state);
    expect(timed).toMatchObject({finished:true,timedOut:true,score:0,current:-1});expect(timed.statuses).toEqual(state.statuses);expect(answerLetter(timed,'Bulbasaur')).toBe(timed);expect(passLetter(timed)).toBe(timed);expect(expireRosco(timed)).toBe(timed);
  });
  it('reveals increasing clock sectors and a full image only on resolution',()=>{
    expect([0,1,2].map(n=>revealAngle(n,false))).toEqual([120,210,300]);expect(revealAngle(0,true)).toBe(360);expect(revealAngle(-1,false)).toBe(120);expect(revealAngle(9,false)).toBe(300);
  });
  it('registers each species once while adding correct points and unlocking milestones',()=>{
    const first=progressEvent({game:'ojos',correct:true,points:1,speciesIds:[1,1,4]},'a')!;let p=applyProgress(emptyProgress(),first);p=applyProgress(p,{...first,id:'b',streak:7});
    expect(p).toEqual({points:2,registered:[1,4],games:['ojos'],bestStreak:7});expect(achievements.filter(a=>p.registered.length>=a.count).map(a=>a.id)).toEqual(['dex-1']);expect(progressEvent({game:'gritos',correct:false,points:1,speciesIds:[7]},'c')).toBeNull();expect(isProgress({...p,registered:[1,1]})).toBe(false);
  });
  it('isolates local players and restores persisted progress and active profile',()=>{
    const values=new Map<string,string>();const storage={getItem:(key:string)=>values.get(key)||null,setItem:(key:string,value:string)=>{values.set(key,value);}};const store=createPlayerStore(storage);
    store.award({game:'bst',correct:true,points:1,speciesIds:[25]});expect(store.create('Joan')).toBe(true);expect(store.player().progress).toEqual(emptyProgress());store.award({game:'gritos',correct:true,points:1,speciesIds:[7]});const restored=createPlayerStore(storage);expect(restored.player().name).toBe('Joan');expect(restored.player().progress.registered).toEqual([7]);restored.select('jugador-1');expect(restored.player().progress.registered).toEqual([25]);expect(isPlayers(restored.snapshot())).toBe(true);
  });
  it('keeps progress usable when storage is denied and rejects corrupt saved state',()=>{
    const store=createPlayerStore({getItem:()=>'{bad',setItem:()=>{throw Error('denied');}});store.award({game:'silueta',correct:true,points:1,speciesIds:[1]});expect(store.player().progress.points).toBe(1);expect(store.saved()).toBe(false);expect(isPlayers({active:'missing',players:[]})).toBe(false);
  });
  it('restricts infinite mode to chosen games excludes rosco and shuffles complete cycles',()=>{
    const selected=selectedGames(['bst','pasapalabra','ojos','bst','unknown']);expect(selected).toEqual(['bst','ojos']);expect(selectedGames(null)).toEqual([]);expect(shuffledCycle(selected,()=>0)).toEqual(['ojos','bst']);expect(shuffledCycle(['gritos'],()=>0)).toEqual(['gritos']);expect(shuffledCycle([],()=>0)).toEqual([]);
  });
});
