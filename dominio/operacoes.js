import {ESQUEMA_ATUAL} from './migracoes.js';
import {validarComandoExportacao,parecerPreparado} from './pareceres.js';
/* Comandos síncronos sobre a cópia lida na transação. Sem I/O e sem sucesso antecipado. */
import {exigir,Falha,uuid,clone,atuais,vigente,ocupadas,ativas,janela,acesso,permite,edAutorizada,escopo,comunidade,obrigatorias,orientacao,orcamento,resumo,identidades,verificarIdentidades,dataISO,dataDia,normal} from './modelo.js';
const nonempty=(v,m)=>{exigir(String(v??'').trim(),m);return String(v).trim()};
const student=a=>exigir(a.role.tipo==='estudante','Ação exclusiva do estudante.','acesso');
const manager=a=>exigir(a.role.tipo==='gestao','Ação exclusiva da Gestão.','acesso');
const coordinator=a=>exigir(a.role.tipo==='coordenador','Ação exclusiva da Coordenação.','acesso');
const definitive=i=>['Deferido','Indeferido'].includes(i.estado);
const terminal=c=>['Não selecionada','Desistida','Recusada no destino','Concluída'].includes(c.estado);
export const fileRefs=x=>{const result=new Set();const walk=v=>{if(typeof v==='string'&&/^(pdf-|upload-)/.test(v))result.add(v);else if(v&&typeof v==='object')Object.values(v).forEach(walk)};walk(x);return result};
export function criarContexto(b,a,command,staged,accounts,exportacaoPreparada=null){
 const p=command.payload||{},eid=command.objectId;let touched=new Set(),result,orientacoes=[];
 const oldRefs=fileRefs(b),newRefs=new Set(staged.map(f=>f.id));
 const file=id=>{exigir(id&&(oldRefs.has(id)||newRefs.has(id)),'É necessário um PDF disponível e validado, não apenas metadados.');return id};
 const ownFile=(id,entity)=>{exigir(id&&(newRefs.has(id)||fileRefs(entity).has(id)),'Documento de outra finalidade ou registro não pode ser vinculado.','acesso');return file(id)};
 const fresh=id=>{exigir(newRefs.has(id),'Anexe uma nova resposta PDF válida para cada documento solicitado.');return file(id)};
 const get=(k,id=eid)=>acesso(b,a,k,id);
 const bump=o=>{if(!touched.has(o)){o.rev=(o.rev||0)+1;touched.add(o)}};
 const event=(o,title,reason='',before=null,executor=null)=>{
  const ev={id:uuid(),operacao:command.opId,instante:b.clock,autor:a.account.nome,autorId:a.account.id,contexto:a.role.tipo,executor:executor||a.account.nome,objeto:o.id,titulo:title,motivo:reason,anterior:before,novo:o.estado||null};o.historico??=[];o.historico.push(ev);b.events.push(ev);bump(o);return ev;
 };
 const notify=(recipients,title,objectType,objectId,reason='')=>{for(const id of new Set(recipients.filter(Boolean)))b.notices.push({id:uuid(),destinatario:id,titulo:title,tipo:objectType,objetoId:objectId,motivo:reason,instante:b.clock,lido:false,operacao:command.opId})};
 const managers=ed=>accounts.filter(x=>x.ativo&&x.papeis.some(r=>r.tipo==='gestao'&&r.carteiras[b.carteira]?.edicoes.includes(ed))).map(x=>x.id);
 const coords=course=>accounts.filter(x=>x.ativo&&x.papeis.some(r=>r.tipo==='coordenador'&&r.cursos.includes(course))).map(x=>x.id);
 const moderators=comm=>accounts.filter(x=>x.ativo&&x.papeis.some(r=>r.tipo==='gestao'&&r.comunidades.includes(comm))).map(x=>x.id);
 const done=(kind,o,extra={})=>({kind,id:o.id,estado:o.estado,...extra});
 const requireState=(o,states)=>exigir(states.includes(o.estado),'O estado atual é '+o.estado+'. Reconsulte antes de decidir.','conflito');
 const checkVersion=o=>{if(command.expected?.rev!=null)exigir(o.rev===command.expected.rev,'O registro mudou desde a revisão. O estado atual será apresentado.','conflito')};
 const nextProtocol=prefix=>{const key=prefix+'-'+b.clock.slice(0,4);b.counters[key]=(b.counters[key]||0)+1;return key+'-'+String(b.counters[key]).padStart(3,'0')};
 const mergeDocs=(previous,incoming,entity)=>{const out=clone(previous||{});for(const [k,ids]of Object.entries(incoming||{})){const arr=Array.isArray(ids)?ids:[ids];for(const id of arr.filter(Boolean)){ownFile(id,entity);out[k]??=[];if(!out[k].includes(id))out[k].push(id)}}return out};
 const affect=(c,reason)=>{
  const ed=b.entities.edicoes[c.edicaoId];if(ed?.ocupacoes[c.id]){ed.ocupacoes[c.id]=false;event(ed,'Vaga liberada',reason)}
  for(const g of atuais(b,'concessoes').filter(g=>g.candidaturaId===c.id&&g.ativa)){g.ativa=false;g.cancelamento={motivo:reason,iniciador:a.account.id,executor:'Sistema',instante:b.clock};event(g,'Concessão cancelada automaticamente',reason,null,'Sistema');const bolsa=b.entities.bolsas[g.bolsaId];event(bolsa,'Disponibilidade liberada',reason,null,'Sistema')}
 };
 const closedMob=(id,owner=a.account.id)=>{const m=b.entities.mobilidades[id];exigir(m&&m.studentId===owner&&m.estado==='Concluída','A ação exige conclusão própria registrada.');return m};
 const checkOffer=(ed,v)=>{
  exigir(edAutorizada(b,a,ed.id),'Edição fora da carteira.','acesso');
  nonempty(v.destino,'Informe o destino.');nonempty(v.pais,'Informe o país.');nonempty(v.area,'Informe a área.');nonempty(v.duracao,'Informe a duração.');
  exigir(Number.isInteger(Number(p.capacidade??ed.capacidade))&&Number(p.capacidade??ed.capacidade)>0,'Vagas devem ser inteiras positivas.');exigir(Number(p.capacidade??ed.capacidade)>=ocupadas(b,ed),'Capacidade inferior às vagas ocupadas.','conflito');
  dataISO(v.inicio);dataISO(v.fim);exigir(v.fim>v.inicio,'Encerramento deve ser posterior à abertura.');exigir(v.fuso==='America/Sao_Paulo','Use America/Sao_Paulo para as inscrições.');
  exigir(v.criterios?.length===4,'Registre os quatro critérios acadêmicos.');exigir(v.documentos?.length,'Defina os documentos exigidos.');for(const d of v.documentos){nonempty(d.id,'Identifique a exigência.');nonempty(d.titulo,'Informe o documento exigido.')}exigir(new Set(v.documentos.map(d=>d.id)).size===v.documentos.length,'Exigências documentais duplicadas.');ownFile(v.edital,ed);
  const cv=b.entities.convenios[p.convenioId||ed.convenioId];exigir(cv&&permite(b,a,'convenios',cv)&&cv.confirmado&&cv.ativo&&cv.inicio<=b.clock.slice(0,10)&&cv.fim>=b.clock.slice(0,10),'Publicação/retificação exige convênio vigente e autorizado.');exigir(cv.pais===v.pais&&normal(cv.instituicao)===normal(v.destino),'Destino deve corresponder à instituição/país do convênio vinculado.');exigir(cv.areas.some(x=>normal(x).includes(normal(v.area))||normal(v.area).includes(normal(x))),'Área não abrangida pelo convênio vinculado.');
  return cv;
 };
 const verifyAP=(request)=>{verificarIdentidades(b,request);exigir(request.itens.every(x=>x.credito.cursoId===request.cursoId),'Componente pretendido fora do curso do pedido.');};
 switch(command.type){
 case 'draft.save':case 'candidate.send':{
  student(a);exigir(a.account.unifor,'Estudante estrangeiro recebido mantém consulta informativa, sem candidatura de saída.','acesso');
  const ed=b.entities.edicoes[p.edicaoId];exigir(ed&&ed.publicada,'Oportunidade não publicada.');
  let c=b.entities.candidaturas[eid];if(c)exigir(c.studentId===a.account.id,'Rascunho de outra pessoa.','acesso');
  const sent=atuais(b,'candidaturas').find(x=>x.studentId===a.account.id&&x.edicaoId===ed.id&&x.protocolo);
  if(sent){result=done('candidaturas',sent,{existente:true});break}
  if(c){requireState(c,['Rascunho']);checkVersion(c);exigir(c.edicaoId===ed.id,'Não é possível trocar a edição do rascunho.');}
  const v=vigente(ed);exigir(v&&ed.dadosCompletos,'As condições desta oportunidade ainda não estão detalhadas para novo envio.');
  const evals=orientacao(p.declaracao||{});exigir(!Object.keys(evals.erros).length,'Revise o formato dos dados acadêmicos.','validacao',evals.erros);
  const fields={nome:p.nome??c?.identificacao.nome??a.account.nome,curso:p.curso??c?.identificacao.curso??a.account.curso,cursoId:a.account.cursoId};
  const current=c||{documentos:{}};const documents=mergeDocs(current.documentos,p.documentos,current);
  if(command.type==='candidate.send'){
   exigir(p.versaoConfirmada===ed.versaoAtual,'O edital mudou. Confira as novas condições e confirme novamente.','versao');
   exigir(!ed.encerrada&&b.clock>=v.inicio&&b.clock<=v.fim,'Recebimento fora da janela inclusiva de inscrições.');
   for(const f of v.camposObrigatorios||['nome','curso'])nonempty(fields[f]??p.declaracao?.[f],'Campo obrigatório ausente: '+f);
   for(const req of v.documentos.filter(x=>x.obrigatorio))exigir(documents[req.id]?.length,'Anexe '+req.titulo+'.');
  }
  if(!c)c={id:eid&&eid!=='novo'?eid:'rascunho-'+uuid(),rev:0,studentId:a.account.id,edicaoId:ed.id,estado:'Rascunho',protocolo:null,primeiroEnvio:null,documentos:{},historico:[],pedidos:[],respostasExternas:[],conferencia:null,selecao:null,inicio:null,retorno:null};
  c.documentos=documents;c.documentosInfo??={};for(const fid of newRefs)if(Object.values(documents).flat().includes(fid))c.documentosInfo[fid]={origem:command.type==='candidate.send'?'Original do envio':'Versão de rascunho',instante:b.clock};c.identificacao=fields;c.declaracao=clone(p.declaracao||c.declaracao||{});c.versaoAplicavel=ed.versaoAtual;c.interesses=(p.interesses||[]).filter(id=>ed.bolsas.includes(id));
  if(command.type==='candidate.send'){
   const oldId=c.id;delete b.entities.candidaturas[oldId];c.id=nextProtocol('MU');c.protocolo=c.id;c.estado='Enviada';c.primeiroEnvio=b.clock;c.condicoes=clone(v);event(c,'Candidatura enviada');notify([a.account.id,...managers(ed.id)],'Candidatura enviada','candidaturas',c.id);
  }else event(c,'Rascunho salvo');
  b.entities.candidaturas[c.id]=c;result=done('candidaturas',c);break;
 }
 case 'candidate.review':{
  manager(a);const c=get('candidaturas');checkVersion(c);requireState(c,['Enviada']);const old=c.estado;c.estado='Em análise';event(c,'Análise iniciada','',old);notify([c.studentId],'Candidatura em análise','candidaturas',c.id);result=done('candidaturas',c);break;
 }
 case 'candidate.conference':{
  manager(a);const c=get('candidaturas');checkVersion(c);requireState(c,['Em análise']);const v=c.condicoes||b.entities.edicoes[c.edicaoId].versoes.find(x=>x.numero===c.versaoAplicavel);const all=fileRefs(c.documentos);
  for(const req of obrigatorias(v)){const r=p.resultados?.[req.id];exigir(r&&typeof r.comprovado==='boolean','Confira cada exigência: '+req.titulo);if(r.comprovado){nonempty(r.observacao,'Descreva a evidência conferida para '+req.titulo);exigir(r.evidencias?.length&&r.evidencias.every(x=>all.has(x)),'Selecione evidências documentais desta candidatura.');}}
  c.conferencias??=[];if(c.conferencia)c.conferencias.push(c.conferencia);c.conferencia={autor:a.account.id,autorNome:a.account.nome,instante:b.clock,resultados:clone(p.resultados),observacao:p.observacao||''};event(c,'Conferência humana registrada');result=done('candidaturas',c);break;
 }
 case 'candidate.request':{
  manager(a);const c=get('candidaturas');checkVersion(c);requireState(c,['Em análise','Documentação pendente']);nonempty(p.motivo,'Justifique o pedido ou renovação.');dataISO(p.prazo);exigir(p.prazo>b.clock,'O prazo deve ser futuro.');
  const v=c.condicoes||b.entities.edicoes[c.edicaoId].versoes.find(x=>x.numero===c.versaoAplicavel),allowed=new Set(v.documentos.map(x=>x.id));exigir(p.documentos?.length&&p.documentos.every(x=>allowed.has(x)),'Peça somente documentos das condições aplicáveis ao envio.');
  const previous=c.pedidos.find(x=>x.vigente),documents=[...new Set([...(previous?.documentos||[]),...p.documentos])];if(previous){previous.vigente=false;previous.fimMotivo='Substituído por pedido renovado'}
  c.pedidos.push({id:uuid(),numero:c.pedidos.length+1,motivo:p.motivo,inicio:b.clock,prazo:p.prazo,vigente:true,documentos:documents,respostas:[],autor:a.account.id});c.estado='Documentação pendente';if(c.conferencia){c.conferencias??=[];c.conferencias.push(c.conferencia);c.conferencia=null}event(c,previous?'Complementação renovada':'Complementação solicitada',p.motivo);notify([c.studentId],'Complementação solicitada','candidaturas',c.id,p.motivo+' Prazo: '+p.prazo);result=done('candidaturas',c);break;
 }
 case 'candidate.resume':{
  manager(a);const c=get('candidaturas');checkVersion(c);requireState(c,['Documentação pendente']);nonempty(p.motivo,'Justifique a retomada.');for(const req of c.pedidos.filter(x=>x.vigente)){req.vigente=false;req.fimMotivo='Superado por retomada motivada'}c.estado='Em análise';c.conferencia=null;event(c,'Análise retomada sem presumir entrega',p.motivo);notify([c.studentId],'Análise retomada','candidaturas',c.id,p.motivo);result=done('candidaturas',c);break;
 }
 case 'candidate.complement':{
  student(a);const c=get('candidaturas');checkVersion(c);requireState(c,['Documentação pendente']);const req=c.pedidos.find(x=>x.vigente&&x.id===p.pedidoId);exigir(req,'Pedido não vigente. Reconsulte.','conflito');exigir(b.clock>=req.inicio&&b.clock<=req.prazo,'Prazo próprio de complementação vencido. O processo permanece pendente.');
  const responses=[];for(const key of req.documentos){const id=fresh(p.documentos?.[key]);c.documentos[key]??=[];c.documentos[key].push(id);c.documentosInfo??={};c.documentosInfo[id]={origem:'Resposta ao pedido '+req.numero,instante:b.clock,original:c.documentos[key][0]};responses.push(id)}req.respostas=responses;req.vigente=false;req.fimMotivo='Resposta documental recebida no prazo';req.respondidoEm=b.clock;c.estado='Em análise';c.conferencia=null;event(c,'Complemento recebido; retorno à análise');notify([c.studentId,...managers(c.edicaoId)],'Complemento recebido','candidaturas',c.id);result=done('candidaturas',c);break;
 }
 case 'candidate.select':case 'candidate.reject':{
  manager(a);const c=get('candidaturas');checkVersion(c);requireState(c,['Em análise']);nonempty(p.motivo,'Informe a justificativa.');exigir(c.conferencia,'Registre a conferência humana.');const ed=b.entities.edicoes[c.edicaoId],v=c.condicoes||ed.versoes.find(x=>x.numero===c.versaoAplicavel);
  if(command.type==='candidate.select'){
   exigir(obrigatorias(v).every(x=>c.conferencia.resultados[x.id]?.comprovado),'Existem exigências ainda não comprovadas.');for(const d of v.documentos.filter(x=>x.obrigatorio))exigir(c.documentos[d.id]?.length,'Documento obrigatório ausente.');exigir(ocupadas(b,ed)<ed.capacidade,'Não há vaga disponível no estado atual.','conflito');ed.ocupacoes[c.id]=true;event(ed,'Vaga ocupada pela seleção',p.motivo);c.selecao={autor:a.account.nome,autorId:a.account.id,instante:b.clock,justificativa:p.motivo};c.estado='Selecionada';
  }else c.estado='Não selecionada';
  event(c,c.estado,p.motivo);notify([c.studentId],c.estado,'candidaturas',c.id,p.motivo);result=done('candidaturas',c);break;
 }
 case 'candidate.withdraw':{
  student(a);const c=get('candidaturas');if(c.estado==='Desistida'){result=done('candidaturas',c,{existente:true});break}checkVersion(c);requireState(c,['Enviada','Em análise','Documentação pendente','Selecionada']);const reason='Desistência da candidatura';affect(c,reason);for(const req of c.pedidos.filter(x=>x.vigente)){req.vigente=false;req.fimMotivo=reason}c.estado='Desistida';event(c,'Desistência confirmada',reason);notify([c.studentId,...managers(c.edicaoId)],'Desistência e efeitos registrados','candidaturas',c.id,reason);result=done('candidaturas',c);break;
 }
 case 'candidate.accept':case 'candidate.refuse':case 'candidate.depart':case 'candidate.return':{
  manager(a);const c=get('candidaturas');checkVersion(c);dataDia(p.data);if(['candidate.depart','candidate.return'].includes(command.type))exigir(p.data<=b.clock.slice(0,10),'A data efetiva não pode ser futura.');
  if(command.type==='candidate.accept'){
   requireState(c,['Selecionada']);const document=ownFile(p.documento,c);c.respostasExternas.push({tipo:'Aceite',data:p.data,documento:document,referencia:p.referencia||'',autor:a.account.id,instante:b.clock});event(c,'Aceite externo registrado; início ainda não registrado');
  }else if(command.type==='candidate.refuse'){
   requireState(c,['Selecionada']);nonempty(p.motivo,'Informe o motivo da recusa.');nonempty(p.referencia,'Informe a referência da resposta externa.');if(p.documento)ownFile(p.documento,c);c.respostasExternas.push({tipo:'Recusa',data:p.data,documento:p.documento||null,referencia:p.referencia,motivo:p.motivo,autor:a.account.id,instante:b.clock});affect(c,'Recusa da instituição de destino');c.estado='Recusada no destino';event(c,'Recusa formalizada no destino','Recusa da instituição de destino: '+p.motivo);
  }else if(command.type==='candidate.depart'){
   requireState(c,['Selecionada']);exigir(c.respostasExternas.some(x=>x.tipo==='Aceite'&&x.documento),'Registre aceite externo com PDF válido antes do início.');c.inicio=p.data;c.estado='Em mobilidade';const id=nextProtocol('MB');c.mobilidadeId=id;b.entities.mobilidades[id]={id,rev:1,studentId:c.studentId,candidaturaId:c.id,edicaoId:c.edicaoId,instituicao:b.entities.edicoes[c.edicaoId].destino,cidade:b.entities.edicoes[c.edicaoId].cidade,pais:b.entities.edicoes[c.edicaoId].pais,estado:'Em mobilidade',aceite:clone(c.respostasExternas.filter(x=>x.tipo==='Aceite').at(-1)),inicio:p.data,retorno:null,historico:[]};event(c,'Início efetivo registrado');
  }else{
   requireState(c,['Em mobilidade']);exigir(p.data>=c.inicio,'Retorno anterior ao início.');c.retorno=p.data;c.estado='Concluída';const m=b.entities.mobilidades[c.mobilidadeId];exigir(m,'Mobilidade vinculada não encontrada.');m.estado='Concluída';m.retorno=p.data;event(m,'Conclusão registrada');event(c,'Retorno e conclusão registrados');
  }
  notify([c.studentId,...(command.type==='candidate.refuse'?managers(c.edicaoId):[])],c.estado==='Recusada no destino'?'Recusa e recursos atualizados':'Atualização da mobilidade','candidaturas',c.id,p.motivo||'');result=done('candidaturas',c);break;
 }
 case 'grant.save':{
  manager(a);exigir(edAutorizada(b,a,p.edicaoId),'Edição fora da carteira.','acesso');const ed=b.entities.edicoes[p.edicaoId];exigir(ed,'Edição não encontrada.');let g=b.entities.bolsas[eid];if(g){get('bolsas');checkVersion(g);exigir(g.edicaoId===p.edicaoId,'Não troque a edição de uma bolsa existente.');}
  nonempty(p.nome,'Informe o nome.');nonempty(p.regras,'Informe regras.');nonempty(p.cumulacao,'Informe a regra de cumulação aplicável.');nonempty(p.periodo,'Informe o período.');nonempty(p.moeda,'Informe a moeda.');exigir(/^\d+(?:[.,]\d{1,2})?$/.test(String(p.valor)),'Valor monetário inválido.');exigir(Number.isInteger(Number(p.limite))&&Number(p.limite)>0,'Limite inteiro positivo obrigatório.');if(g)exigir(Number(p.limite)>=ativas(b,g),'Limite inferior às concessões ativas.','conflito');
  g??={id:eid&&eid!=='novo'?eid:nextProtocol('BOL'),rev:0,ocupacaoInicial:0,historico:[]};Object.assign(g,{edicaoId:ed.id,nome:p.nome,regras:p.regras,cumulacao:p.cumulacao,valor:String(p.valor),moeda:p.moeda,periodo:p.periodo,limite:Number(p.limite)});b.entities.bolsas[g.id]=g;if(!ed.bolsas.includes(g.id)){ed.bolsas.push(g.id);event(ed,'Bolsa vinculada')}event(g,'Bolsa mantida');result=done('bolsas',g);break;
 }
 case 'grant.give':case 'grant.deny':{
  manager(a);const g=get('bolsas'),c=get('candidaturas',p.candidaturaId);checkVersion(g);exigir(g.edicaoId===c.edicaoId,'Bolsa e candidatura pertencem a edições diferentes.');requireState(c,['Selecionada']);exigir(c.interesses.includes(g.id),'Interesse não registrado nesta bolsa.');nonempty(p.motivo,'Justifique a decisão.');
  if(command.type==='grant.give'){
   exigir(p.regrasConferidas===true,'Confirme a conferência das regras e da cumulação.');exigir(!atuais(b,'concessoes').some(x=>x.candidaturaId===c.id&&x.bolsaId===g.id&&x.ativa),'Já existe concessão ativa desta bolsa para a candidatura.','conflito');exigir(ativas(b,g)<g.limite,'Não há concessão disponível no limite atual.','conflito');const id=nextProtocol('CON');const grant={id,rev:1,bolsaId:g.id,candidaturaId:c.id,ativa:true,autor:a.account.id,instante:b.clock,motivo:p.motivo,historico:[]};b.entities.concessoes[id]=grant;event(grant,'Concessão ativa registrada',p.motivo);event(g,'Disponibilidade ocupada',p.motivo);event(c,'Bolsa concedida',p.motivo);result=done('bolsas',g,{concessaoId:id});
  }else{event(g,'Concessão negada',p.motivo);event(c,'Decisão de bolsa: não concedida',p.motivo);result=done('bolsas',g)}notify([c.studentId],command.type==='grant.give'?'Bolsa concedida':'Decisão de bolsa','candidaturas',c.id,p.motivo);break;
 }
 case 'grant.cancel':{
  manager(a);const g=get('concessoes');if(!g.ativa){result=done('concessoes',g,{existente:true});break}checkVersion(g);nonempty(p.motivo,'Informe o motivo do cancelamento.');g.ativa=false;g.cancelamento={motivo:p.motivo,iniciador:a.account.id,executor:a.account.id,instante:b.clock};const bolsa=b.entities.bolsas[g.bolsaId],c=b.entities.candidaturas[g.candidaturaId];event(g,'Concessão cancelada manualmente',p.motivo);event(bolsa,'Disponibilidade liberada; vaga preservada',p.motivo);event(c,'Cancelamento isolado da bolsa',p.motivo);notify([c.studentId],'Bolsa cancelada','candidaturas',c.id,p.motivo);result=done('bolsas',bolsa);break;
 }
 case 'institution.save':case 'agreement.save':{
  manager(a);let o=b.entities[command.type==='institution.save'?'instituicoes':'convenios'][eid];if(o){get(command.type==='institution.save'?'instituicoes':'convenios');checkVersion(o)}
  if(command.type==='institution.save'){
   const scopeName=o?.scopeName||o?.nome||p.nome;exigir(a.role.instituicoes.includes(scopeName)&&escopo(b,a).paises.includes(p.pais),'Instituição/país fora da atribuição prévia.','acesso');nonempty(p.nome,'Informe a instituição.');o??={id:eid==='novo'?nextProtocol('INST'):eid,rev:0,historico:[]};Object.assign(o,{nome:p.nome,pais:p.pais,cidade:p.cidade||'',areas:p.areas||escopo(b,a).areas,scopeName});b.entities.instituicoes[o.id]=o;event(o,'Instituição mantida');result=done('instituicoes',o);break;
  }
  const inst=get('instituicoes',p.instituicaoId);dataDia(p.inicio);dataDia(p.fim);exigir(p.fim>=p.inicio,'Fim de vigência anterior ao início.');exigir(p.areas?.length,'Informe áreas atendidas.');exigir(p.areas.every(x=>escopo(b,a).areas.some(y=>normal(x).includes(normal(y))||normal(y).includes(normal(x)))),'Área fora da carteira.','acesso');ownFile(p.documento,o||{});
  const overlap=atuais(b,'convenios').filter(x=>x.id!==eid&&x.instituicaoId===inst.id&&x.inicio<=p.fim&&x.fim>=p.inicio);if(overlap.length)orientacoes.push('Sobreposição com '+overlap.map(x=>x.id).join(', ')+'. Cadastro preservado mediante confirmação.');
  o??={id:eid==='novo'?nextProtocol('CV'):eid,rev:0,historico:[],documentos:[]};Object.assign(o,{instituicaoId:inst.id,instituicao:inst.nome,scopeName:inst.scopeName||inst.nome,pais:inst.pais,areas:p.areas,inicio:p.inicio,fim:p.fim,documento:p.documento,confirmado:true,ativo:o.ativo??true});o.documentos??=[];if(!o.documentos.includes(p.documento))o.documentos.push(p.documento);b.entities.convenios[o.id]=o;event(o,'Convênio cadastrado/atualizado');result=done('convenios',o);break;
 }
 case 'agreement.inactivate':{
  manager(a);const o=get('convenios');checkVersion(o);if(!o.ativo){result=done('convenios',o,{existente:true});break}nonempty(p.motivo,'Justifique a inativação.');o.ativo=false;event(o,'Convênio inativado',p.motivo);const affected=atuais(b,'edicoes').filter(x=>x.convenioId===o.id&&x.publicada);for(const ed of affected)notify(managers(ed.id),'Convênio inativo; oportunidade preservada','edicoes',ed.id,p.motivo);result=done('convenios',o);break;
 }
 case 'offer.draft':case 'offer.publish':case 'offer.rectify':{
  manager(a);exigir(edAutorizada(b,a,eid),'Edição fora da carteira atribuída.','acesso');let ed=b.entities.edicoes[eid];if(ed){get('edicoes');checkVersion(ed)}else ed={id:eid,rev:0,publicada:false,encerrada:false,versaoAtual:null,versoes:[],ocupacaoInicial:0,ocupacoes:{},bolsas:[],historico:[]};
  const v=clone(p.condicoes);exigir(v,'Informe as condições.');if(v.edital)ownFile(v.edital,ed);
  if(command.type==='offer.draft'){
   exigir(!ed.publicada,'Uma publicada deve ser retificada, sem editar sua versão vigente.');ed.rascunho=v;ed.capacidade=Number(p.capacidade||ed.capacidade||0);ed.convenioId=p.convenioId||ed.convenioId;Object.assign(ed,{destino:v.destino,pais:v.pais,area:v.area,cidade:v.cidade});b.entities.edicoes[eid]=ed;event(ed,'Rascunho de oportunidade salvo');result=done('edicoes',ed);break;
  }
  if(command.type==='offer.publish')exigir(!ed.publicada&&!ed.encerrada,'Edição já publicada ou encerrada.','conflito');
  else{exigir(ed.publicada&&!ed.encerrada,'Edição encerrada não reabre.');exigir(b.clock<=vigente(ed).fim,'Edição expirada não é reaberta por retificação.');nonempty(p.motivo,'Informe o motivo da retificação.');exigir(v.fim>=b.clock,'A nova janela não pode terminar antes do instante da decisão.');}
  const cv=checkOffer(ed,v);v.numero=(ed.versaoAtual||0)+1;v.confirmacao={autor:a.account.nome,autorId:a.account.id,instante:b.clock};ed.versoes.push(v);ed.versaoAtual=v.numero;ed.convenioId=cv.id;ed.capacidade=Number(p.capacidade);ed.publicada=true;ed.dadosCompletos=true;ed.rascunho=null;Object.assign(ed,{destino:v.destino,pais:v.pais,area:v.area,cidade:v.cidade});b.entities.edicoes[eid]=ed;event(ed,command.type==='offer.publish'?'Versão inicial publicada':'Retificação publicada',p.motivo||'');if(command.type==='offer.rectify')notify(atuais(b,'candidaturas').filter(x=>x.edicaoId===eid&&x.protocolo).map(x=>x.studentId),'Edital retificado; condições do envio preservadas','edicoes',eid,p.motivo);result=done('edicoes',ed);break;
 }
 case 'offer.close':{
  manager(a);const ed=get('edicoes');checkVersion(ed);if(ed.encerrada){result=done('edicoes',ed,{existente:true});break}exigir(ed.publicada,'Oportunidade ainda não publicada.');ed.encerrada=true;event(ed,'Inscrições encerradas',p.motivo||'Encerramento confirmado');result=done('edicoes',ed);break;
 }
 case 'ap.draft':case 'ap.send':{
  student(a);closedMob(p.mobilidadeId);let request=b.entities.pedidos[eid];if(request){get('pedidos');if(request.enviado){result=done('pedidos',request,{existente:true});break}checkVersion(request)}
  const items=clone(p.itens||[]);exigir(items.length,'Inclua pelo menos um item.');const histDocs=(p.historicos||[]).map(x=>ownFile(x,request||{}));
  for(let index=0;index<items.length;index++){const item=items[index];item.id=item.id||'I-'+String(index+1).padStart(2,'0');item.estado='Preenchido';item.parecer=null;item.pedidos=[];item.provas=[];item.confirmacoesRegistro=[];item.registroCobertura={suficiente:false,provasSuficientes:[],origem:'nao-confirmada'};for(const f of item.ementas||[])ownFile(f,request||{});if(command.type==='ap.send'){nonempty(item.origem?.disciplina,'Informe a disciplina de origem.');nonempty(item.credito?.componente,'Informe o componente pretendido.');exigir(Number(item.origem.cargaHoraria)>0&&Number(item.credito.cargaHoraria)>0,'Cargas horárias devem ser positivas.');exigir(item.ementas?.length,'Ementa PDF ausente.');identidades(item,p.mobilidadeId)}}
  const candidate={id:request?.id||eid,studentId:a.account.id,mobilidadeId:p.mobilidadeId,cursoId:a.account.cursoId,itens:items,enviado:false};if(command.type==='ap.send'){exigir(histDocs.length,'Anexe o histórico da mobilidade.');verifyAP(candidate)}
  request??={id:eid&&eid!=='novo'?eid:'rascunho-ap-'+uuid(),rev:0,historico:[],provas:[]};Object.assign(request,{schemaVersion:ESQUEMA_ATUAL,studentId:a.account.id,mobilidadeId:p.mobilidadeId,cursoId:a.account.cursoId,curso:a.account.curso,itens:items,historicos:histDocs,enviado:command.type==='ap.send'});
  if(request.enviado){delete b.entities.pedidos[request.id];request.id=nextProtocol('AP');request.protocolo=request.id;request.itens.forEach(x=>x.estado='Em análise');event(request,'Pedido de aproveitamento enviado');notify([request.studentId,...coords(request.cursoId)],'Aproveitamento enviado','pedidos',request.id)}else event(request,'Rascunho de aproveitamento salvo');b.entities.pedidos[request.id]=request;result=done('pedidos',request);break;
 }
 case 'ap.request':case 'ap.decide':{
  coordinator(a);const request=get('pedidos');checkVersion(request);exigir(request.enviado,'Pedido ainda não enviado.');exigir(resumo(request).processo!=='Encerrada','Solicitação encerrada não reabre.');const item=request.itens.find(x=>x.id===p.itemId);exigir(item,'Item não encontrado.');exigir(!definitive(item),'Parecer definitivo não pode ser reaberto.','conflito');nonempty(p.motivo,'Informe justificativa ao estudante.');
  if(command.type==='ap.request'){
   nonempty(p.documentoExigido,'Identifique o documento solicitado para este item.');item.pedidos.forEach(x=>{x.vigente=false});item.pedidos.push({id:uuid(),motivo:p.motivo,documento:p.documentoExigido,instante:b.clock,vigente:true,autor:a.account.id});item.estado='Complementação solicitada';event(request,'Complemento solicitado: '+item.id,p.motivo);
  }else{
   exigir(item.estado==='Em análise','Aguarde reenvio do complemento deste item.');verifyAP(request);exigir(item.ementas.length&&request.historicos.length,'Documentos obrigatórios ausentes.');exigir(['Deferido','Indeferido'].includes(p.decisao),'Escolha deferir ou indeferir.');item.estado=p.decisao;item.parecer={autor:a.account.nome,autorId:a.account.id,instante:b.clock,justificativa:p.motivo};event(request,'Parecer definitivo: '+item.id,p.motivo);
  }
  notify([request.studentId],'Atualização de aproveitamento','pedidos',request.id,p.motivo);if(resumo(request).processo==='Encerrada')notify([request.studentId],'Aproveitamento encerrado','pedidos',request.id);result=done('pedidos',request);break;
 }
 case 'ap.complement':{
  student(a);const request=get('pedidos');checkVersion(request);exigir(request.enviado&&resumo(request).processo!=='Encerrada','Pedido não admite reenvio.');exigir(p.respostas?.length,'Selecione os itens solicitados.');
  for(const response of p.respostas){const item=request.itens.find(x=>x.id===response.itemId);exigir(item&&item.estado==='Complementação solicitada','Responda somente itens com complemento solicitado.');const current=item.pedidos.find(x=>x.vigente&&x.id===response.pedidoId);exigir(current,'Pedido de complemento superado.','conflito');const fid=fresh(response.documento);item.ementas.push(fid);current.vigente=false;current.resposta={documento:fid,instante:b.clock};item.estado='Em análise'}event(request,'Complemento por item recebido');notify([request.studentId,...coords(request.cursoId)],'Complemento de aproveitamento recebido','pedidos',request.id);result=done('pedidos',request);break;
 }
 case 'ap.proof.prepare':case 'ap.proof.confirm':{
  coordinator(a);const request=get('pedidos');checkVersion(request);exigir(resumo(request).processo!=='Encerrada','Solicitação encerrada não recebe novos vínculos.');verifyAP(request);
  if(command.type==='ap.proof.prepare'){
   ownFile(p.documento,request);dataDia(p.data);nonempty(p.referencia,'Informe a referência do registro.');exigir(p.cobertura?.length,'Identifique explicitamente os itens abrangidos.');exigir(p.cobertura.every(id=>request.itens.some(x=>x.id===id&&x.estado==='Deferido')),'Somente itens deferidos podem receber comprovação.');
   const proof={id:'PROVA-'+uuid(),documento:p.documento,data:p.data,referencia:p.referencia,cobertura:[...new Set(p.cobertura)],confirmados:[],autor:a.account.id};request.provas.push(proof);event(request,'Comprovante anexado; vínculos ainda pendentes');result=done('pedidos',request,{provaId:proof.id});
  }else{
   const proof=request.provas.find(x=>x.id===p.provaId);exigir(proof,'Comprovante não encontrado.');dataDia(proof.data);nonempty(proof.referencia,'Referência ausente.');
   exigir(p.itens?.length&&p.itens.every(id=>proof.cobertura.includes(id)&&request.itens.some(x=>x.id===id&&x.estado==='Deferido')),'Cobertura inválida; confirme somente itens deferidos identificados.');
   const ids=[...new Set(p.itens)];exigir(p.avaliacoes&&Object.keys(p.avaliacoes).every(id=>ids.includes(id)),'Informe a avaliação de suficiência de cada item selecionado.');
   const changes=ids.map(id=>{
    const item=request.itens.find(x=>x.id===id),avaliacao=p.avaliacoes[id];
    exigir(avaliacao&&['parcial','suficiente'].includes(avaliacao.resultado),'Indique cobertura parcial ou suficiente para '+id+'.');
    exigir(avaliacao.provas==null||Array.isArray(avaliacao.provas),'Selecione as referências dos comprovantes.');const escolhidas=[...new Set(avaliacao.provas||[])];
    exigir(escolhidas.every(pid=>request.provas.some(x=>x.id===pid&&x.cobertura.includes(id)&&(pid===proof.id||x.confirmados.includes(id)))&&(pid===proof.id||item.provas.includes(pid))),
     'A cobertura deve identificar somente comprovantes com vínculo confirmado para '+id+'.');
    if(avaliacao.resultado==='suficiente')exigir(escolhidas.length,'Identifique o conjunto de comprovantes suficiente para '+id+'.');
    return {item,resultado:avaliacao.resultado,provas:escolhidas,observacao:String(avaliacao.observacao||'')};
   });
   const confirmacao={autor:a.account.nome,autorId:a.account.id,instante:b.clock,itens:ids,avaliacoes:Object.fromEntries(changes.map(x=>[x.item.id,{resultado:x.resultado,provas:x.provas,observacao:x.observacao}]))};
   for(const change of changes){
    const item=change.item;if(!item.provas.includes(proof.id))item.provas.push(proof.id);if(!proof.confirmados.includes(item.id))proof.confirmados.push(item.id);
    if(change.resultado==='suficiente'){
     const suficiente={suficiente:true,provasSuficientes:change.provas,autorId:a.account.id,autor:a.account.nome,instante:b.clock,observacao:change.observacao,origem:'conferencia-coordenacao'};
     item.confirmacoesRegistro??=[];item.confirmacoesRegistro.push(clone(suficiente));item.registroCobertura=suficiente;
    }else item.registroCobertura??={suficiente:false,provasSuficientes:[],origem:'conferencia-coordenacao'};
   }
   proof.confirmacoes??=proof.confirmacao?[clone(proof.confirmacao)]:[];proof.confirmacoes.push(confirmacao);proof.confirmacao=confirmacao;
   event(request,'Vínculos e suficiência de registro conferidos');notify([request.studentId],'Comprovação acadêmica conferida','pedidos',request.id);
   if(resumo(request).processo==='Encerrada'){event(request,'Solicitação encerrada após cobertura suficiente dos deferidos');notify([request.studentId],'Aproveitamento encerrado','pedidos',request.id)}result=done('pedidos',request);
  }break;
 }
 case 'content.save':case 'content.publish':case 'content.withdraw':case 'event.cancel':{
  manager(a);const kind=p.tipo==='evento'?'eventos':'materiais';exigir(['evento','material'].includes(p.tipo),'Tipo de conteúdo inválido.');exigir(!b.entities[kind==='eventos'?'materiais':'eventos'][eid],'ID já pertence a outro tipo de conteúdo; não altere o tipo.');let item=b.entities[kind][eid];if(item){get(kind);checkVersion(item)}else exigir(['content.save','content.publish'].includes(command.type),'Conteúdo não encontrado.');
  if(command.type==='content.withdraw'){exigir(kind==='materiais','Retirada aplica-se a material.');if(item.estado==='Retirado'){result=done(kind,item,{existente:true});break}item.estado='Retirado';event(item,'Material retirado');result=done(kind,item);break}
  if(command.type==='event.cancel'){exigir(kind==='eventos','Cancelamento aplica-se a evento.');nonempty(p.motivo,'Justifique o cancelamento.');if(item.estado==='Cancelado'){result=done(kind,item,{existente:true});break}item.estado='Cancelado';item.cancelamento={motivo:p.motivo,instante:b.clock,autor:a.account.id};event(item,'Evento cancelado',p.motivo);result=done(kind,item);break}
  exigir(a.role.conteudos.includes(p.pais),'País fora da atribuição de conteúdos.','acesso');
  const allowed=kind==='materiais'?['titulo','responsavel','tema','texto','recurso']:['titulo','responsavel','descricao','data','horaInicio','horaFim','local','inscricao'];
  exigir(p.dados&&Object.keys(p.dados).every(key=>allowed.includes(key)),'A manutenção aceita somente os campos editáveis do tipo. Campos de controle não podem ser informados.');
  const data={};for(const key of allowed)if(Object.hasOwn(p.dados,key)){
   if(['recurso','inscricao'].includes(key)){
    const value=p.dados[key],nested=key==='recurso'?['servico','url']:['servico','url','orientacao'];
    exigir(value==null||(typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>nested.includes(k))),'Campos internos de acesso/inscrição não são editáveis.');
    data[key]=value==null?null:Object.fromEntries(nested.filter(k=>Object.hasOwn(value,k)).map(k=>[k,String(value[k]??'')]));if(data[key])data[key].externo=true;
   }else{exigir(typeof p.dados[key]==='string','Campo de conteúdo deve ser texto: '+key);data[key]=p.dados[key]}
  }
  const full=command.type==='content.publish'||(item&&item.estado!=='Rascunho');if(full){nonempty(data.titulo,'Informe o título.');nonempty(data.responsavel,'Informe o responsável.');
  if(kind==='materiais'){nonempty(data.tema,'Informe o tema.');exigir(String(data.texto||'').trim()||String(data.recurso?.url||'').trim(),'Informe texto ou link.');if(data.recurso?.url)exigir(/^https?:\/\//.test(data.recurso.url),'Link externo inválido.');if(data.recurso?.url&&!data.recurso.servico)data.recurso.servico=new URL(data.recurso.url).hostname;}
  else{nonempty(data.descricao,'Informe a descrição.');dataDia(data.data);nonempty(data.horaInicio,'Informe horário.');dataISO(data.data+'T'+data.horaInicio+':00-03:00');data.horaFim=data.horaFim||data.horaInicio;exigir(data.horaFim>=data.horaInicio,'Horário final anterior ao inicial.');nonempty(data.local,'Informe local ou acesso.');nonempty(data.inscricao?.orientacao,'Informe orientação de inscrição.');data.inicio=dataISO(data.data+'T'+data.horaInicio+':00-03:00');data.fim=dataISO(data.data+'T'+data.horaFim+':00-03:00');if(data.inscricao?.url){exigir(/^https?:\/\//.test(data.inscricao.url),'Endereço de inscrição inválido.');data.inscricao.servico=String(data.inscricao.servico||new URL(data.inscricao.url).hostname)}data.fuso='America/Sao_Paulo (UTC−03)';}}
  item??={id:eid==='novo'?'CONT-'+uuid():eid,rev:0,estado:'Rascunho',versao:0,historico:[],versoes:[],comunidade:a.role.comunidades[0]};const old=clone(item);delete old.versoes;delete old.historico;item.versoes??=[];if(item.versao)item.versoes.push(old);Object.assign(item,data,{pais:p.pais,tipo:p.tipo,comunidade:item.comunidade,versao:item.versao+1,atualizadoEm:b.clock});
  if(command.type==='content.publish'){exigir(!['Retirado','Cancelado'].includes(old.estado),'Editar não desfaz retirada/cancelamento.');item.estado='Publicado';item.publicacao={autor:a.account.nome,instante:b.clock}}
  event(item,command.type==='content.publish'?'Conteúdo publicado':'Conteúdo atualizado; situação preservada');b.entities[kind][item.id]=item;result=done(kind,item);break;
 }
 case 'budget.save':{
  student(a);const r=orcamento(p);exigir(r.valido,'Revise a estimativa.','validacao',r.errors);const id=a.account.id,o=b.entities.orcamentos[id]||{id,studentId:id,rev:0,historico:[]};o.valores=clone(p);o.moeda=p.moeda;event(o,'Estimativa atualizada');b.entities.orcamentos[id]=o;result=done('orcamentos',o,{estimativa:r});break;
 }
 case 'story.send':case 'story.resend':case 'story.withdraw':case 'story.moderate':{
  let story=b.entities.relatos[eid];if(story){get('relatos');checkVersion(story)}
  if(command.type==='story.moderate'){
   manager(a);exigir(story&&comunidade(a,story.comunidade),'Relato fora da comunidade.','acesso');requireState(story,['Aguardando moderação']);exigir(['Publicado','Devolvido para correção','Rejeitado'].includes(p.decisao),'Decisão inválida.');if(p.decisao!=='Publicado')nonempty(p.motivo,'Justificativa ao autor é obrigatória.');story.estado=p.decisao;story.decisao={autor:a.account.id,instante:b.clock,motivo:p.motivo||'',decisao:p.decisao};event(story,'Relato: '+p.decisao,p.motivo||'');notify([story.studentId],'Decisão sobre seu relato','relatos',story.id,p.motivo||'');result=done('relatos',story);break;
  }
  student(a);if(story)exigir(story.studentId===a.account.id,'Somente o autor pode alterar/retirar relato.','acesso');
  if(command.type==='story.withdraw'){
   exigir(story,'Relato não encontrado.');if(story.estado==='Retirado'){result=done('relatos',story,{existente:true});break}exigir(!['Rejeitado'].includes(story.estado),'Relato rejeitado não reabre.');story.estado='Retirado';event(story,'Relato retirado pelo autor');notify(moderators(story.comunidade),'Relato retirado pelo autor','relatos',story.id);result=done('relatos',story);break;
  }
  const mob=closedMob(p.mobilidadeId);nonempty(p.titulo,'Informe o título.');nonempty(p.texto,'Informe o relato.');
  if(story){requireState(story,['Devolvido para correção']);exigir(story.mobilidadeId===mob.id,'Não troque a mobilidade do relato.');story.versoes.push({titulo:story.titulo,texto:story.texto,versao:story.versao,decisao:clone(story.decisao)})}else{exigir(command.type==='story.send','Relato para reenvio não encontrado.');story={id:nextProtocol('REL'),rev:0,studentId:a.account.id,mobilidadeId:mob.id,destino:{instituicao:mob.instituicao,pais:mob.pais,cidade:mob.cidade},versao:0,versoes:[],historico:[],comunidade:'Mobilidade Unifor'}}
  story.titulo=p.titulo;story.texto=p.texto;story.versao++;story.estado='Aguardando moderação';story.decisao=null;b.entities.relatos[story.id]=story;event(story,'Relato enviado para moderação');notify([story.studentId,...moderators(story.comunidade)],'Relato aguardando moderação','relatos',story.id);result=done('relatos',story);break;
 }
 case 'mentor.profile':case 'tandem.profile':case 'tandem.deactivate':case 'tandem.activate':{
  student(a);const kind=command.type.startsWith('mentor')?'perfisMentor':'perfisTandem',id=a.account.id;let profile=b.entities[kind][id];if(profile){acesso(b,a,kind,id);checkVersion(profile)}
  if(command.type==='tandem.deactivate'){
   exigir(profile,'Perfil não encontrado.');if(!profile.ativo){result=done(kind,profile,{existente:true});break}profile.ativo=false;for(const v of atuais(b,'vinculos').filter(v=>v.tipo==='tandem'&&v.estado==='Pendente'&&[v.remetente,v.destinatario].includes(id))){v.estado='Cancelado';event(v,'Convite cancelado por desativação do perfil');notify([v.remetente===id?v.destinatario:v.remetente],'Convite cancelado por desativação','vinculos',v.id)}event(profile,'Perfil desativado; parcerias aceitas preservadas');result=done(kind,profile);break;
  }
  if(command.type==='tandem.activate'){exigir(profile,'Perfil não encontrado.');if(profile.ativo){result=done(kind,profile,{existente:true});break}profile.ativo=true;event(profile,'Perfil reativado sem restaurar vínculos');result=done(kind,profile);break}
  nonempty(p.disponibilidade,'Informe disponibilidade.');profile??={id,rev:0,studentId:id,nome:a.account.nome,historico:[],comunidade:'Mobilidade Unifor'};
  if(kind==='perfisMentor'){const m=closedMob(p.mobilidadeId);nonempty(p.temas,'Informe temas.');profile.mobilidadeId=m.id;profile.destino={instituicao:m.instituicao,cidade:m.cidade,pais:m.pais};profile.temas=String(p.temas).split(',').map(x=>x.trim()).filter(Boolean);profile.disponivel=p.disponivel===true;profile.habilitada=true}else{nonempty(p.oferecido,'Informe idioma oferecido.');nonempty(p.interesse,'Informe idioma de interesse.');profile.oferecido=p.oferecido;profile.interesse=p.interesse;profile.ativo=profile.ativo??true}
  profile.disponibilidade=p.disponibilidade;b.entities[kind][id]=profile;event(profile,'Perfil atualizado');result=done(kind,profile);break;
 }
 case 'link.send':case 'link.accept':case 'link.refuse':case 'link.cancel':case 'link.end':{
  student(a);let v=b.entities.vinculos[eid];const who=a.account.id;
  const guardPair=(type,sender,recipient,ignore)=>exigir(!atuais(b,'vinculos').some(x=>x.id!==ignore&&x.tipo===type&&['Pendente','Ativo'].includes(x.estado)&&[sender,recipient].includes(x.remetente)&&[sender,recipient].includes(x.destinatario)),'Já existe solicitação pendente ou vínculo ativo para o par.','conflito');
  const createGuards=(type,sender,recipient,ignore)=>{exigir([sender,recipient].every(id=>accounts.find(x=>x.id===id)?.comunidades?.includes('Mobilidade Unifor')),'Participante fora da comunidade.','acesso');
   exigir(sender!==recipient,'Não é permitida solicitação para si.');guardPair(type,sender,recipient,ignore);
   if(type==='mentoria'){const m=b.entities.perfisMentor[recipient];exigir(m?.disponivel,'Mentor indisponível.');closedMob(m.mobilidadeId,recipient)}else{
    const s=b.entities.perfisTandem[sender],d=b.entities.perfisTandem[recipient];exigir(s?.ativo&&d?.ativo,'Os dois perfis Tandem precisam estar ativos.');exigir(normal(s.oferecido)===normal(d.interesse)&&normal(s.interesse)===normal(d.oferecido),'Idiomas não estão recíprocos no estado atual.');
   }
  };
  if(command.type==='link.send'){
   exigir(['mentoria','tandem'].includes(p.tipo),'Tipo de vínculo inválido.');exigir(accounts.some(x=>x.id===p.destinatario&&x.ativo&&x.papeis.some(y=>y.tipo==='estudante')),'Destinatário inválido.');createGuards(p.tipo,who,p.destinatario);nonempty(p.texto,'Informe a dúvida ou mensagem.');exigir(p.consentimento===true,'Registre seu consentimento inicial.');v={id:(p.tipo==='mentoria'?'MEN-':'TAN-')+uuid(),rev:0,tipo:p.tipo,remetente:who,destinatario:p.destinatario,texto:p.texto,estado:'Pendente',consentimentos:{[who]:true,[p.destinatario]:false},canais:{[who]:'email',[p.destinatario]:'email'},dadosAceitos:null,comunidade:'Mobilidade Unifor',historico:[]};b.entities.vinculos[v.id]=v;event(v,'Solicitação enviada com consentimento inicial');notify([p.destinatario],'Solicitação recebida','vinculos',v.id);result=done('vinculos',v);break;
  }
  v=get('vinculos');checkVersion(v);
  if(command.type==='link.end'){requireState(v,['Ativo']);v.estado='Encerrado';event(v,'Vínculo encerrado por participante');notify([who===v.remetente?v.destinatario:v.remetente],'Vínculo encerrado','vinculos',v.id);result=done('vinculos',v);break}
  requireState(v,['Pendente']);
  if(command.type==='link.cancel'){exigir(who===v.remetente,'Somente remetente cancela pendente.','acesso');v.estado='Cancelado'}
  else{exigir(who===v.destinatario,'Somente destinatário responde.','acesso');if(command.type==='link.refuse'){v.estado='Recusado'}else{
   createGuards(v.tipo,v.remetente,v.destinatario,v.id);exigir(v.consentimentos[v.remetente]&&p.consentimento===true,'Aceite exige os dois consentimentos.');v.consentimentos[who]=true;v.estado='Ativo';v.dadosAceitos=v.tipo==='tandem'?{remetente:clone(b.entities.perfisTandem[v.remetente]),destinatario:clone(b.entities.perfisTandem[v.destinatario])}:{destino:clone(b.entities.perfisMentor[v.destinatario].destino),temas:clone(b.entities.perfisMentor[v.destinatario].temas)};
  }}
  event(v,'Solicitação: '+v.estado);notify([who===v.remetente?v.destinatario:v.remetente],'Resposta à solicitação','vinculos',v.id,v.estado);result=done('vinculos',v);break;
 }
 case 'forum.topic':case 'forum.reply':{
  student(a);nonempty(p.texto,'Informe o texto.');let o,kind;
  if(command.type==='forum.topic'){nonempty(p.titulo,'Informe o título.');nonempty(p.tema,'Informe o tema.');kind='topicos';o={id:nextProtocol('TOP'),rev:0,autorId:a.account.id,autorNome:a.account.nome,titulo:p.titulo,tema:p.tema,texto:p.texto,estado:'Aberto',comunidade:'Mobilidade Unifor',publicacao:b.clock,historico:[]}}
  else{const t=get('topicos');requireState(t,['Aberto']);kind='respostas';o={id:nextProtocol('RESP'),rev:0,topicoId:t.id,autorId:a.account.id,autorNome:a.account.nome,texto:p.texto,estado:'Publicada',comunidade:t.comunidade,publicacao:b.clock,historico:[]}}
  b.entities[kind][o.id]=o;if(kind==='respostas')event(b.entities.topicos[o.topicoId],'Resposta adicionada ao tópico');event(o,kind==='topicos'?'Tópico publicado sem moderação prévia':'Resposta publicada');result=done(kind,o);break;
 }
 case 'forum.report':{
  student(a);exigir(['topicos','respostas'].includes(p.objetoTipo),'Objeto denunciado inválido.');const o=get(p.objetoTipo,p.objetoId);nonempty(p.motivo,'Informe o motivo da denúncia.');const d={id:nextProtocol('DEN'),rev:0,objetoTipo:p.objetoTipo,objetoId:o.id,topicoId:o.topicoId||o.id,denuncianteId:a.account.id,motivo:p.motivo,estado:'Recebida',comunidade:o.comunidade,historico:[]};b.entities.denuncias[d.id]=d;event(d,'Denúncia recebida; conteúdo preservado',p.motivo);notify(moderators(d.comunidade),'Denúncia recebida','denuncias',d.id);result=done('denuncias',d);break;
 }
 case 'forum.measure':{
  manager(a);const kind=p.objetoTipo;exigir(['topicos','respostas'].includes(kind),'Objeto inválido.');const o=get(kind,p.objetoId);exigir(comunidade(a,o.comunidade),'Objeto fora da comunidade atribuída.','acesso');checkVersion(o);nonempty(p.motivo,'Justifique a medida.');exigir(['manter','remover','encerrar'].includes(p.medida),'Medida inválida.');exigir(p.medida!=='encerrar'||kind==='topicos','Encerrar só se aplica a tópico.');
  if(['Removido','Removida'].includes(o.estado))throw new Falha('Conteúdo já removido. Manter não restaura e decisão desatualizada não republica.','conflito');
  if(p.medida==='encerrar')requireState(o,['Aberto']);const previous=o.estado;
  if(p.medida==='remover')o.estado=kind==='topicos'?'Removido':'Removida';if(p.medida==='encerrar')o.estado='Encerrado';
  const same=atuais(b,'medidas').find(x=>x.objetoTipo===kind&&x.objetoId===o.id&&x.medida===p.medida&&x.versaoObjeto===o.rev);
  if(same){for(const d of atuais(b,'denuncias').filter(x=>x.objetoTipo===kind&&x.objetoId===o.id&&x.estado==='Recebida')){d.estado='Tratada';d.medidaId=same.id;event(d,'Denúncia vinculada à medida existente',p.medida);notify([d.denuncianteId],'Sua denúncia foi tratada','denuncias',d.id,'Referência própria '+d.id+'. Medida: '+p.medida)}result=done('medidas',same,{existente:true});break}
  const m={id:'MED-'+uuid(),rev:1,objetoTipo:kind,objetoId:o.id,medida:p.medida,motivo:p.motivo,autor:a.account.id,instante:b.clock,comunidade:o.comunidade,versaoObjeto:o.rev+1,historico:[]};b.entities.medidas[m.id]=m;event(o,'Medida: '+p.medida,p.motivo,previous);event(m,'Medida registrada',p.motivo);
  const affected=kind==='topicos'&&p.medida!=='manter'?atuais(b,'respostas').filter(x=>x.topicoId===o.id):[];
  notify([o.autorId,...affected.map(x=>x.autorId)],'Medida sobre conteúdo da comunidade',kind,o.id,p.motivo);
  for(const d of atuais(b,'denuncias').filter(x=>x.objetoTipo===kind&&x.objetoId===o.id&&x.estado==='Recebida')){d.estado='Tratada';d.medidaId=m.id;event(d,'Denúncia tratada',p.medida);notify([d.denuncianteId],'Sua denúncia foi tratada','denuncias',d.id,'Referência própria '+d.id+'. Medida: '+p.medida+'. O retorno não amplia acesso ao conteúdo.')}
  result=done('medidas',m);break;
 }
 case 'notice.read':{
  const n=b.notices.find(x=>x.id===eid&&x.destinatario===a.account.id);exigir(n,'Aviso não disponível.','acesso');n.lido=true;result={kind:'avisos',id:n.id};break;
 }
 case 'ap.export':{
  coordinator(a);const request=get('pedidos');checkVersion(request);const gerado=parecerPreparado(exportacaoPreparada,b,a,command);exigir(staged.some(f=>f.id===gerado.arquivo.id&&f.blob===gerado.arquivo.blob&&f.finalidade==='parecer-aproveitamento'&&f.pedidoId===request.id),'Arquivo não é o parecer gerado desta fotografia.','finalidade');file(gerado.arquivo.id);
  const x={id:'EXP-'+uuid(),rev:1,pedidoId:request.id,documento:gerado.arquivo.id,finalidade:'parecer-aproveitamento',instante:b.clock,autor:a.account.id,
   fotografia:clone(gerado.fotografia),resumo:clone(gerado.fotografia.resumo),itens:clone(gerado.fotografia.pedido.itens)};
  b.entities.exportacoes[x.id]=x;request.pareceresExportados??=[];request.pareceresExportados.push(x.documento);
  event(request,'Parecer exportado; sem comprovação de registro');result=done('exportacoes',x);break;
 }
 case 'demo.clock':{
  exigir(command.demo===true,'Controle da demonstração requerido.','acesso');dataISO(p.instante);exigir(p.instante>=b.clock,'O relógio de negócio só avança. Restauração é uma ação separada.');const previous=b.clock;b.clock=p.instante;b.events.push({id:uuid(),instante:b.clock,autor:a.account.nome,autorId:a.account.id,executor:'Controle da demonstração',titulo:'Relógio de negócio avançado',anterior:previous,novo:b.clock});
  for(const cv of atuais(b,'convenios').filter(x=>x.confirmado&&x.fim<b.clock.slice(0,10)&&!x.avisoVencimento)){cv.avisoVencimento=b.clock;event(cv,'Vigência vencida; oportunidades preservadas');for(const ed of atuais(b,'edicoes').filter(x=>x.convenioId===cv.id&&x.publicada))notify(managers(ed.id),'Convênio vencido; oportunidade preservada','edicoes',ed.id)}result={kind:'demo',id:b.id,clock:b.clock};break;
 }
 default:throw new Falha('Operação inexistente.','nao_encontrado');
 }
 return {result,orientacoes};
}
/* Autorizar a intenção não depende do estado anterior, para que recibos sejam devolvidos antes das guardas. */
export function autorizarIntencao(b,a,cmd){
 const t=cmd.type,p=cmd.payload||{},id=cmd.objectId;
 if(t==='demo.clock'){exigir(cmd.demo===true,'Controle não autorizado.','acesso');return}
 if(t==='notice.read'){exigir(b.notices.some(x=>x.id===id&&x.destinatario===a.account.id),'Aviso privado.','acesso');return}
 if(t==='draft.save'||t==='candidate.send'){student(a);exigir(a.account.unifor,'Saída não autorizada.','acesso');const old=b.entities.candidaturas[id];if(old)acesso(b,a,'candidaturas',id);else acesso(b,a,'edicoes',p.edicaoId);return}
 const kinds={'candidate.':'candidaturas','grant.give':'bolsas','grant.deny':'bolsas','grant.cancel':'concessoes','agreement.':'convenios','institution.':'instituicoes','offer.':'edicoes','ap.':'pedidos','story.':'relatos','link.':'vinculos'};
 if(t==='grant.save'){manager(a);exigir(edAutorizada(b,a,p.edicaoId),'Edição fora da carteira.','acesso');if(b.entities.bolsas[id])acesso(b,a,'bolsas',id);return}
 if(t==='content.save'||t==='content.publish'||t==='content.withdraw'||t==='event.cancel'){manager(a);const kind=p.tipo==='evento'?'eventos':'materiais';if(b.entities[kind][id])acesso(b,a,kind,id);else exigir(comunidade(a,a.role.comunidades[0])&&a.role.conteudos.includes(p.pais),'Conteúdo fora da atribuição.','acesso');return}
 if(t==='budget.save'){student(a);return}
 if(['mentor.profile','tandem.profile','tandem.deactivate','tandem.activate'].includes(t)){student(a);exigir(id===a.account.id,'Perfil de outro estudante.','acesso');return}
 if(t==='link.send'){student(a);return}
 if(t==='story.send'){student(a);if(b.entities.relatos[id])exigir(b.entities.relatos[id].studentId===a.account.id,'Relato de outra pessoa.','acesso');return}
 if(t==='ap.export'){coordinator(a);acesso(b,a,'pedidos',id);validarComandoExportacao(cmd);return}
 if(t==='ap.send'||t==='ap.draft'){student(a);if(b.entities.pedidos[id])acesso(b,a,'pedidos',id);else acesso(b,a,'mobilidades',p.mobilidadeId);return}
 if(t==='institution.save'||t==='agreement.save'||t==='offer.draft'||t==='offer.publish'){
  manager(a);const kind=t.startsWith('institution')?'instituicoes':t.startsWith('agreement')?'convenios':'edicoes';if(b.entities[kind][id])acesso(b,a,kind,id);else if(kind==='edicoes')exigir(edAutorizada(b,a,id),'Edição não atribuída.','acesso');return;
 }
 if(t==='forum.topic'){student(a);return}
 if(t==='forum.reply'){student(a);acesso(b,a,'topicos',id);return}
 if(t==='forum.report'){student(a);acesso(b,a,p.objetoTipo,p.objetoId);return}
 if(t==='forum.measure'){manager(a);acesso(b,a,p.objetoTipo,p.objetoId);return}
 for(const [prefix,kind]of Object.entries(kinds))if(t.startsWith(prefix)){acesso(b,a,kind,id);return}
 throw new Falha('Operação não autorizada.','acesso');
}

