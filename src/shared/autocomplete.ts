import {searchPokemon} from '../domain/pokemon/catalog';
import type {Catalog,Pokemon} from '../domain/pokemon/types';
import {escapeHtml} from './ui';
export function attachPokemonAutocomplete(input:HTMLInputElement,catalog:Catalog,entries:Pokemon[],onSelect:(pokemon:Pokemon)=>void,containerId=`${input.id}-suggestions`):()=>void{
  const controller=new AbortController();const options={signal:controller.signal};
  let list=document.getElementById(containerId);
  if(!list){list=document.createElement('ul');list.id=containerId;input.insertAdjacentElement('afterend',list);}
  let field=input.parentElement!;
  if(!field.classList.contains('search-field')&&!field.classList.contains('autocomplete-field')){const wrapper=document.createElement('div');wrapper.className='autocomplete-field';input.before(wrapper);wrapper.append(input);field=wrapper;}
  field.append(list);
  list.classList.add('suggestions','pokemon-suggestions');list.setAttribute('role','listbox');list.setAttribute('aria-label','Sugerencias de Pokémon');
  input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls',containerId);input.setAttribute('aria-expanded','false');
  let matches:Pokemon[]=[];let active=-1;
  function close(){list!.innerHTML='';input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');active=-1;}
  function choose(index:number){const pokemon=matches[index];if(!pokemon)return;input.value=pokemon.name;close();onSelect(pokemon);}
  function highlight(){list!.querySelectorAll<HTMLElement>('[role="option"]').forEach((option,i)=>{option.setAttribute('aria-selected',String(i===active));if(i===active){input.setAttribute('aria-activedescendant',option.id);option.scrollIntoView({block:'nearest'});}});}
  input.addEventListener('input',()=>{
    active=-1;matches=searchPokemon(catalog,entries,input.value,false);
    list!.innerHTML=matches.map((p,i)=>`<li role="presentation"><button id="${containerId}-${i}" type="button" role="option" aria-selected="false" tabindex="-1" data-id="${p.id}"><span>${escapeHtml(p.name)}</span></button></li>`).join('');
    input.setAttribute('aria-expanded',String(matches.length>0));input.removeAttribute('aria-activedescendant');
    list!.querySelectorAll<HTMLButtonElement>('button').forEach((button,i)=>{button.addEventListener('pointerdown',event=>event.preventDefault(),options);button.addEventListener('click',()=>choose(i),options);});
  },options);
  input.addEventListener('keydown',event=>{
    if(event.key==='Escape'){close();event.stopPropagation();return;}
    if((event.key==='ArrowDown'||event.key==='ArrowUp')&&matches.length&&list!.children.length){event.preventDefault();active=event.key==='ArrowDown'?(active+1)%matches.length:(active<=0?matches.length-1:active-1);highlight();}
    if(event.key==='Enter'&&active>=0&&list!.children.length){event.preventDefault();event.stopPropagation();choose(active);}
  },options);
  document.addEventListener('pointerdown',event=>{if(event.target!==input&&!list!.contains(event.target as Node))close();},options);
  input.addEventListener('blur',()=>{queueMicrotask(()=>{if(!list!.contains(document.activeElement))close();});},options);
  return()=>{controller.abort();close();};
}
