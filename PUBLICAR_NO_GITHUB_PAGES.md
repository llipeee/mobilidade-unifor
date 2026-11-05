# Publicar pela branch main — após revisão

Preparação em 04/11/2026. Nenhum repositório foi criado e nenhum arquivo foi publicado nesta rodada.

## 1. Conferir em um subdiretório

Com Python 3 instalado, abra o terminal **na pasta que contém `mobilidade-unifor/`**, não dentro dela:

```powershell
python -m http.server 8808 --bind 127.0.0.1
```

Abra `http://127.0.0.1:8808/mobilidade-unifor/`. O processo serve somente arquivos estáticos, como o Pages. Encerre com Ctrl+C. Não abra `index.html` por `file://`.

Entre como Ana, consulte oportunidades, abra um cenário no controle da demonstração, troque para Gestão/Coordenação com Sair, faça uma operação confirmada, recarregue e consulte um PDF. Para repetir, restaure somente o cenário escolhido. O README explica contas e persistência. Este teste cria dados na origem/perfil local; não transfere avanços ao site futuro.

## 2. Criar o repositório

Na sua conta GitHub, crie um repositório **público** chamado **mobilidade-unifor**, com branch padrão **main**. Repositórios públicos podem usar Pages no plano GitHub Free. Não use o nome especial `SEU_USUARIO.github.io`: o destino planejado é um site de projeto em `/mobilidade-unifor/`.

## 3. Enviar somente o conteúdo desta pasta

Copie **o conteúdo de `mobilidade-unifor/` para a raiz do repositório**, incluindo o arquivo oculto `.nojekyll`. O `index.html` deve ficar ao lado de `README.md`, e não dentro de uma segunda pasta `mobilidade-unifor`. Não envie o projeto acadêmico inteiro, a N3 local, revisões, capturas ou dados do perfil do navegador.

Pelo GitHub Desktop: clone o repositório vazio em uma pasta separada, copie o conteúdo, confira a lista, faça commit na `main` e use **Push origin**. Pelo navegador, **Add file → Upload files** permite enviar pastas e arquivos; confirme que `.nojekyll` apareceu (crie um arquivo vazio com esse nome se necessário). Não envie apenas o ZIP: o Pages precisa dos arquivos extraídos.

## 4. Habilitar Pages

Abra **Settings → Pages → Build and deployment**. Em **Source**, escolha **Deploy from a branch**. Em **Branch**, selecione **main** e **/(root)**. Clique **Save**.

Não há build, npm, servidor Node ou backend para configurar. `.nojekyll` mantém os arquivos estáticos sem processamento pelo Jekyll. A execução automática do Pages poderá aparecer em **Actions**, mesmo publicando pela branch.

## 5. Conferir a publicação

Aguarde o Pages terminar e abra **Settings → Pages → Visit site**:

```text
https://SEU_USUARIO.github.io/mobilidade-unifor/
```

Confira entrada, rota com hash e recarregamento, imagens, troca de pessoa no mesmo cenário, upload de PDF fictício e exportação/consulta/download de parecer com Rafael. A primeira visita nesse host cria dados novos. Se houver 404 ou faltarem estilos, confira se `index.html`, `.nojekyll`, `vendor/` e `dados/` estão na raiz da `main`, se Pages aponta para `/(root)` e se a URL inclui a barra final. Para investigar cache, tente primeiro recarregamento forçado, sem limpar dados do site.

## 6. Atualizar depois

Revise a nova cópia, substitua os arquivos correspondentes na `main`, faça commit e push e aguarde o Pages. Preserve diretórios, licenças e `.nojekyll`. Atualizações não transferem dados entre navegadores; conservar avanços depende de manter origem/perfil e não restaurar/limpar o cenário.

## Referências oficiais consultadas

- [Configurar fonte de publicação — GitHub Docs](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site): GitHub Free para repositórios públicos, branch e pasta.
- [Criar um site — GitHub Docs](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site): arquivos estáticos, `.nojekyll` e site de projeto.
- [Resolver erros 404 — GitHub Docs](https://docs.github.com/en/pages/getting-started-with-github-pages/troubleshooting-404-errors-for-github-pages-sites): localização do arquivo de entrada.
