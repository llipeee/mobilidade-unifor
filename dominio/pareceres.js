import {exigir,clone,acesso,resumo,uuid} from './modelo.js';
import {parecer,validarPDF,textoPDF} from './documentos.js';

// Capacidade interna, efêmera: um payload/arquivo do chamador não a substitui.
const preparados=new WeakMap();
const congelar=o=>{if(o&&typeof o==='object'&&!Object.isFrozen(o)){for(const v of Object.values(o))congelar(v);Object.freeze(o)}return o};
export function validarComandoExportacao(command){
 exigir(Object.keys(command.payload||{}).length===0&&!(command.files||[]).length,
  'O parecer é gerado a partir do pedido autorizado. Não informe documento ou arquivo substituto.','finalidade');
}
export async function prepararParecer(base,actor,command){
 validarComandoExportacao(command);
 exigir(actor.role.tipo==='coordenador','Exportação exclusiva da Coordenação.','acesso');
 const pedido=acesso(base,actor,'pedidos',command.objectId);
 exigir(command.expected?.rev==null||pedido.rev===command.expected.rev,'Pedido alterado. Reconsulte antes de exportar.','conflito');
 const fotografia={pedido:clone(pedido),resumo:resumo(pedido),instante:base.clock,autor:actor.account.id,autorNome:actor.account.nome};
 const blob=await parecer(fotografia.pedido,fotografia.resumo,fotografia.instante,actor.account.nome);
 const meta=await validarPDF(blob,{nome:blob.name,upload:false});
 const arquivo=Object.freeze({id:'upload-'+uuid(),blob,...meta,finalidade:'parecer-aproveitamento',pedidoId:pedido.id});congelar(fotografia);
 const token=Object.freeze({});preparados.set(token,Object.freeze({arquivo,fotografia,scenario:base.id,epoch:base.epoch,rev:pedido.rev}));
 return {token,arquivo};
}
export function parecerPreparado(token,base,actor,command){
 validarComandoExportacao(command);
 const x=preparados.get(token),pedido=acesso(base,actor,'pedidos',command.objectId);
 exigir(x&&x.scenario===base.id&&x.epoch===base.epoch&&x.fotografia.autor===actor.account.id&&x.fotografia.pedido.id===pedido.id,
  'Parecer gerado para este pedido é obrigatório.','finalidade');
 exigir(x.rev===pedido.rev&&x.fotografia.instante===base.clock&&JSON.stringify(x.fotografia.pedido)===JSON.stringify(pedido),
  'A fotografia do pedido mudou durante a geração. Reconsulte e confirme nova exportação.','conflito');
 return x;
}

const legadosVerificados=new Map();
export async function finalidadeExportacao(exp,arquivo,namespace){
 if(!arquivo?.blob)return false;
 if(exp.finalidade==='parecer-aproveitamento')return exp.fotografia?.pedido?.id===exp.pedidoId&&arquivo.finalidade==='parecer-aproveitamento'&&arquivo.pedidoId===exp.pedidoId;
 // A versão recebida não guardava finalidade. Não apagar nem bloquear um
 // parecer legítimo: comparar seu conteúdo com a fotografia histórica gravada.
 const chave=JSON.stringify([namespace,exp,arquivo.id,arquivo.blob.size]);
 if(legadosVerificados.has(chave))return legadosVerificados.get(chave);
 let valido=false;
 try{
  exigir(exp.itens?.length&&exp.resumo&&exp.instante,'Fotografia legada incompleta.');
  const esperado=await parecer({id:exp.pedidoId,protocolo:exp.pedidoId,itens:exp.itens},exp.resumo,exp.instante);
  valido=await textoPDF(arquivo.blob)===await textoPDF(esperado);
 }catch(_){valido=false}
 legadosVerificados.set(chave,valido);return valido;
}
