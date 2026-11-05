/* Esquema de negócio 2; os object stores IndexedDB continuam na versão 1.
 * Migração aditiva e idempotente: não recria cenários, recibos ou eventos. */
export const ESQUEMA_ATUAL=2;
export function migrarBase(base){
 if(!base)return false;
 const anterior=base.schemaVersion??1;
 if(anterior>ESQUEMA_ATUAL)throw Error('Base de uma versão posterior. Use a aplicação correspondente.');
 if(anterior===ESQUEMA_ATUAL)return false;
 for(const pedido of Object.values(base.entities.pedidos||{})){
  for(const item of pedido.itens){
   // A confirmação histórica v1 já representava registro integral. Preservá-la
   // não é inferir suficiência de anexos novos: somente esta migração a reconhece.
   item.registroCobertura??={suficiente:item.estado==='Deferido'&&!!item.provas?.length,
    provasSuficientes:item.estado==='Deferido'?[...new Set(item.provas||[])]:[],
    origem:'confirmacao-legada-v1',legadoPreservado:true};
  }
  pedido.schemaVersion=ESQUEMA_ATUAL;
 }
 for(const exp of Object.values(base.entities.exportacoes||{})){
  exp.finalidade??='parecer-legado-a-verificar';
 }
 base.schemaVersion=ESQUEMA_ATUAL;
 base.migracoes??=[];base.migracoes.push({de:anterior,para:ESQUEMA_ATUAL,tipo:'aditiva',instanteReferencia:base.clock,
  descricao:'Confirmações anteriores preservadas; suficiência explícita para novos vínculos. Exportações legadas verificadas antes da consulta.'});
 return true;
}
