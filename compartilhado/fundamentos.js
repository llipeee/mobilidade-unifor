/* Componentes de apresentação, sem operações de domínio ou navegação funcional. */
window.MobilidadeUI = (() => {
  const paths = {
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18Z"/>',
    home: '<path d="m3 10 9-7 9 7v10H3ZM9 20v-7h6v7"/>',
    folder: '<path d="M3 7h7l2 2h9v11H3Z"/><path d="M3 7V4h7l2 3"/>',
    book: '<path d="M12 5v15M12 5C8 2 3 4 3 4v15s5-2 9 1c4-3 9-1 9-1V4s-5-2-9 1Z"/>',
    people: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 4a3 3 0 0 1 0 6M18 13c3 0 4 2 4 5v3"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M7 3v4M17 3v4"/>',
    cap: '<path d="m2 9 10-5 10 5-10 5ZM6 11v6c4 3 8 3 12 0v-6M22 9v7"/>',
    chevron: '<path d="m7 10 5 5 5-5"/>',
    right: '<path d="m9 5 7 7-7 7"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/>',
    file: '<path d="M5 3h9l5 5v13H5Z"/><path d="M14 3v6h5M8 13h8M8 17h6"/>',
    shield: '<path d="m12 3 8 3v5c0 5-8 10-8 10S4 16 4 11V6Z"/><path d="m8 11 3 3 5-6"/>',
    save: '<path d="M4 3h13l4 4v14H4ZM8 3v6h9V3M8 21v-8h9v8"/>',
    link: '<path d="M14 3h7v7M21 3l-9 9M10 5H4v15h15v-6"/>',
    edit: '<path d="m14 5 5 5M4 20l5-1L21 7l-5-5L4 14Z"/>',
    sort: '<path d="M7 4v16l-4-4M17 20V4l4 4M3 8h7M14 16h7"/>'
  };
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=(name,extra='')=>`<svg class="icon ${extra}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.info}</svg>`;
  const button=(text,variant='primary',name='',extra='')=>`<button type="button" class="button ${variant} ${extra}" aria-disabled="true">${name?icon(name):''}${esc(text)}</button>`;
  const status=s=>s?`<span class="status ${esc(s.tom)}">${s.icone?icon(s.icone):''}${esc(s.rotulo)}</span>`:'';
  const field=({id,label,value,required=false,symbol='',select=false,resultado=null,hint=''})=>`<label class="field ${resultado?'academic-field':''}" for="${id}"><span class="field-label"><span class="label-name">${esc(label)}${required?' <span class="required" aria-label="obrigatório">*</span>':''}</span>${status(resultado)}</span><span class="field-control ${select?'is-select':''}">${symbol?icon(symbol):''}<input id="${id}" name="${id}" value="${esc(value)}" readonly ${required?'required aria-required="true"':''}>${select?icon('chevron','chevron'):''}</span>${hint?`<span class="field-hint">${esc(hint)}</span>`:''}</label>`;
  const notice=(html,extra='')=>`<div class="notice ${extra}">${icon('info')}<div>${html}</div></div>`;
  const header=()=>window.C1UI.header();
  const breadcrumbs=labels=>`<div class="breadcrumbs" aria-label="Localização">${labels.map((s,i)=>`${i?icon('right'):''}<span>${esc(s)}</span>`).join('')}</div>`;
  const footer=()=>window.C1UI.footer();
  const docRow=(d,{acoes=true}={})=>`<div class="document-row"><span class="pdf-icon">${icon('file')}</span><div class="document-info"><div class="document-title">${esc(d.titulo)}${d.obrigatorio?' <span class="required" aria-label="obrigatório">*</span>':''}</div><div class="document-file">${d.arquivo?esc(d.arquivo)+' · '+esc(d.tamanho):'Nenhum arquivo anexado'}</div></div><div class="document-aux">${status(d.situacao)}${acoes?`<button class="text-action" type="button" aria-disabled="true" aria-label="Substituir ${esc(d.titulo)}">${icon('edit')}${d.arquivo?'Substituir':'Anexar'}</button>`:''}</div></div>`;
  const resumoDocumentos=docs=>`${docs.filter(d=>d.situacao.codigo==='anexado').length} de ${docs.length} ${docs.length===1?'documento anexado':'documentos anexados'}`;
  const resources=({vagas,bolsa})=>`<div class="resource-grid"><div class="resource"><div class="resource-label">Vagas da edição</div><div class="resource-value">${vagas.disponiveis} ${vagas.disponiveis===1?'disponível':'disponíveis'} de ${vagas.total}</div><span class="card-resource-note">${vagas.ocupadas} ${vagas.ocupadas===1?'ocupada':'ocupadas'}</span></div><div class="resource"><div class="resource-label">Concessões de bolsa</div><div class="resource-value">${bolsa?`${bolsa.disponiveis} ${bolsa.disponiveis===1?'disponível':'disponíveis'}`:'Não ofertada'}</div>${bolsa?`<span class="card-resource-note">Limite ${bolsa.limite} · ${bolsa.concessoesAtivas} ${bolsa.concessoesAtivas===1?'ativa':'ativas'}</span>`:''}</div></div>`;
  const summary=({oportunidade:o,editalVersao})=>`<section class="surface summary-compact" aria-label="Resumo da oportunidade"><div class="summary-top"><img class="summary-thumb" src="${o.foto}" alt="${esc(o.fotoAlt)}"><div><p class="summary-kicker">${esc(o.id)}</p><h2>${esc(o.instituicao)}</h2><p class="destination">${esc(o.cidade)}, ${esc(o.pais)}</p></div></div><p class="compact-version">${icon('file')}Edital v${esc(editalVersao)}</p><p class="compact-deadline">Prazo: <strong>${o.inscricoes.fim}, às ${o.inscricoes.horaFim}</strong><span class="compact-zone">Horário de Brasília · ${esc(o.inscricoes.fuso)}</span></p>${N1UI.link('Consultar condições e edital',N1UI.to('oportunidades',o.id),'quiet','book')}</section>`;
  const personalDefinitions=s=>`<dl class="definition-grid">${[['Nome completo',s.nome],['Matrícula',s.matricula],['E-mail',s.email],['Curso',s.curso]].map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`;
  return {esc,icon,button,status,field,notice,header,breadcrumbs,footer,docRow,resumoDocumentos,resources,summary,personalDefinitions};
})();
