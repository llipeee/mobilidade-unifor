# Validação da cópia para GitHub Pages

Concluída em **04/11/2026**, antes da publicação. O site foi servido localmente em `http://127.0.0.1:8808/mobilidade-unifor/`, com Chrome/Playwright e perfis descartáveis. O servidor de revisão entrega somente arquivos estáticos sob esse prefixo, diferencia maiúsculas/minúsculas mesmo no Windows e não possui fallback de rotas nem API. Os testes integrados usaram o mesmo prefixo nas portas 8796 e 8797.

## Resultado

- Entrada, recursos, navegação por hash, rota profunda e recarregamento funcionaram sob o subdiretório. Todos os **285 arquivos copiados da N3** foram servidos com seus bytes originais. Tipos HTTP de JavaScript, módulos, WASM e PDFs foram conferidos.
- Os **23 cenários** foram restaurados pelo Controle da demonstração, com confirmação explícita e seus instantes fictícios originais. Abrir um cenário salvo conservou o envio confirmado ao sair e voltar.
- Candidatura, pedido de complemento, upload e conferência documental, seleção e bolsa foram exercitados por controles reais e troca de pessoa na mesma base. Seleção, bolsa e saídas independentes mantiveram as regras existentes.
- Aproveitamento: envio, complemento por item, decisão mista e comprovações parciais/suficientes foram exercitados. Parecer e registro acadêmico continuaram separados.
- Exportação de parecer pela Coordenação: revisão/confirmação, geração do PDF real, leitura da estrutura e do texto (pedido/autoria/finalidade), abertura em iframe, download e nova consulta após recarregar. O estudante não recebeu o comando exclusivo da Coordenação.
- Os **22 PDFs demonstrativos** foram carregados e validados pelo PDF.js. O worker executou a partir de `/mobilidade-unifor/vendor/pdf.worker.mjs`. Bibliotecas, fontes padrão, CMaps, WASM, imagens, dados e estilos estão no pacote, sem CDN ou dependência externa na execução observada.
- Patrícia entrou e alternou seus dois contextos atribuídos. Um contexto novo de navegador começou com dados independentes; link profundo sem sessão retornou à entrada.
- Publicação/retificação de oportunidade, CSV, orçamento, relatos, consentimentos, Tandem, fórum e moderação tiveram operações representativas verificadas. Cancelamento, foco/Escape, edição concorrente, conflito, falha e resultado desconhecido foram preservados.
- Inspeção das telas reais de entrada, oportunidades, complemento em desktop/celular e aproveitamento: imagens carregadas, hierarquia e estilos originais preservados. Complemento em 360 px e conferência em 1366/360 px sem rolagem horizontal.
- Nenhum erro JavaScript, recurso ausente ou requisição externa foi registrado nos percursos aprovados.

## Preservação e organização

Não houve alteração em HTML, JavaScript, CSS, imagens, dados iniciais, PDFs, bibliotecas ou licenças da N3. A preparação consistiu na seleção/cópia dos arquivos de execução, inclusão de `.nojekyll` e documentação própria. Os **1634 arquivos** da pasta local `prototipo/n3_final/` permanecem com os hashes anteriores. A1, viabilidade, apresentações e demais versões não foram editados.

Os scripts e registros detalhados de revisão ficam fora do site, nas pastas `fontes/N3_GitHub_Pages_2026-11-04/` e `revisao/N3_GitHub_Pages_2026-11-04/` do projeto local. O pacote não inclui perfis de navegador, capturas, logs extensos, servidor local ou ferramentas de teste. `INVENTARIO.json` permite conferir os arquivos publicados (o inventário não inclui o próprio hash).

## Alcance

Esta foi uma revisão de compatibilidade estática em Chrome, não teste com usuários, validação institucional ou auditoria de segurança. Nenhum repositório foi criado e o GitHub Pages real ainda não foi acionado. Após a revisão do pacote, a conferência do endereço HTTPS publicado está descrita em `PUBLICAR_NO_GITHUB_PAGES.md`.

A aplicação continua sendo simulação local por navegador, mesmo hospedada no Pages. Os dados não são enviados a um backend, não se sincronizam entre dispositivos e não migram automaticamente da origem local para o GitHub. Nomes do banco/chaves permanecem originais; caminhos diferentes no mesmo host não isolam armazenamento. Consulte o README.
