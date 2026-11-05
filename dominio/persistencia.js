import {migrarBase} from './migracoes.js';
let database;
export const abrir=()=>database?Promise.resolve(database):new Promise((resolve,reject)=>{const r=indexedDB.open('mobilidade-unifor-n2',1);r.onupgradeneeded=()=>{const d=r.result;for(const store of ['scenarios','files','receipts','sessions','intents'])d.createObjectStore(store)};r.onsuccess=()=>{database=r.result;resolve(database)};r.onerror=()=>reject(r.error)});
export async function ler(store,key){if(store==='scenarios')return transacionar(key,b=>b);const db=await abrir();return new Promise((resolve,reject)=>{const t=db.transaction(store,'readonly'),q=t.objectStore(store).get(key);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})}
export async function gravar(store,key,value){const db=await abrir();return new Promise((resolve,reject)=>{const t=db.transaction(store,'readwrite');t.objectStore(store).put(value,key);t.oncomplete=()=>resolve(value);t.onabort=()=>reject(t.error||Error('Gravação abortada.'));t.onerror=()=>{}})}
/* O callback é síncrono: nenhuma espera externa dentro da transação IndexedDB. */
export async function transacionar(scenario,callback,{abort=false,sessionKey=null,opId=null}={}){const db=await abrir();return new Promise((resolve,reject)=>{
 const tx=db.transaction(['scenarios','files','receipts','sessions','intents'],'readwrite'),stores=Object.fromEntries(['scenarios','files','receipts','sessions','intents'].map(k=>[k,tx.objectStore(k)]));let result,error;
 const requests=[stores.scenarios.get(scenario),...(sessionKey?[stores.sessions.get(sessionKey)]:[]),...(opId?[stores.receipts.get([scenario,...(Array.isArray(opId)?opId:[opId])])]:[])];let count=0;
 const done=()=>{if(++count!==requests.length)return;try{const b=requests[0].result;if(migrarBase(b))stores.scenarios.put(b,scenario);result=callback(b,stores,tx,opId?requests[requests.length-1].result:null,sessionKey?requests[1].result:null);if(abort&&!result?.repetida)tx.abort()}catch(e){error=e;tx.abort()}};
 requests.forEach(q=>q.onsuccess=done);
 tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(error||tx.error||Error('Falha confirmada de gravação; nenhuma alteração desta operação foi persistida.'));tx.onerror=()=>{};
})}
export async function alterarSessao(key,change){const db=await abrir();return new Promise((resolve,reject)=>{const tx=db.transaction('sessions','readwrite'),store=tx.objectStore('sessions'),r=store.get(key);let result,error;r.onsuccess=()=>{try{result=change(r.result);if(result)store.put(result,key)}catch(e){error=e;tx.abort()}};tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(error||tx.error);tx.onerror=()=>{}})}
export async function consultarTx(scenario,opId,session,callback){const db=await abrir();return new Promise((resolve,reject)=>{
 const tx=db.transaction(['scenarios','receipts','sessions'],'readonly'),a=tx.objectStore('scenarios').get(scenario),b=tx.objectStore('receipts').get([scenario,...(Array.isArray(opId)?opId:[opId])]),c=tx.objectStore('sessions').get(session);let error,result;
 tx.oncomplete=()=>{try{migrarBase(a.result);result=callback(a.result,b.result,c.result);resolve(result)}catch(e){reject(e)}};tx.onabort=()=>reject(tx.error);tx.onerror=()=>{};
})}
