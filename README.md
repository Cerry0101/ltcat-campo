# LTCAT Campo

Aplicativo estático para coleta das nove fichas do formulário de campo LTCAT, com interface para computador, tablet e celular.

## Publicação no GitHub Pages

Envie os arquivos desta pasta para a raiz de um repositório. Em Settings → Pages, escolha Deploy from a branch, a branch principal e a pasta /(root), depois Save.

Não há etapa de build. Os arquivos index.html, style.css, app.js, exports.js e a pasta vendor devem permanecer juntos. O arquivo .nojekyll desativa o processamento Jekyll.

## Dados e acesso

Os registros, fotos e assinaturas são armazenados no navegador do dispositivo. Use Exportar backup e Importar backup para transferi-los. Ao mudar o endereço do app, os dados do endereço anterior não aparecem automaticamente: exporte o backup no endereço anterior e importe no novo.

A publicação padrão do GitHub Pages é pública. Esta versão não possui login próprio. O repositório contém apenas o aplicativo e nenhum registro de avaliação ou backup de usuário.

Os relatórios são fichas de coleta. As conclusões técnicas do LTCAT devem ser elaboradas pelo responsável. Baixar PDF gera o relatório diagramado diretamente. Baixar Excel (.xlsx) exporta a avaliação atual em tabelas com filtros, cabeçalhos fixos, amostras numéricas, fórmulas de tempo/vazão/volume e imagens. Excel de todas as avaliações exporta todos os registros do navegador num único arquivo. As bibliotecas e a fonte estão incluídas na pasta vendor, com suas licenças; dados de avaliação não são enviados para serviços de geração de arquivos.
