import {normalizeName} from '../../domain/pokemon/catalog';
import type {Species} from '../../domain/pokemon/types';
export const ALPHABET='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
export interface QuizClue {speciesId:number;clue:string}
export interface LetterQuestion {letter:string;mode:'starts'|'contains';species:Species;clue:string}
export type LetterStatus='pending'|'passed'|'correct'|'wrong'|'unavailable';
export interface RoscoState {questions:(LetterQuestion|null)[];statuses:LetterStatus[];current:number;score:number;finished:boolean;timedOut?:boolean}
export function expireRosco(state:RoscoState):RoscoState { return state.finished ? state : {...state,finished:true,timedOut:true,current:-1}; }
export function createRosco(species:Species[],clues:QuizClue[],random=Math.random):RoscoState{
  const byId=new Map(clues.map(q=>[q.speciesId,q]));const used=new Set<number>();
  // Reserve scarce letters first so common letters cannot consume their only answer.
  const candidates=ALPHABET.map(letter=>({letter,starts:species.filter(s=>byId.has(s.id)&&normalizeName(s.name).startsWith(letter.toLowerCase())),contains:species.filter(s=>byId.has(s.id)&&normalizeName(s.name).includes(letter.toLowerCase()))}));
  const planned=new Map<string,LetterQuestion>();
  const ordered=[...candidates].sort((a,b)=>a.contains.length-b.contains.length);
  for(const entry of ordered){let available=entry.starts.filter(s=>!used.has(s.id));const mode=available.length?'starts':'contains';if(!available.length)available=entry.contains.filter(s=>!used.has(s.id));if(!available.length)continue;const selected=available[Math.floor(random()*available.length)];used.add(selected.id);planned.set(entry.letter,{letter:entry.letter,mode,species:selected,clue:byId.get(selected.id)!.clue});}
  const questions=ALPHABET.map(letter=>planned.get(letter)||null);
  const statuses:LetterStatus[]=questions.map(q=>q?'pending':'unavailable');const current=statuses.findIndex(s=>s==='pending');
  return {questions,statuses,current,score:0,finished:current<0};
}
export function nextPending(statuses:LetterStatus[],after:number):number{
  for(let step=1;step<=statuses.length;step++){const index=(after+step)%statuses.length;if(statuses[index]==='pending'||statuses[index]==='passed')return index;}return -1;
}
export function passLetter(state:RoscoState):RoscoState{
  if(state.finished)return state;
  const statuses=[...state.statuses];statuses[state.current]='passed';
  return {...state,statuses,current:nextPending(statuses,state.current)};
}
export function answerLetter(state:RoscoState,answer:string):RoscoState{
  if(state.finished||!normalizeName(answer))return state;
  const question=state.questions[state.current];if(!question)return state;
  const correct=[question.species.name,question.species.slug,...question.species.aliases].some(name=>normalizeName(name)===normalizeName(answer));
  const statuses=[...state.statuses];statuses[state.current]=correct?'correct':'wrong';const current=nextPending(statuses,state.current);
  return {...state,statuses,current,score:state.score+Number(correct),finished:current<0};
}
