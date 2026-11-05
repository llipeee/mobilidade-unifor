# Mobilidade Unifor — demonstração para GitHub Pages

Proposta de plataforma web para acompanhar o intercâmbio acadêmico, da candidatura ao pedido de reconhecimento das disciplinas na universidade de origem. Cópia de distribuição da N3 preparada em **04/11/2026**. A versão local permanece em `prototipo/n3_final/`, fora deste pacote.

Aplicação estática em HTML/CSS/JavaScript, com dados e contas fictícios. Sem backend, autenticação institucional, integração acadêmica, pagamentos ou envios reais. As senhas abaixo são públicas e exclusivamente demonstrativas. Use apenas documentos fictícios nesta demonstração.

## Abrir e iniciar

Após a publicação, acesse `https://SEU_USUARIO.github.io/mobilidade-unifor/`. Não há instalação, compilação ou serviço de servidor para configurar no Pages. É necessário JavaScript e um navegador atual com IndexedDB, Web Crypto, módulos JavaScript e workers. Use HTTPS no site publicado; `http://127.0.0.1` também funciona na conferência local.

Na primeira visita, a aplicação prepara **Candidatura preparada · antes do envio** (`candidatura-revisao`), carrega os PDFs referenciados e valida sua estrutura. Aguarde a entrada aparecer. Entre como Ana com `20260001` / `AnaDemo!27`.

O [passo a passo de publicação pela branch main](PUBLICAR_NO_GITHUB_PAGES.md) inclui a conferência local em `/mobilidade-unifor/`. A publicação ainda não foi realizada.

## Contas demonstrativas

| Pessoa | Identificação | Senha fictícia | Contexto atribuído |
|---|---|---|---|
| Ana Souza | 20260001 | AnaDemo!27 | Estudante · Ciência da Computação |
| Marcos Lima | GI-004 | MarcosDemo!27 | Gestão · carteira do cenário e comunidade |
| Rafael Costa | CC-017 | RafaelDemo!27 | Coordenação · Ciência da Computação |
| Patrícia Nunes | PN-2027-003 | PatriciaDemo!27 | Estudante / Coordenação de CC, um contexto por vez |
| Miguel Alves | 20270082 | MiguelDemo!27 | Estudante · contraparte da mentoria |
| Emma Dubois | INT-2027-027 | EmmaDemo!27 | Estudante · contraparte Tandem |
| Lara Mendes | 20270061 | LaraDemo!27 | Estudante |
| Caio Martins | 20270055 | CaioDemo!27 | Estudante |
| Bruno Rocha | 20270031 | BrunoDemo!27 | Estudante |
| Luiza Pereira | 20260047 | LuizaDemo!27 | Estudante |

As permissões vêm do cadastro da conta e do objeto, não da URL. Condições de mentor, interessado e estrangeiro não criam novos papéis.

Para trocar de pessoa, use **Sair** e entre com outra conta, mantendo o mesmo cenário. Patrícia possui dois contextos previamente atribuídos: selecione **Estudante** ou **Coordenação** na entrada; a área **Conta e contexto** permite alterná-los. Isso não cria permissões novas.

## Cenários e inicialização

No rodapé, abra **Controle da demonstração**, selecione o cenário e escolha:

- **Abrir cenário salvo**: abre os avanços existentes; se ainda não existe, inicializa os dados fictícios daquele cenário. Retorna à entrada.
- **Restaurar dados iniciais**: apresenta confirmação e substitui os avanços **somente do cenário escolhido** por sua fotografia inicial. Use para repetir uma demonstração desde o começo.
- **Revisar avanço do relógio**: depois de entrar, permite avançar explicitamente o relógio fictício. Prazos de negócio usam esse relógio, não a data atual do computador. Para voltar ao instante inicial é preciso restaurar o cenário.

Os cenários são pontos de partida independentes. Complemento recebido no prazo, complemento vencido e desistência não são etapas sucessivas da mesma candidatura. O [roteiro de demonstração](ROTEIRO_DEMONSTRACAO.md) mostra operações completas, atores e documentos.

| Identificador | Ponto inicial | Relógio fictício inicial |
|---|---|---|
| `agenda-publicada` | Preparação · agenda após publicação | `2027-09-02T09:00:00-03:00` |
| `analise-selecao` | Complemento válido · seleção ainda não confirmada | `2026-12-15T09:30:00-03:00` |
| `ap-analise` | Aproveitamento · análise por item | `2027-08-11T09:30:00-03:00` |
| `ap-concluido` | Aproveitamento · comprovações concluídas | `2027-08-18T09:30:00-03:00` |
| `ap-novo` | Aproveitamento · revisão antes do envio | `2027-08-10T14:10:00-03:00` |
| `ap-parcial` | Aproveitamento · registro parcialmente confirmado | `2027-08-18T09:20:00-03:00` |
| `ap-pareceres` | Aproveitamento · pareceres definitivos | `2027-08-12T10:20:00-03:00` |
| `bolsa-confirmada` | Seleção e concessão registradas | `2026-12-15T09:37:00-03:00` |
| `candidatura-enviada` | Candidatura enviada · recibo | `2026-12-08T14:15:22-03:00` |
| `candidatura-revisao` | Candidatura preparada · antes do envio | `2026-12-08T14:14:00-03:00` |
| `complemento-pendente` | Complemento solicitado · prazo vigente | `2026-12-12T09:10:00-03:00` |
| `complemento-vencido` | Complemento vencido · ramo independente | `2026-12-16T09:05:00-03:00` |
| `comunidade-pendente` | Comunidade · vínculos pendentes e denúncia recebida | `2027-10-03T10:00:00-03:00` |
| `conteudos-rascunho` | Preparação · evento ainda em rascunho | `2027-09-01T14:00:00-03:00` |
| `convenio-proposto` | Nova chamada · cadastro do convênio pendente | `2027-10-15T10:00:00-03:00` |
| `desistencia-confirmada` | Desistência confirmada · ramo independente | `2026-12-12T09:11:00-03:00` |
| `indicadores-retificados` | Nova chamada · v2 vigente e indicadores | `2027-11-20T10:00:00-03:00` |
| `oportunidade-preparada` | Nova chamada · preparação da oportunidade | `2027-10-16T14:00:00-03:00` |
| `oportunidade-publicada` | Nova chamada · v1 publicada, inscrições futuras | `2027-10-20T10:05:00-03:00` |
| `orientacao-alternativa` | Orientação acadêmica incompleta · alternativa | `2026-12-08T14:14:00-03:00` |
| `relato-pendente` | Relato próprio · aguardando moderação | `2027-09-03T11:00:00-03:00` |
| `retificacao-proposta` | Nova chamada · retificação ainda proposta | `2027-11-15T11:00:00-03:00` |
| `selecao-confirmada` | Seleção registrada · bolsa ainda não confirmada | `2026-12-15T09:35:00-03:00` |

## PDFs e exportações

Os **22 PDFs demonstrativos** estão em `output/pdf/` e nos links do Controle da demonstração → **PDFs demonstrativos para exercitar uploads**. Baixe um exemplo e selecione-o no campo de upload. Os arquivos da base inicial são carregados automaticamente quando o cenário é inicializado.

Somente PDF com estrutura válida, até **10.000.000 bytes** por upload. Essa conferência não comprova autenticidade. PDF.js, worker, fontes, CMaps e módulos WASM estão em `vendor/`; o PDF-lib local gera pareceres. Não há CDN nem API de PDF externa.

Para exportar um parecer: abra `ap-parcial` ou outro cenário de aproveitamento, entre como **Rafael Costa**, abra o pedido e use **Exportar parecer PDF**. Revise a confirmação **Exportar parecer demonstrativo?** e confirme. O arquivo aparece no pedido para consulta e download. É gerado da fotografia autorizada, com itens, autoria e pendências; **não comprova lançamento no registro acadêmico**. O estudante consulta apenas seus documentos autorizados. Indicadores permitem CSV para a Gestão, conforme as regras existentes.

## Persistência por navegador

- **IndexedDB** guarda, por cenário, registros, históricos, recibos, avisos e PDFs. `localStorage` lembra o último cenário. `sessionStorage` identifica a sessão da aba; os registros de sessão ficam no banco local. As senhas não são gravadas com os registros de negócio.
- Recarregar, mudar de rota com hash e trocar de conta conservam operações confirmadas. Duas abas da mesma origem compartilham a base; decisões são revalidadas antes de gravar. A sessão expira após **30 minutos reais sem atividade humana**. Consultas automáticas não renovam a sessão.
- Os dados pertencem ao **perfil do navegador e à origem** (`protocolo + host + porta`). Outro navegador, dispositivo, perfil ou origem começa com dados próprios. A versão em `http://127.0.0.1:8783` e a versão HTTPS no Pages não compartilham avanços e não migram automaticamente dados entre si.
- **O caminho não separa armazenamento.** Outros repositórios de `https://SEU_USUARIO.github.io` têm a mesma origem. Outra cópia desta N3 com os mesmos nomes de banco/chaves nesse host compartilhará os dados. Use outra origem/perfil para demonstrações independentes. Os nomes originais foram preservados.
- Limpar dados do site, restaurar um cenário ou encerrar uma sessão privada pode remover avanços. Não há sincronização, backup no GitHub ou recuperação institucional. Publicar arquivos novos não envia os dados do navegador ao repositório.

## Estrutura e caminhos

`index.html` fica na raiz publicada; `app/`, `dominio/`, `dados/`, `compartilhado/` e `modulos/` contêm fontes editáveis. `assets/` contém imagens originais; `vendor/` inclui bibliotecas e licenças; `output/pdf/` contém exemplos fictícios. `.nojekyll` desabilita o processamento do Jekyll.

Os recursos usam caminhos relativos. Rotas como `/mobilidade-unifor/#/estudante/oportunidades` mantêm o caminho da aplicação; o hash não vai ao servidor. Preserve a barra após o nome do repositório. Não crie pastas físicas para as rotas, não adicione `<base href="/">` nem caminhos iniciados por `/assets` ou `/vendor`. Não é necessário `404.html`, fallback de servidor ou regras de reescrita.

O [registro de validação](VALIDACAO.md), [inventário](INVENTARIO.json) e [licenças e origem dos recursos](LICENCAS.md) acompanham esta cópia. Galeria, relatórios históricos, servidores, perfis de navegador e ferramentas de engenharia da versão local ficam fora do site.
