export class Falha extends Error{constructor(mensagem,tipo='validacao',campos={}){super(mensagem);this.tipo=tipo;this.campos=campos}}
export const exigir=(v,m,t='validacao',campos={})=>{if(!v)throw new Falha(m,t,campos)};
export const normal=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export const uuid=()=>crypto.randomUUID();
export const clone=x=>structuredClone(x);
export const atuais=(b,k)=>Object.values(b.entities[k]);
export const vigente=ed=>ed.versoes.find(v=>v.numero===ed.versaoAtual);
export const ocupadas=(b,ed)=>Number(ed.ocupacaoInicial||0)+Object.values(ed.ocupacoes||{}).filter(Boolean).length;
export const ativas=(b,g)=>Number(g.ocupacaoInicial||0)+atuais(b,'concessoes').filter(x=>x.bolsaId===g.id&&x.ativa).length;
export const janela=(b,ed)=>!ed.publicada?'Não publicada':ed.encerrada?'Encerradas':!vigente(ed)?'Não detalhadas':b.clock<vigente(ed).inicio?'Não iniciadas':b.clock>vigente(ed).fim?'Encerradas':'Abertas';
export const dataISO=v=>{exigir(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-03:00$/.test(v||''),'Data/hora inválida; use Brasília (UTC−03).');dataDia(v.slice(0,10));const d=new Date(v);exigir(Number.isFinite(+d)&&Number(v.slice(11,13))<24&&Number(v.slice(14,16))<60&&Number(v.slice(17,19))<60,'Data/hora inválida.');return v};
export function dataDia(v){exigir(/^\d{4}-\d{2}-\d{2}$/.test(v||''),'Informe uma data válida.');exigir(new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v,'Data inválida.');return v}
export const humano=i=>i?new Date(i).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'Não informado';
export const curso=account=>account.cursoId;
export function escopo(b,actor){return actor.role?.tipo==='gestao'?actor.role.carteiras[b.carteira]:null}
export const comunidade=(actor,value)=>!!value&&actor.role?.comunidades?.includes(value);
export function edAutorizada(b,actor,id){return actor.role?.tipo==='gestao'&&escopo(b,actor)?.edicoes.includes(id)}
export function permite(b,actor,kind,o){
 if(!actor?.account?.ativo||!actor.role||!o)return false;
 const role=actor.role.tipo,own=o.studentId===actor.account.id,member=actor.account.comunidades?.includes(o.comunidade);
 if(kind==='edicoes')return role==='estudante'?o.publicada:edAutorizada(b,actor,o.id);
 if(kind==='candidaturas')return role==='estudante'?own:edAutorizada(b,actor,o.edicaoId)&&o.estado!=='Rascunho';
 if(kind==='bolsas')return edAutorizada(b,actor,o.edicaoId);
 if(kind==='concessoes'){const c=b.entities.candidaturas[o.candidaturaId];return role==='estudante'?c?.studentId===actor.account.id:edAutorizada(b,actor,c?.edicaoId)}
 if(kind==='mobilidades')return role==='estudante'?own:edAutorizada(b,actor,o.edicaoId);
 if(kind==='pedidos')return role==='estudante'?own:role==='coordenador'&&o.enviado&&actor.role.cursos.includes(o.cursoId);
 if(kind==='instituicoes')return role==='gestao'&&escopo(b,actor)?.paises.includes(o.pais)&&actor.role.instituicoes.includes(o.scopeName||o.nome);
 if(kind==='convenios')return role==='gestao'&&escopo(b,actor)?.paises.includes(o.pais)&&actor.role.instituicoes.includes(o.scopeName||o.instituicao)&&o.areas.some(a=>escopo(b,actor).areas.some(x=>normal(a).includes(normal(x))||normal(x).includes(normal(a))));
 if(kind==='materiais'||kind==='eventos')return role==='estudante'?member&&['Publicado','Cancelado'].includes(o.estado):role==='gestao'&&comunidade(actor,o.comunidade)&&actor.role.conteudos.includes(o.pais);
 if(kind==='relatos')return role==='estudante'&&member?(own||o.estado==='Publicado'):role==='gestao'&&comunidade(actor,o.comunidade);
 if(kind==='perfisMentor')return role==='estudante'&&member&&(own||o.disponivel);
 if(kind==='perfisTandem')return role==='estudante'&&member&&(own||o.ativo);
 if(kind==='vinculos')return role==='estudante'&&member&&[o.remetente,o.destinatario].includes(actor.account.id);
 if(kind==='topicos')return role==='estudante'?member&&o.estado!=='Removido':role==='gestao'&&comunidade(actor,o.comunidade);
 if(kind==='respostas'){const t=b.entities.topicos[o.topicoId];return role==='estudante'?member&&o.estado!=='Removida'&&t?.estado!=='Removido':role==='gestao'&&comunidade(actor,o.comunidade)}
 if(kind==='denuncias')return role==='gestao'?comunidade(actor,o.comunidade):role==='estudante'&&member&&o.denuncianteId===actor.account.id;
 if(kind==='medidas')return role==='gestao'&&comunidade(actor,o.comunidade);
 if(kind==='orcamentos')return role==='estudante'&&own;
 if(kind==='exportacoes'){const p=b.entities.pedidos[o.pedidoId];return p&&permite(b,actor,'pedidos',p)}
 return false;
}
export function acesso(b,actor,kind,id){const o=b.entities[kind]?.[id];exigir(o,'Registro não encontrado.','nao_encontrado');exigir(permite(b,actor,kind,o),'Seu contexto não tem acesso a este registro.','acesso');return o}
export function obrigatorias(v){return [{id:'matricula',titulo:'Matrícula ativa'},{id:'integralizacao',titulo:'Integralização de 30% a 70%'},{id:'pmg',titulo:'PMG mínimo 7,0'},{id:'reprovacoes',titulo:'Ausência de reprovações'}].concat((v.documentos||[]).filter(x=>x.obrigatorio).map(x=>({id:'doc:'+x.id,titulo:x.titulo})),v.proficiencia?[{id:'idioma',titulo:v.proficiencia}]:[])}
const num=v=>v===''||v==null?null:Number(String(v).replace(',','.'));
export function orientacao(d){
 const ints=num(d.integralizacao),pmg=num(d.pmg),errors={};
 for(const [k,v,limit]of [['integralizacao',ints,100],['pmg',pmg,10]])if(v!==null&&(!Number.isFinite(v)||v<0||v>limit))errors[k]='Formato numérico inválido.';
 const vals=[['matricula',d.matricula?normal(d.matricula)==='ativa':null],['integralizacao',ints===null?null:ints>=30&&ints<=70],['pmg',pmg===null?null:pmg>=7],['reprovacoes',d.reprovacoes?['nenhuma','nao','0'].includes(normal(d.reprovacoes)):null]];
 return {erros:errors,itens:vals.map(([id,ok])=>({id,resultado:ok===null?'Sem informação':ok?'Atendido':'Não atendido'})),rotulo:Object.keys(errors).length?'Formato inválido':vals.some(x=>x[1]===null)?'Avaliação incompleta':vals.every(x=>x[1])?'Critérios declarados atendidos':'Há critérios não atendidos'};
}
export function orcamento(p){
 const errors={},values={};for(const k of ['passagem','documentacao','moradia','alimentacao','transporte']){const v=String(p[k]??'').trim();if(!/^\d+(?:[.,]\d{1,2})?$/.test(v))errors[k]='Informe valor não negativo com até duas casas.';else values[k]=Math.round(Number(v.replace(',','.'))*100)}
 const months=String(p.meses??'').trim();if(!/^[1-9]\d*$/.test(months))errors.meses='Informe meses inteiros positivos.';if(!String(p.moeda||'').trim())errors.moeda='Informe uma moeda.';
 if(Object.keys(errors).length)return {valido:false,errors};
 const mensal=values.moradia+values.alimentacao+values.transporte,total=values.passagem+values.documentacao+Number(months)*mensal;exigir(Number.isSafeInteger(total),'Valor fora da precisão suportada.');return {valido:true,...values,meses:Number(months),mensal,periodo:Number(months)*mensal,total,moeda:p.moeda};
}
export function coberturaConfirmada(item,pedido){
 const registro=item.registroCobertura;if(item.estado!=='Deferido'||registro?.suficiente!==true||!registro.provasSuficientes?.length)return false;
 if(registro.legadoPreservado===true&&registro.origem==='confirmacao-legada-v1')return true;
 return registro.provasSuficientes.every(id=>item.provas?.includes(id)&&pedido.provas?.some(p=>p.id===id&&p.cobertura.includes(item.id)&&p.confirmados.includes(item.id)));
}
export function resumo(p){
 const items=p.itens,N=items.length,A=items.filter(x=>x.estado==='Em análise').length,C=items.filter(x=>x.estado==='Complementação solicitada').length,D=items.filter(x=>x.estado==='Deferido').length,I=items.filter(x=>x.estado==='Indeferido').length,K=items.filter(x=>coberturaConfirmada(x,p)).length,P=A+C;
 return {total:N,pendentes:P,deferidos:D,indeferidos:I,comprovados:K,analise:C?'Complementação pendente':A?'Em análise':'Decidida',resultado:P?'Pendente':D===N?'Deferimento total':D?'Deferimento parcial':'Indeferimento total',registro:!D?P?'Não habilitado — análise pendente':'Não se aplica — nenhum item deferido':!K?'Aguardando registro':K<D?'Registro parcialmente confirmado':P?'Registros dos deferidos atuais confirmados — análise ainda pendente':'Registro confirmado',processo:!P&&K===D?'Encerrada':'Em andamento'};
}
export function identidades(item,mob){
 const o=item.origem,c=item.credito;
 exigir(o&&c&&o.instituicao&&o.periodo&&o.ocorrencia&&o.referencia&&(o.codigo||o.pagina),'Identidade de origem insuficiente ou ambígua. Esclareça instituição, período e ocorrência/entrada do histórico.');
 exigir(c.cursoId&&c.matriz&&(c.codigo||c.referencia),'Identidade do componente pretendido insuficiente.');
 const scope=[normal(c.cursoId),normal(c.matriz)].join('|'),creditos=[c.id?scope+'|id:'+normal(c.id):null,c.codigo?scope+'|codigo:'+normal(c.codigo):null,c.referencia?scope+'|referencia:'+normal(c.referencia):null].filter(Boolean);
 return {creditos,origem:[mob,normal(o.instituicao),normal(o.codigo||'p'+o.pagina),normal(o.periodo),normal(o.ocorrencia)].join('|'),entrada:[mob,normal(o.instituicao),normal(o.periodo),normal(o.pagina||'codigo'+o.codigo),normal(o.ocorrencia)].join('|'),credito:[c.cursoId,normal(c.matriz),normal(c.codigo||c.referencia)].join('|'),referenciaCredito:[c.cursoId,normal(c.matriz),normal(c.referencia)].join('|')};
}
export function verificarIdentidades(b,p,ignoreSelf=true){
 const others=atuais(b,'pedidos').filter(x=>x.studentId===p.studentId&&x.enviado&&(!ignoreSelf||x.id!==p.id));
 const current=p.itens.map(item=>({item,key:identidades(item,p.mobilidadeId)}));
 const previous=others.flatMap(other=>other.itens.map(item=>({item,key:identidades(item,other.mobilidadeId)})));
 // Identificadores declarados/confiáveis formam aliases da mesma identidade.
 // A ligação é transitiva e vale dentro e entre pedidos; nomes e PDFs não são chaves.
 const parents=new Map(),find=x=>{if(!parents.has(x))parents.set(x,x);if(parents.get(x)!==x)parents.set(x,find(parents.get(x)));return parents.get(x)};
 for(const {key}of [...current,...previous])for(const token of key.creditos)parents.set(find(token),find(key.creditos[0]));
 const origins=new Set(),entries=new Set(),credits=new Set();
 for(const {item,key}of current){
  const credit=find(key.creditos[0]);
  exigir(!origins.has(key.origem)&&!entries.has(key.entrada),'A mesma origem não pode ser fracionada ou repetida neste pedido.');
  exigir(!credits.has(credit),'Crédito pretendido duplicado ou ambíguo neste pedido. Código divergente não cria outra identidade.');
  origins.add(key.origem);entries.add(key.entrada);credits.add(credit);
  for(const {item:old,key:ok}of previous){
   exigir(ok.origem!==key.origem&&ok.entrada!==key.entrada,'Essa origem já consta em pedido enviado, inclusive decidido.');
   exigir(find(ok.creditos[0])!==credit||old.estado==='Indeferido','Crédito já reservado, deferido ou registrado em outro pedido.');
  }
 }
}
export function indicadores(b,actor,f){
 exigir(actor.role.tipo==='gestao','Acesso exclusivo da carteira.','acesso');if(f.inicio)dataISO(f.inicio);if(f.fim)dataISO(f.fim);exigir(!f.inicio||!f.fim||f.inicio<=f.fim,'Período invertido.');if(f.edicaoId)exigir(edAutorizada(b,actor,f.edicaoId),'Oportunidade fora da carteira.','acesso');
 const rows=atuais(b,'candidaturas').filter(x=>x.protocolo&&permite(b,actor,'candidaturas',x)&&(!f.edicaoId||x.edicaoId===f.edicaoId)&&(!f.inicio||x.primeiroEnvio>=f.inicio)&&(!f.fim||x.primeiroEnvio<=f.fim));
 const group=fn=>Object.entries(rows.reduce((a,x)=>(a[fn(x)]=(a[fn(x)]||0)+1,a),{})).map(([grupo,quantidade])=>({grupo,quantidade}));
 return {instante:b.clock,filtros:clone(f),total:rows.length,pais:group(x=>b.entities.edicoes[x.edicaoId].pais),curso:group(x=>x.identificacao.curso),estado:group(x=>x.estado)};
}
export function contatos(b,actor,v,accounts){
 acesso(b,actor,'vinculos',v.id);if(v.estado!=='Ativo'||!v.consentimentos[v.remetente]||!v.consentimentos[v.destinatario])return [];
 return [v.remetente,v.destinatario].map(id=>{const a=accounts.find(x=>x.id===id);return {nome:a.nome,canal:v.canais[id],valor:a[v.canais[id]]}});
}
