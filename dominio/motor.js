import * as DB from './persistencia.js';
import {Falha,exigir,uuid,clone,permite,acesso,atuais,indicadores,contatos,resumo,orientacao,orcamento,humano,vigente,ocupadas,ativas,janela} from './modelo.js';
import {criarContexto,autorizarIntencao,fileRefs} from './operacoes.js';
import {validarPDF} from './documentos.js';
import {migrarBase} from './migracoes.js';
import {prepararParecer,finalidadeExportacao} from './pareceres.js';
export const contas=await fetch('dados/contas.json').then(r=>r.json());
const credentials=await fetch('dados/credenciais_demo.json').then(r=>r.json());
export const cenarios=await fetch('dados/cenarios.json').then(r=>r.json());
const samples=await fetch('dados/documentos.json').then(r=>r.json());
let base=null,sessionKey=sessionStorage.getItem('mu-n2-session'),fault='normal',queryOffline=false,refreshFailure=false;
const bc=new BroadcastChannel('mobilidade-n2');const listeners=new Set();
let inFlight=new Map();
function autorizarRecibo(b,a,receipt,command){
 exigir(receipt.owner===a.account.id&&receipt.context===a.role.tipo,'Recibo fora do contexto autorizado.','acesso');
 if(command.type==='forum.report'){acesso(b,a,'denuncias',receipt.result.id);return}
 if(['forum.reply','forum.topic'].includes(command.type)){const o=b.entities[receipt.result.kind]?.[receipt.result.id];exigir(o?.autorId===a.account.id,'Recibo de outra autoria.','acesso');return}
 if(command.type==='ap.export'){acesso(b,a,'pedidos',command.objectId);const exp=b.entities.exportacoes[receipt.result.id];exigir(exp?.pedidoId===command.objectId,'Recibo de exportação incompatível.','acesso');return}
 autorizarIntencao(b,a,command);
}
const sha=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('');
const getActor=session=>{
 exigir(session&&session.valida&&Date.now()-session.lastHuman<1800000,'Sessão encerrada ou expirada. Entre novamente.','sessao');const account=contas.find(x=>x.id===session.accountId&&x.ativo);const role=account?.papeis.find(x=>x.tipo===session.context);exigir(account&&role,'Contexto não autorizado.','acesso');return {account,role};
};
export async function sessao(){if(!sessionKey)return null;const session=await DB.ler('sessions',sessionKey);try{return {...getActor(session),session}}catch(_){return null}}
export async function entrar(login,password){const cred=credentials.find(x=>x.login===login);if(!cred||await sha(cred.salt+password)!==cred.hash)throw new Falha('Não foi possível entrar. Confira seus dados','entrada');const a=contas.find(x=>x.login===login&&x.ativo);exigir(a,'Não foi possível entrar. Confira seus dados','entrada');const s={id:uuid(),accountId:a.id,context:a.papeis.length===1?a.papeis[0].tipo:null,lastHuman:Date.now(),valida:true};sessionKey=s.id;sessionStorage.setItem('mu-n2-session',s.id);await DB.gravar('sessions',s.id,s);return a}
export async function contexto(tipo){exigir(sessionKey,'Entre novamente.','sessao');await DB.alterarSessao(sessionKey,s=>{exigir(s&&s.valida&&Date.now()-s.lastHuman<1800000,'Sessão expirada.','sessao');const a=contas.find(x=>x.id===s.accountId&&x.ativo);exigir(a?.papeis.some(x=>x.tipo===tipo),'Contexto não atribuído.','acesso');s.context=tipo;s.lastHuman=Date.now();return s});return sessao()}
export async function sair(){if(sessionKey)await DB.alterarSessao(sessionKey,s=>s?{...s,valida:false}:null);sessionKey=null;sessionStorage.removeItem('mu-n2-session')}
export async function atividade(event){if(!event.isTrusted||!sessionKey)return;const key=sessionKey,instant=Date.now();await DB.alterarSessao(key,s=>{if(s&&s.valida&&instant-s.lastHuman<1800000){s.lastHuman=Math.max(s.lastHuman,instant);return s}return null})}
export async function abrirCenario(id,{restaurar=false,confirmado=false}={}){
 exigir(cenarios.some(x=>x.id===id),'Cenário inexistente.');if(restaurar)exigir(confirmado===true,'Restauração exige confirmação explícita.');
 let saved=await DB.ler('scenarios',id);
 if(!saved||restaurar){
  const seed=await fetch('dados/'+id+'.json').then(r=>r.json());seed.epoch=uuid();migrarBase(seed);seed.fileMetadata={};const refs=fileRefs(seed);const files=[];
  for(const d of samples.filter(x=>refs.has(x.id))){const blob=await fetch(d.path).then(r=>r.blob());const meta=await validarPDF(blob,{nome:d.nome});files.push({...d,...meta,blob});seed.fileMetadata[d.id]={...meta}}
  await DB.transacionar(id,(old,stores)=>{if(old&&!restaurar){saved=old;return}stores.scenarios.put(seed,id);for(const f of files)stores.files.put(f,[id,seed.epoch,f.id]);saved=seed});
 }
 base=saved;localStorage.setItem('mu-n2-last-scenario',id);bc.postMessage({scenario:id,epoch:base.epoch,revision:base.revision});return base;
}
export async function atualizar(){if(refreshFailure)throw new Falha('Consulta indisponível. A última consulta não representa o estado atual.','consulta');await autor();base=await DB.ler('scenarios',base.id);return base}
export async function autor(){exigir(sessionKey,'Entre novamente.','sessao');return getActor(await DB.ler('sessions',sessionKey))}
export async function executar(command){
 exigir(command.confirmado===true,'Confirme a operação antes de gravar.');exigir(command.opId,'Operação sem referência interna.');const key=command.opId;
 if(inFlight.has(key))return inFlight.get(key);
 const promise=(async()=>{
  const actor=await autor();const hash=await sha(JSON.stringify({type:command.type,objectId:command.objectId,payload:command.payload}));
  const intent=await DB.ler('intents',[base.id,command.epoch,actor.account.id,actor.role.tipo,key]);if(intent?.status==='incerta'&&queryOffline)throw new Falha('Consulta indisponível. A incerteza permanece.','desconhecido');
  const found=await DB.consultarTx(base.id,[command.epoch,key],sessionKey,(current,previous,session)=>{const a=getActor(session);if(!previous)return null;autorizarRecibo(current,a,previous,command);exigir(previous.hash===hash&&previous.epoch===current.epoch,'Operação ou cenário incompatível.','conflito');return previous});
  if(found){if(intent?.status==='incerta'){intent.status='concluida';intent.consultada=true;await DB.gravar('intents',[base.id,command.epoch,actor.account.id,actor.role.tipo,key],intent)}return {...found,repetida:true}}
  if(intent?.status==='incerta'&&!intent.consultada)throw new Falha('Consulte o resultado autorizado antes de repetir.','desconhecido');
  const files=[];let exportacaoPreparada=null;
  if(command.type==='ap.export'){
   const atual=await DB.ler('scenarios',base.id);autorizarIntencao(atual,actor,command);
   const gerado=await prepararParecer(atual,actor,command);exportacaoPreparada=gerado.token;files.push(gerado.arquivo);
  }else for(const f of command.files||[]){const meta=await validarPDF(f.blob,{nome:f.nome});exigir(/^upload-[0-9a-f-]{36}$/.test(f.id),'Referência de arquivo inválida.');files.push({...f,...meta})}
  const attemptFault=fault;fault='normal';const scenario=base.id,epoch=command.epoch;
  await DB.gravar('intents',[scenario,epoch,actor.account.id,actor.role.tipo,key],{command:{...command,files:undefined},owner:actor.account.id,context:actor.role.tipo,scenario,epoch,status:'pendente'});
  try{
   const receipt=await DB.transacionar(scenario,(current,stores,tx,previous,session)=>{
    const live=getActor(session);exigir(current,'Cenário ausente.');
    if(previous){autorizarRecibo(current,live,previous,command);exigir(previous.hash===hash,'Referência de operação reutilizada com dados diferentes.','conflito');exigir(previous.epoch===current.epoch,'Cenário restaurado; reconsulte.','conflito');return {...previous,repetida:true}}
    exigir(current.epoch===epoch,'O cenário foi restaurado em outra aba. Reconsulte.','conflito');autorizarIntencao(current,live,command);
    const before=clone(current.entities),eventStart=current.events.length;
    const {result,orientacoes}=criarContexto(current,live,command,files,contas,exportacaoPreparada);current.revision++;const used=fileRefs(current);for(const f of files)if(used.has(f.id)){stores.files.add(f,[scenario,epoch,f.id]);current.fileMetadata??={};current.fileMetadata[f.id]={nome:f.nome,tamanho:f.tamanho,paginas:f.paginas,mime:f.mime,estruturaValidada:true}}
    const snapshot=o=>{if(!o)return null;const copy=clone(o);for(const k of ['historico','versoes','conferencias'])delete copy[k];return copy};
    for(const event of current.events.slice(eventStart)){
     const kinds=Object.keys(current.entities).filter(k=>current.entities[k][event.objeto]&&JSON.stringify(snapshot(before[k]?.[event.objeto]))!==JSON.stringify(snapshot(current.entities[k][event.objeto])));
     const kind=kinds.includes(result.kind)?result.kind:kinds[0];if(kind){event.tipoObjeto=kind;event.antes=snapshot(before[kind]?.[event.objeto]);event.depois=snapshot(current.entities[kind][event.objeto])}
    }
    const rec={opId:key,owner:live.account.id,context:live.role.tipo,epoch,hash,type:command.type,objectId:command.objectId,instante:current.clock,result,orientacoes};stores.scenarios.put(current,scenario);stores.receipts.put(rec,[scenario,epoch,key]);stores.intents.put({owner:live.account.id,context:live.role.tipo,scenario,epoch,status:attemptFault==='desconhecido'?'incerta':'concluida',command:{...command,files:undefined}},[scenario,epoch,live.account.id,live.role.tipo,key]);return rec;
   },{sessionKey,opId:[epoch,key],abort:['falha','desconhecido_sem_gravar'].includes(attemptFault)});
   base=await DB.ler('scenarios',scenario);bc.postMessage({scenario,epoch:base.epoch,revision:base.revision});
   if(attemptFault==='desconhecido')throw new Falha('O retorno não confirmou o resultado. Consulte a operação antes de repetir.','desconhecido');
   return receipt;
  }catch(error){
   if(error.tipo==='desconhecido')throw error;
   if(attemptFault==='desconhecido_sem_gravar'){await DB.gravar('intents',[scenario,epoch,actor.account.id,actor.role.tipo,key],{command:{...command,files:undefined},owner:actor.account.id,context:actor.role.tipo,scenario,epoch,status:'incerta'});throw new Falha('Resultado desconhecido. Consulte antes de repetir.','desconhecido')}
   if(['conflito','versao'].includes(error.tipo))base=await DB.ler('scenarios',scenario);
   if(error instanceof Falha)throw error;const failure=new Falha('Falha confirmada de gravação. Nenhum efeito próprio foi persistido.','falha');failure.cause=error;throw failure;
  }
 })();inFlight.set(key,promise);try{return await promise}finally{inFlight.delete(key)}
}
export async function consultarOperacao(command){
 if(queryOffline)throw new Falha('Consulta do resultado indisponível. A incerteza permanece; não repita ainda.','desconhecido');
 const actor=await autor(),epoch=command.epoch;const receipt=await DB.consultarTx(base.id,[epoch,command.opId],sessionKey,(current,receipt,session)=>{
  const a=getActor(session);exigir(current.epoch===epoch,'Cenário restaurado; a operação pertence a outro recorte salvo.','conflito');if(receipt){autorizarRecibo(current,a,receipt,command);return receipt}autorizarIntencao(current,a,command);return null;
 });
 const intent=await DB.ler('intents',[base.id,epoch,actor.account.id,actor.role.tipo,command.opId]);if(intent){intent.consultada=true;intent.status=receipt?'concluida':'nao_encontrada';await DB.gravar('intents',[base.id,epoch,actor.account.id,actor.role.tipo,command.opId],intent)}base=await DB.ler('scenarios',base.id);return receipt;
}
export async function pendencias(){const a=await autor(),db=await DB.abrir();return new Promise((resolve,reject)=>{const t=db.transaction('intents'),r=t.objectStore('intents').getAll();r.onsuccess=()=>resolve(r.result.filter(x=>x.scenario===base.id&&x.epoch===base.epoch&&x.owner===a.account.id&&x.context===a.role.tipo&&x.status==='incerta'));r.onerror=()=>reject(r.error)})}
async function verificarExportacao(b,a,exp){
 acesso(b,a,'exportacoes',exp.id);const f=await DB.ler('files',[b.id,b.epoch,exp.documento]);
 exigir(await finalidadeExportacao(exp,f,b.id+'|'+b.epoch),'Arquivo indisponível para a finalidade de parecer deste pedido. O registro anterior foi preservado.','finalidade');return f;
}
export async function documento(kind,id,fileId){const a=await autor();await atualizar();const o=acesso(base,a,kind,id);
 if(kind==='exportacoes'){exigir(fileId===o.documento,'Documento não é o parecer desta exportação.','acesso');return verificarExportacao(base,a,o)}
 exigir(fileRefs(o).has(fileId),'Documento não vinculado a este objeto.','acesso');
 if(kind==='pedidos'){
  const diretos=new Set([...(o.historicos||[]),...o.itens.flatMap(x=>x.ementas||[]),...(o.provas||[]).map(x=>x.documento)]);
  if(!diretos.has(fileId)){
   const exports=atuais(base,'exportacoes').filter(x=>x.pedidoId===id&&x.documento===fileId);exigir(exports.length,'PDF não pertence a uma finalidade autorizada deste pedido.','acesso');
   for(const exp of exports)try{return await verificarExportacao(base,a,exp)}catch(e){if(e.tipo!=='finalidade')throw e}
   exigir(false,'Arquivo indisponível para a finalidade de parecer deste pedido.','finalidade');
  }
 }
 const f=await DB.ler('files',[base.id,base.epoch,fileId]);exigir(f?.blob,'Arquivo não disponível; metadado não satisfaz upload.','documento');return f;
}
export async function consulta(kind,filters={}){const a=await autor();const rows=atuais(base,kind).filter(o=>permite(base,a,kind,o)).filter(o=>Object.entries(filters).every(([k,v])=>!v||String(o[k]??'').toLowerCase().includes(String(v).toLowerCase())));if(kind!=='exportacoes')return rows;const allowed=[];for(const exp of rows)try{await verificarExportacao(base,a,exp);allowed.push(exp)}catch(e){if(e.tipo!=='finalidade')throw e}return allowed}
export async function obter(kind,id){const a=await autor(),o=acesso(base,a,kind,id);if(kind==='exportacoes')await verificarExportacao(base,a,o);return clone(o)}
export function preparar(type,objectId,payload={},expected={}){return {opId:uuid(),type,objectId,payload,expected,epoch:base.epoch,confirmado:true,files:[]}}
export const injetar=(type)=>{fault=type};export const disponibilidadeConsulta=v=>queryOffline=!v;export const disponibilidadeLeitura=v=>refreshFailure=!v;
export const assinar=fn=>{listeners.add(fn);return ()=>listeners.delete(fn)};
bc.onmessage=async event=>{if(base&&event.data.scenario===base.id){try{if(await sessao()){await atualizar();for(const fn of listeners)fn()}}catch(_){}}};
export const estado=()=>base;
export const amostras=()=>samples;
const reports=new Map();
export async function consultarIndicadores(filtros){const a=await autor();await atualizar();const r=indicadores(base,a,filtros),id=uuid();reports.set(id,{owner:a.account.id,context:a.role.tipo,scenario:base.id,epoch:base.epoch,carteira:JSON.stringify(a.role.carteiras?.[base.carteira]),resultado:clone(r)});return {...r,consultaId:id}}
export async function exportarCSV(id){const a=await autor(),q=reports.get(id);exigir(q&&a.role.tipo==='gestao'&&q.owner===a.account.id&&q.context===a.role.tipo&&q.scenario===base.id&&q.epoch===base.epoch&&q.carteira===JSON.stringify(a.role.carteiras?.[base.carteira]),'Consulta de indicadores fora do contexto autorizado.','acesso');const r=q.resultado,rows=[['Instante',r.instante],['Oportunidade',r.filtros.edicaoId||'Todas da carteira'],['Primeiro envio de',r.filtros.inicio||'Sem limite'],['Primeiro envio até',r.filtros.fim||'Sem limite'],['Total',r.total],['Dimensão','Grupo','Quantidade']];for(const [dim,groups]of [['País',r.pais],['Curso declarado',r.curso],['Estado atual',r.estado]])for(const x of groups)rows.push([dim,x.grupo,x.quantidade]);return new Blob(['\ufeff'+rows.map(row=>row.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'})}
export async function consultarContatos(id){const a=await autor();await atualizar();const v=acesso(base,a,'vinculos',id);return contatos(base,a,v,contas)}
export const condicoesConsulta=()=>({queryOffline,refreshFailure});
export {DB,resumo,orientacao,orcamento,humano,vigente,ocupadas,ativas,janela};
